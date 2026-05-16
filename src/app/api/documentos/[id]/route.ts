import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!['AUXILIAR_GH', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'No tiene permisos para aprobar o rechazar documentos' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { aprobado } = body

    if (aprobado === undefined || aprobado === null) {
      return NextResponse.json({ error: 'Campo requerido: aprobado (true o false)' }, { status: 400 })
    }

    const documento = await db.documento.findUnique({
      where: { id },
      include: { incapacidad: { select: { id: true } } },
    })

    if (!documento) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    const updated = await db.documento.update({
      where: { id },
      data: { aprobado: Boolean(aprobado) },
    })

    return NextResponse.json({ documento: updated })
  } catch (error) {
    console.error('Error updating documento:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}