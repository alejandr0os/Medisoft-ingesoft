// Gestion de concepto de rehabilitation para incapacidades >120 dias

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
    if (!['AUXILIAR_GH', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'No tiene permisos' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { accion, conceptoFavorable, observaciones } = body

    const incapacidad = await db.incapacidad.findUnique({
      where: { id },
      include: { empleado: { include: { eps: true, arl: true } } },
    })
    if (!incapacidad) {
      return NextResponse.json({ error: 'Incapacidad no encontrada' }, { status: 404 })
    }

    // accion can be: SOLICITAR, REGISTRAR_CONCEPTO, NOTIFICAR
    if (accion === 'SOLICITAR') {
      const existing = await db.rehabilitacion.findUnique({ where: { incapacidadId: id } })
      if (existing) {
        return NextResponse.json({ error: 'Ya existe un registro de rehabilitacion' }, { status: 400 })
      }

      const rehab = await db.$transaction(async (tx) => {
        const r = await tx.rehabilitacion.create({
          data: {
            incapacidadId: id,
            conceptoSolicitado: true,
            fechaSolicitudConcepto: new Date(),
            observaciones: observaciones || `Solicitud de concepto de rehabilitacion - ${incapacidad.diasAcumulados} dias acumulados`,
          },
        })

        await tx.historialEstado.create({
          data: {
            incapacidadId: id,
            estadoAnterior: incapacidad.estado,
            estadoNuevo: incapacidad.estado,
            accion: 'SOLICITUD_REHABILITACION',
            usuarioId: session.userId,
            observaciones: 'Solicitado concepto de rehabilitacion a EPS',
          },
        })

        return r
      })

      return NextResponse.json({ rehab }, { status: 201 })
    }

    if (accion === 'REGISTRAR_CONCEPTO') {
      if (conceptoFavorable === undefined) {
        return NextResponse.json({ error: 'conceptoFavorable es requerido' }, { status: 400 })
      }

      const conceptoTexto = conceptoFavorable ? 'favorable' : 'desfavorable'

      const rehab = await db.$transaction(async (tx) => {
        const r = await tx.rehabilitacion.upsert({
          where: { incapacidadId: id },
          create: {
            incapacidadId: id,
            conceptoSolicitado: true,
            fechaSolicitudConcepto: new Date(),
            conceptoFavorable,
            conceptoRecibido: new Date(),
            observaciones: observaciones || null,
          },
          update: {
            conceptoFavorable,
            conceptoRecibido: new Date(),
            observaciones: observaciones || undefined,
          },
        })

        await tx.historialEstado.create({
          data: {
            incapacidadId: id,
            estadoAnterior: incapacidad.estado,
            estadoNuevo: incapacidad.estado,
            accion: 'CONCEPTO_REHABILITACION',
            usuarioId: session.userId,
            observaciones: `Concepto de rehabilitacion ${conceptoTexto}`,
          },
        })

        return r
      })

      if (!conceptoFavorable && incapacidad.diasAcumulados > 180) {
        const empleado = incapacidad.empleado
        await db.notification.create({
          data: {
            userId: empleado.userId,
            tipo: 'ALERTA',
            titulo: 'Concepto desfavorable - Tramite ante Fondo de Pensiones',
            mensaje: `Su incapacidad ${incapacidad.radicado} tiene concepto de rehabilitacion desfavorable y supera 180 dias. Debe iniciar tramite ante el Fondo de Pensiones.`,
          },
        })
      }

      return NextResponse.json({ rehab })
    }

    if (accion === 'NOTIFICAR') {
      const { notificadoEPS, notificadoARL, notificadoAFP, notificadoTrabajador } = body

      const rehab = await db.rehabilitacion.findUnique({ where: { incapacidadId: id } })
      if (!rehab) {
        return NextResponse.json({ error: 'No existe registro de rehabilitacion' }, { status: 404 })
      }

      await db.$transaction(async (tx) => {
        await tx.rehabilitacion.update({
          where: { incapacidadId: id },
          data: {
            notificadoEPS: notificadoEPS ?? rehab.notificadoEPS,
            notificadoARL: notificadoARL ?? rehab.notificadoARL,
            notificadoAFP: notificadoAFP ?? rehab.notificadoAFP,
            notificadoTrabajador: notificadoTrabajador ?? rehab.notificadoTrabajador,
          },
        })

        await tx.historialEstado.create({
          data: {
            incapacidadId: id,
            estadoAnterior: incapacidad.estado,
            estadoNuevo: incapacidad.estado,
            accion: 'NOTIFICACION_REHABILITACION',
            usuarioId: session.userId,
            observaciones: 'Notificaciones de concepto de rehabilitacion enviadas',
          },
        })
      })

      return NextResponse.json({ message: 'Notificaciones registradas' })
    }

    return NextResponse.json({ error: 'Accion no valida' }, { status: 400 })
  } catch (error) {
    console.error('Error en rehabilitacion:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id } = await params
    const rehab = await db.rehabilitacion.findUnique({ where: { incapacidadId: id } })
    return NextResponse.json({ rehab })
  } catch (error) {
    console.error('Error fetching rehab:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}