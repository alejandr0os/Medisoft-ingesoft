import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id } = await params

    const incapacidad = await db.incapacidad.findUnique({
      where: { id },
      select: { id: true, empleadoId: true },
    })
    if (!incapacidad) {
      return NextResponse.json({ error: 'Incapacidad no encontrada' }, { status: 404 })
    }

    if (session.role === 'EMPLEADO') {
      const employee = await db.employee.findUnique({ where: { userId: session.userId } })
      if (!employee || employee.id !== incapacidad.empleadoId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    }

    const seguimientos = await db.seguimiento.findMany({
      where: { incapacidadId: id },
      include: { usuario: { select: { id: true, name: true, role: true } } },
      orderBy: { fechaGestion: 'desc' },
    })

    return NextResponse.json({ seguimientos })
  } catch (error) {
    console.error('Error listing seguimientos:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!['AUXILIAR_GH', 'GERENCIA', 'CONTABILIDAD', 'ABOGADO', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'No tiene permisos para agregar seguimientos' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { accion, observaciones, tipoAlerta } = body

    if (!accion) {
      return NextResponse.json({ error: 'accion es requerida' }, { status: 400 })
    }

    const incapacidad = await db.incapacidad.findUnique({ where: { id } })
    if (!incapacidad) {
      return NextResponse.json({ error: 'Incapacidad no encontrada' }, { status: 404 })
    }

    const seguimiento = await db.seguimiento.create({
      data: {
        incapacidadId: id,
        usuarioId: session.userId,
        accion,
        observaciones: observaciones || null,
        tipoAlerta: tipoAlerta || null,
      },
    })

    return NextResponse.json({ seguimiento }, { status: 201 })
  } catch (error) {
    console.error('Error creating seguimiento:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
