import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!['AUXILIAR_GH', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'No tiene permisos para archivar incapacidades' }, { status: 403 })
    }

    const body = await request.json()
    const { incapacidadId, documentacionCompleta, observaciones } = body

    if (!incapacidadId || documentacionCompleta === undefined) {
      return NextResponse.json(
        { error: 'Campos requeridos: incapacidadId, documentacionCompleta' },
        { status: 400 }
      )
    }

    const incapacidad = await db.incapacidad.findUnique({
      where: { id: incapacidadId },
      include: { archivo: true },
    })
    if (!incapacidad) {
      return NextResponse.json({ error: 'Incapacidad no encontrada' }, { status: 404 })
    }

    if (incapacidad.archivo) {
      return NextResponse.json(
        { error: 'Esta incapacidad ya está archivada' },
        { status: 400 }
      )
    }

    // Only archive incapacidades in terminal states
    const estadosArchivables = ['PAGADA', 'GLOSA', 'RECHAZADA_ENTIDAD', 'SUBSANACION_VENCIDA', 'TRAMITE_PENSION']
    if (!estadosArchivables.includes(incapacidad.estado)) {
      return NextResponse.json(
        { error: `No se puede archivar una incapacidad en estado ${incapacidad.estado}. Estados archivables: ${estadosArchivables.join(', ')}` },
        { status: 400 }
      )
    }

    const estadoAnterior = incapacidad.estado

    // Create Archivo
    const archivo = await db.archivo.create({
      data: {
        incapacidadId,
        documentacionCompleta,
        observaciones: observaciones || null,
      },
    })

    // Change estado to ARCHIVADA
    await db.incapacidad.update({
      where: { id: incapacidadId },
      data: {
        estado: 'ARCHIVADA',
        fechaArchivo: new Date(),
      },
    })

    // Create HistorialEstado
    await db.historialEstado.create({
      data: {
        incapacidadId,
        estadoAnterior,
        estadoNuevo: 'ARCHIVADA',
        accion: 'ARCHIVADO',
        usuarioId: session.userId,
        observaciones: observaciones || `Archivada. Documentación completa: ${documentacionCompleta ? 'Sí' : 'No'}`,
      },
    })

    // Add seguimiento
    await db.seguimiento.create({
      data: {
        incapacidadId,
        usuarioId: session.userId,
        accion: 'ARCHIVADO',
        observaciones: `Incapacidad archivada. Documentación completa: ${documentacionCompleta ? 'Sí' : 'No'}`,
      },
    })

    return NextResponse.json({ archivo, message: 'Incapacidad archivada exitosamente' }, { status: 201 })
  } catch (error) {
    console.error('Error archiving incapacidad:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
