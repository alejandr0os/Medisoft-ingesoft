// Notificacion automatica por 180 dias - suspender pago y tramitar fondo de pensiones

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

    const incapacidad = await db.incapacidad.findUnique({
      where: { id },
      include: { empleado: { include: { eps: true } } },
    })
    if (!incapacidad) {
      return NextResponse.json({ error: 'Incapacidad no encontrada' }, { status: 404 })
    }

    if (incapacidad.diasAcumulados < 180) {
      return NextResponse.json({ error: 'La incapacidad no supera los 180 dias acumulados' }, { status: 400 })
    }

    const shouldChangeEstado = ['EN_COBRO', 'COBRO_PERSUASIVO'].includes(incapacidad.estado)

    await db.$transaction(async (tx) => {
      await tx.notification.create({
        data: {
          userId: incapacidad.empleado.userId,
          tipo: 'ALERTA',
          titulo: 'Incapacidad supera 180 dias - Suspension de pago por nomina',
          mensaje: `Su incapacidad ${incapacidad.radicado} acumula ${incapacidad.diasAcumulados} dias. A partir del dia 181, el pago de la incapacidad se suspende por nomina y debe tramitar el reconocimiento ante el Fondo de Pensiones.`,
        },
      })

      await tx.historialEstado.create({
        data: {
          incapacidadId: id,
          estadoAnterior: incapacidad.estado,
          estadoNuevo: incapacidad.estado,
          accion: 'NOTIFICACION_180_DIAS',
          usuarioId: session.userId,
          observaciones: `Notificacion de suspension de pago por nomina. ${incapacidad.diasAcumulados} dias acumulados. Tramite ante Fondo de Pensiones requerido.`,
        },
      })

      await tx.seguimiento.create({
        data: {
          incapacidadId: id,
          usuarioId: session.userId,
          tipoAlerta: 'ROJO',
          accion: 'NOTIFICACION_180_DIAS',
          observaciones: `Empleado notificado de suspension de pago por nomina a partir del dia 181. Debe tramitar ante Fondo de Pensiones.`,
        },
      })

      if (shouldChangeEstado) {
        const estadoAnterior = incapacidad.estado
        await tx.incapacidad.update({
          where: { id },
          data: { estado: 'TRAMITE_PENSION' },
        })

        await tx.historialEstado.create({
          data: {
            incapacidadId: id,
            estadoAnterior,
            estadoNuevo: 'TRAMITE_PENSION',
            accion: 'INICIO_TRAMITE_PENSION',
            usuarioId: session.userId,
            observaciones: `Incapacidad con ${incapacidad.diasAcumulados} dias acumulados. Inicio tramite ante Fondo de Pensiones.`,
          },
        })

        const existingReintegro = await tx.reintegro.findUnique({ where: { incapacidadId: id } })
        if (!existingReintegro) {
          const salary = incapacidad.empleado.salary
          const ibcDiario = salary / 30
          const diasExcedentes = Math.max(0, incapacidad.diasAcumulados - 180)
          const montoReintegro = Math.round(ibcDiario * diasExcedentes * 0.5 * 100) / 100

          await tx.reintegro.create({
            data: {
              incapacidadId: id,
              montoRecibido: 0,
              montoReintegro: montoReintegro,
              estado: 'PENDIENTE',
              observaciones: `Reintegro pendiente por ${diasExcedentes} dias superiores a 180. Monto estimado: $${montoReintegro.toLocaleString()}`,
            },
          })
        }
      }
    })

    return NextResponse.json({
      message: 'Notificacion de 180 dias enviada',
      diasAcumulados: incapacidad.diasAcumulados,
      empleadoNotificado: incapacidad.empleado.name,
      estadoCambiado: shouldChangeEstado,
      nuevoEstado: shouldChangeEstado ? 'TRAMITE_PENSION' : incapacidad.estado,
    })
  } catch (error) {
    console.error('Error en notificacion 180 dias:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}