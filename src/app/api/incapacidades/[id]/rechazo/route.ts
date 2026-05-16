import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!['AUXILIAR_GH', 'CONTABILIDAD', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'No tiene permisos para registrar rechazos' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { causal, descripcion, esSubsanable, documentoEPS, observaciones } = body

    if (!causal || !descripcion || esSubsanable === undefined) {
      return NextResponse.json(
        { error: 'Campos requeridos: causal, descripcion, esSubsanable' },
        { status: 400 }
      )
    }

    const validCausales = ['DOCUMENTAL', 'DE_FORMA', 'DE_FONDO']
    if (!validCausales.includes(causal)) {
      return NextResponse.json({ error: 'Causal inválida. Use DOCUMENTAL, DE_FORMA o DE_FONDO' }, { status: 400 })
    }

    const incapacidad = await db.incapacidad.findUnique({
      where: { id },
      include: { empleado: true, eps: true },
    })
    if (!incapacidad) {
      return NextResponse.json({ error: 'Incapacidad no encontrada' }, { status: 404 })
    }

    const estadoAnterior = incapacidad.estado

    // Create RechazoEPS
    const rechazo = await db.rechazoEPS.create({
      data: {
        incapacidadId: id,
        causal,
        descripcion,
        esSubsanable,
        documentoEPS: documentoEPS || null,
        observaciones: observaciones || null,
      },
    })

    // Change incapacidad estado
    const updated = await db.incapacidad.update({
      where: { id },
      data: { estado: 'RECHAZADA_ENTIDAD' },
    })

    // Create HistorialEstado
    await db.historialEstado.create({
      data: {
        incapacidadId: id,
        estadoAnterior,
        estadoNuevo: 'RECHAZADA_ENTIDAD',
        accion: 'RECHAZO_EPS',
        usuarioId: session.userId,
        observaciones: `Rechazo EPS - Causal: ${causal}. ${descripcion}`,
      },
    })

    // Create seguimiento
    await db.seguimiento.create({
      data: {
        incapacidadId: id,
        usuarioId: session.userId,
        accion: 'RECHAZO_EPS_REGISTRADO',
        observaciones: `EPS ${incapacidad.eps.nombre} rechazó. Causal: ${causal}. Subsanable: ${esSubsanable ? 'Sí' : 'No'}`,
      },
    })

    // Notify relevant users
    const notifyRoles = esSubsanable
      ? ['AUXILIAR_GH', 'ABOGADO']
      : ['AUXILIAR_GH', 'ABOGADO', 'GERENCIA']

    const usersToNotify = await db.user.findMany({
      where: { role: { in: notifyRoles }, active: true },
    })
    for (const user of usersToNotify) {
      await db.notification.create({
        data: {
          userId: user.id,
          tipo: 'ALERTA',
          titulo: 'Incapacidad rechazada por EPS',
          mensaje: `La incapacidad ${incapacidad.radicado} fue rechazada por ${incapacidad.eps.nombre}. Causal: ${causal}`,
          enlace: `/incapacidades/${id}`,
        },
      })
    }

    // If subsanable, also notify the employee
    if (esSubsanable) {
      await db.notification.create({
        data: {
          userId: incapacidad.empleado.userId,
          tipo: 'ALERTA',
          titulo: 'Rechazo subsanable',
          mensaje: `Su incapacidad ${incapacidad.radicado} fue rechazada por ${incapacidad.eps.nombre} pero puede ser subsanada`,
          enlace: `/incapacidades/${id}`,
        },
      })
    }

    return NextResponse.json({ rechazo, incapacidad: updated }, { status: 201 })
  } catch (error) {
    console.error('Error registering rechazo:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
