// Gestin de cobros persuasivos y requerimientos

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!['AUXILIAR_GH', 'GERENCIA', 'CONTABILIDAD', 'ABOGADO', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado')

    const where: Record<string, unknown> = {
      estado: 'COBRO_PERSUASIVO',
    }
    if (estado) where.estado = estado

    const incapacidades = await db.incapacidad.findMany({
      where,
      include: {
        empleado: { select: { id: true, name: true, document: true, area: true, salary: true } },
        eps: { select: { id: true, nombre: true, nit: true } },
        seguimientos: {
          where: { accion: { in: ['PRIMER_REQUERIMIENTO', 'SEGUNDO_REQUERIMIENTO', 'DERIVAR_JURIDICO'] } },
          orderBy: { fechaGestion: 'desc' },
        },
        cobros: {
          include: { loteCobro: { select: { numeroLote: true } } },
        },
      },
      orderBy: { fechaRegistro: 'asc' },
    })

    return NextResponse.json({ incapacidades })
  } catch (error) {
    console.error('Error listing cobro persuasivo:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!['AUXILIAR_GH', 'CONTABILIDAD', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'No tiene permisos para gestionar cobro persuasivo' }, { status: 403 })
    }

    const body = await request.json()
    const { incapacidadId, accion, observaciones } = body

    if (!incapacidadId || !accion) {
      return NextResponse.json(
        { error: 'Campos requeridos: incapacidadId, accion' },
        { status: 400 }
      )
    }

    const validAcciones = ['primer_requerimiento', 'segundo_requerimiento', 'derivar_juridico']
    if (!validAcciones.includes(accion)) {
      return NextResponse.json(
        { error: 'Acción inválida. Use: primer_requerimiento, segundo_requerimiento, derivar_juridico' },
        { status: 400 }
      )
    }

    const incapacidad = await db.incapacidad.findUnique({
      where: { id: incapacidadId },
      include: { empleado: true, eps: true },
    })
    if (!incapacidad) {
      return NextResponse.json({ error: 'Incapacidad no encontrada' }, { status: 404 })
    }

    const estadoAnterior = incapacidad.estado

    if (accion === 'primer_requerimiento') {
      // Ensure it's in COBRO_PERSUASIVO state
      if (!['GLOSA', 'EN_COBRO', 'COBRO_PERSUASIVO'].includes(incapacidad.estado)) {
        return NextResponse.json(
          { error: 'La incapacidad no está en un estado que permita cobro persuasivo' },
          { status: 400 }
        )
      }

      // Change to COBRO_PERSUASIVO if not already
      if (incapacidad.estado !== 'COBRO_PERSUASIVO') {
        await db.incapacidad.update({
          where: { id: incapacidadId },
          data: { estado: 'COBRO_PERSUASIVO' },
        })

        await db.historialEstado.create({
          data: {
            incapacidadId,
            estadoAnterior,
            estadoNuevo: 'COBRO_PERSUASIVO',
            accion: 'INICIO_COBRO_PERSUASIVO',
            usuarioId: session.userId,
            observaciones: observaciones || 'Inicio de cobro persuasivo',
          },
        })
      }

      // Add seguimiento
      await db.seguimiento.create({
        data: {
          incapacidadId,
          usuarioId: session.userId,
          accion: 'PRIMER_REQUERIMIENTO',
          observaciones: observaciones || 'Primer requerimiento enviado a EPS',
        },
      })

      return NextResponse.json({ message: 'Primer requerimiento registrado' })
    }

    if (accion === 'segundo_requerimiento') {
      if (incapacidad.estado !== 'COBRO_PERSUASIVO') {
        return NextResponse.json(
          { error: 'La incapacidad debe estar en estado COBRO_PERSUASIVO para segundo requerimiento' },
          { status: 400 }
        )
      }

      // Add seguimiento with warning
      await db.seguimiento.create({
        data: {
          incapacidadId,
          usuarioId: session.userId,
          accion: 'SEGUNDO_REQUERIMIENTO',
          tipoAlerta: 'AMARILLO',
          observaciones: observaciones || 'Segundo requerimiento enviado - última instancia antes de cobro jurídico',
        },
      })

      return NextResponse.json({ message: 'Segundo requerimiento registrado' })
    }

    // accion === 'derivar_juridico'
    if (incapacidad.estado !== 'COBRO_PERSUASIVO') {
      return NextResponse.json(
        { error: 'La incapacidad debe estar en estado COBRO_PERSUASIVO para derivar a jurídico' },
        { status: 400 }
      )
    }

    // Change estado to COBRO_JURIDICO
    await db.incapacidad.update({
      where: { id: incapacidadId },
      data: { estado: 'COBRO_JURIDICO' },
    })

    // Create CobroJuridico
    const cobroJuridico = await db.cobroJuridico.create({
      data: {
        incapacidadId,
        estado: 'ASIGNADO',
        observaciones: observaciones || 'Derivado de cobro persuasivo',
      },
    })

    // HistorialEstado
    await db.historialEstado.create({
      data: {
        incapacidadId,
        estadoAnterior,
        estadoNuevo: 'COBRO_JURIDICO',
        accion: 'DERIVACION_JURIDICO',
        usuarioId: session.userId,
        observaciones: observaciones || 'Derivado a cobro jurídico',
      },
    })

    // Seguimiento
    await db.seguimiento.create({
      data: {
        incapacidadId,
        usuarioId: session.userId,
        accion: 'DERIVAR_JURIDICO',
        tipoAlerta: 'ROJO',
        observaciones: 'Derivado a cobro jurídico por incumplimiento de EPS',
      },
    })

    // Notify ABOGADO users
    const abogados = await db.user.findMany({
      where: { role: 'ABOGADO', active: true },
    })
    for (const abogado of abogados) {
      await db.notification.create({
        data: {
          userId: abogado.id,
          tipo: 'ALERTA',
          titulo: 'Nuevo cobro jurídico',
          mensaje: `Incapacidad ${incapacidad.radicado} derivada a cobro jurídico. EPS: ${incapacidad.eps.nombre}`,
          enlace: `/incapacidades/${incapacidadId}`,
        },
      })
    }

    return NextResponse.json({ cobroJuridico, message: 'Derivado a cobro jurídico exitosamente' })
  } catch (error) {
    console.error('Error managing cobro persuasivo:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
