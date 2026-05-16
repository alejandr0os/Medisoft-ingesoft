import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { canTranscribe } from '@/lib/incapacidades-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!canTranscribe(session.role)) {
      return NextResponse.json({ error: 'No tiene permisos para transcribir incapacidades' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { numeroRadicado, soporteRadicacion } = body

    if (!numeroRadicado) {
      return NextResponse.json({ error: 'numeroRadicado es requerido' }, { status: 400 })
    }

    const incapacidad = await db.incapacidad.findUnique({
      where: { id },
      include: { eps: true, empleado: true },
    })
    if (!incapacidad) {
      return NextResponse.json({ error: 'Incapacidad no encontrada' }, { status: 404 })
    }

    if (incapacidad.estado !== 'VALIDADA') {
      return NextResponse.json(
        { error: 'Solo se pueden transcribir incapacidades validadas' },
        { status: 400 }
      )
    }

    const estadoAnterior = incapacidad.estado

    const updated = await db.$transaction(async (tx) => {
      const incap = await tx.incapacidad.update({
        where: { id },
        data: {
          estado: 'TRANSCRITA',
          fechaTranscripcion: new Date(),
          numeroRadicadoEPS: numeroRadicado,
        },
      })

      await tx.evidenciaRadicacion.create({
        data: {
          incapacidadId: id,
          metodoRadicacion: soporteRadicacion ? 'PORTAL_WEB' : 'CORREO',
          numeroRadicadoEPS: numeroRadicado,
          soporteUrl: soporteRadicacion || null,
          radicadoPor: session.userId,
        },
      })

      if (soporteRadicacion) {
        await tx.documento.create({
          data: {
            incapacidadId: id,
            tipoDocumento: 'SOPORTE_RADICACION',
            nombreArchivo: soporteRadicacion,
            rutaArchivo: `/uploads/${id}/${soporteRadicacion}`,
            formato: 'PDF',
            pesoKB: 0,
            obligatorio: false,
          },
        })
      }

      await tx.historialEstado.create({
        data: {
          incapacidadId: id,
          estadoAnterior,
          estadoNuevo: 'TRANSCRITA',
          accion: 'TRANSCRIPCION',
          usuarioId: session.userId,
          observaciones: `Transcrita a EPS ${incapacidad.eps.nombre}. Radicado EPS: ${numeroRadicado}`,
        },
      })

      await tx.seguimiento.create({
        data: {
          incapacidadId: id,
          usuarioId: session.userId,
          accion: 'TRANSCRIPCION_EPS',
          observaciones: `Transcrita a ${incapacidad.eps.nombre}. Nro radicado: ${numeroRadicado}`,
        },
      })

      return incap
    })

    const contabilidadUsers = await db.user.findMany({
      where: { role: 'CONTABILIDAD', active: true },
    })
    await db.notification.createMany({
      data: contabilidadUsers.map(user => ({
        userId: user.id,
        tipo: 'ESTADO_CHANGE',
        titulo: 'Incapacidad transcrita',
        mensaje: `La incapacidad ${incapacidad.radicado} ha sido transcrita a ${incapacidad.eps.nombre}. Radicado: ${numeroRadicado}`,
        enlace: `/incapacidades/${id}`,
      })),
    })

    return NextResponse.json({ incapacidad: updated, message: 'Incapacidad transcrita exitosamente' })
  } catch (error) {
    console.error('Error transcribing incapacidad:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
