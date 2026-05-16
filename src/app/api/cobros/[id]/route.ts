import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { canManageCobros } from '@/lib/incapacidades-utils'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!['AUXILIAR_GH', 'GERENCIA', 'CONTABILIDAD', 'ABOGADO', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params

    const lote = await db.loteCobro.findUnique({
      where: { id },
      include: {
        eps: { select: { id: true, nombre: true, nit: true, contacto: true, email: true } },
        detalles: {
          include: {
            incapacidad: {
              include: {
                empleado: { select: { id: true, name: true, document: true, area: true, cargo: true, salary: true } },
              },
            },
          },
        },
      },
    })

    if (!lote) {
      return NextResponse.json({ error: 'Lote de cobro no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ lote })
  } catch (error) {
    console.error('Error getting lote cobro:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!canManageCobros(session.role)) {
      return NextResponse.json({ error: 'No tiene permisos para actualizar lotes de cobro' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { estado, observaciones, fechaEnvio } = body

    const lote = await db.loteCobro.findUnique({
      where: { id },
      include: { detalles: true },
    })
    if (!lote) {
      return NextResponse.json({ error: 'Lote de cobro no encontrado' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (estado) updateData.estado = estado
    if (observaciones) updateData.observaciones = observaciones
    if (fechaEnvio || estado === 'ENVIADO') updateData.fechaEnvio = new Date()

    // Auto-calculate estado based on details if not explicitly set
    if (!estado && lote.detalles.length > 0) {
      const allPaid = lote.detalles.every(d => d.estado === 'PAGADO')
      const somePaid = lote.detalles.some(d => d.estado === 'PAGADO' || d.estado === 'GLOSA')
      if (allPaid) updateData.estado = 'PAGADO_TOTAL'
      else if (somePaid) updateData.estado = 'PAGADO_PARCIAL'
    }

    const updated = await db.loteCobro.update({
      where: { id },
      data: updateData,
      include: {
        eps: { select: { id: true, nombre: true } },
        detalles: true,
      },
    })

    return NextResponse.json({ lote: updated })
  } catch (error) {
    console.error('Error updating lote cobro:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
