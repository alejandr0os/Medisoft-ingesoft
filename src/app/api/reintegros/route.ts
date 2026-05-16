import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!['AUXILIAR_GH', 'GERENCIA', 'CONTABILIDAD', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado')
    const incapacidadId = searchParams.get('incapacidadId')

    const where: Record<string, unknown> = {}
    if (estado) where.estado = estado
    if (incapacidadId) where.incapacidadId = incapacidadId

    const reintegros = await db.reintegro.findMany({
      where,
      include: {
        incapacidad: {
          select: {
            id: true,
            radicado: true,
            estado: true,
            valorCobro: true,
            valorPagado: true,
            empleado: { select: { id: true, name: true, document: true } },
            eps: { select: { id: true, nombre: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ reintegros })
  } catch (error) {
    console.error('Error listing reintegros:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!['CONTABILIDAD', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'No tiene permisos para crear reintegros' }, { status: 403 })
    }

    const body = await request.json()
    const { incapacidadId, montoRecibido, montoReintegro, observaciones } = body

    if (!incapacidadId || montoRecibido === undefined || montoReintegro === undefined) {
      return NextResponse.json(
        { error: 'Campos requeridos: incapacidadId, montoRecibido, montoReintegro' },
        { status: 400 }
      )
    }

    const incapacidad = await db.incapacidad.findUnique({
      where: { id: incapacidadId },
      include: { reintegro: true },
    })
    if (!incapacidad) {
      return NextResponse.json({ error: 'Incapacidad no encontrada' }, { status: 404 })
    }

    if (incapacidad.reintegro) {
      return NextResponse.json(
        { error: 'Ya existe un reintegro para esta incapacidad' },
        { status: 400 }
      )
    }

    const reintegro = await db.reintegro.create({
      data: {
        incapacidadId,
        montoRecibido: Number(montoRecibido),
        montoReintegro: Number(montoReintegro),
        estado: 'PENDIENTE',
        observaciones: observaciones || null,
      },
    })

    // Notify the employee
    const empleado = await db.employee.findUnique({
      where: { id: incapacidad.empleadoId },
    })
    if (empleado) {
      await db.notification.create({
        data: {
          userId: empleado.userId,
          tipo: 'SISTEMA',
          titulo: 'Reintegro registrado',
          mensaje: `Se ha registrado un reintegro de $${Number(montoReintegro).toLocaleString()} para su incapacidad ${incapacidad.radicado}`,
          enlace: `/incapacidades/${incapacidadId}`,
        },
      })
    }

    // Add seguimiento
    await db.seguimiento.create({
      data: {
        incapacidadId,
        usuarioId: session.userId,
        accion: 'REINTEGRO_REGISTRADO',
        observaciones: `Reintegro registrado: Recibido $${Number(montoRecibido).toLocaleString()}, A reintegrar $${Number(montoReintegro).toLocaleString()}`,
      },
    })

    return NextResponse.json({ reintegro }, { status: 201 })
  } catch (error) {
    console.error('Error creating reintegro:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
