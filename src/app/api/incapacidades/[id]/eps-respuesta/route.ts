// Simulacion de respuestas EPS - aceptar, rechazar, pagar

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { calcularDesglose } from '@/lib/incapacidades-utils'

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
      return NextResponse.json({ error: 'No tiene permisos para simular respuestas EPS' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { tipoRespuesta, observaciones, causalRechazo, descripcionRechazo, esSubsanable, valorPagado, referenciaPago } = body

    const incapacidad = await db.incapacidad.findUnique({
      where: { id },
      include: { empleado: true, eps: true },
    })
    if (!incapacidad) {
      return NextResponse.json({ error: 'Incapacidad no encontrada' }, { status: 404 })
    }

    const estadoAnterior = incapacidad.estado

    if (tipoRespuesta === 'ACEPTAR' && incapacidad.estado === 'TRANSCRITA') {
      const desglose = calcularDesglose(incapacidad.empleado.salary, incapacidad.diasIncapacidad, incapacidad.tipoNovedad)

      const updated = await db.$transaction(async (tx) => {
        const incap = await tx.incapacidad.update({
          where: { id },
          data: {
            estado: 'EN_COBRO',
            fechaCobro: new Date(),
            fechaAceptacionEPS: new Date(),
            valorCobro: desglose.valorTotal,
            valorEmpleador: desglose.valorEmpleador,
            valorEPS: desglose.valorEPS,
            diasEmpleador: desglose.diasEmpleador,
          },
        })

        await tx.historialEstado.create({
          data: {
            incapacidadId: id,
            estadoAnterior,
            estadoNuevo: 'EN_COBRO',
            accion: 'ACEPTACION_EPS',
            usuarioId: session.userId,
            observaciones: observaciones || `EPS ${incapacidad.eps.nombre} acepto la incapacidad. Valor a cobrar: $${desglose.valorTotal.toLocaleString()}`,
          },
        })

        await tx.seguimiento.create({
          data: {
            incapacidadId: id,
            usuarioId: session.userId,
            tipoAlerta: 'VERDE',
            accion: 'EPS_ACEPTA',
            observaciones: `EPS ${incapacidad.eps.nombre} acepto la incapacidad.`,
          },
        })

        return incap
      })

      await db.notification.createMany({
        data: (await db.user.findMany({ where: { role: 'CONTABILIDAD', active: true } })).map(u => ({
          userId: u.id,
          tipo: 'ESTADO_CHANGE',
          titulo: 'Incapacidad aceptada por EPS',
          mensaje: `La incapacidad ${incapacidad.radicado} fue aceptada por ${incapacidad.eps.nombre}. Valor: $${desglose.valorTotal.toLocaleString()}`,
        })),
      })

      return NextResponse.json({ incapacidad: updated, desglose, message: 'Incapacidad aceptada por EPS' })
    }

    if (tipoRespuesta === 'RECHAZAR' && ['TRANSCRITA', 'EN_COBRO'].includes(incapacidad.estado)) {
      if (!causalRechazo || !descripcionRechazo) {
        return NextResponse.json({ error: 'Causal y descripcion del rechazo son requeridos' }, { status: 400 })
      }

      const updated = await db.$transaction(async (tx) => {
        const incap = await tx.incapacidad.update({
          where: { id },
          data: { estado: 'RECHAZADA_ENTIDAD' },
        })

        await tx.rechazoEPS.create({
          data: {
            incapacidadId: id,
            causal: causalRechazo,
            descripcion: descripcionRechazo,
            esSubsanable: esSubsanable ?? false,
            gestionado: false,
          },
        })

        await tx.historialEstado.create({
          data: {
            incapacidadId: id,
            estadoAnterior,
            estadoNuevo: 'RECHAZADA_ENTIDAD',
            accion: 'RECHAZO_EPS',
            usuarioId: session.userId,
            observaciones: `EPS rechazo: ${causalRechazo} - ${descripcionRechazo}`,
          },
        })

        await tx.seguimiento.create({
          data: {
            incapacidadId: id,
            usuarioId: session.userId,
            tipoAlerta: 'ROJO',
            accion: 'EPS_RECHAZA',
            observaciones: `EPS rechazo la incapacidad. Causal: ${causalRechazo}`,
          },
        })

        return incap
      })

      const abogadoUsers = await db.user.findMany({ where: { role: 'ABOGADO', active: true } })
      await db.notification.createMany({
        data: abogadoUsers.map(u => ({
          userId: u.id,
          tipo: 'ALERTA',
          titulo: 'Incapacidad rechazada por EPS',
          mensaje: `La incapacidad ${incapacidad.radicado} fue rechazada por ${incapacidad.eps.nombre}. Causal: ${causalRechazo}`,
        })),
      })

      return NextResponse.json({ incapacidad: updated, message: 'Rechazo de EPS registrado' })
    }

    if (tipoRespuesta === 'PAGAR' && incapacidad.estado === 'EN_COBRO') {
      if (!valorPagado) {
        return NextResponse.json({ error: 'El valor pagado es requerido' }, { status: 400 })
      }

      const updated = await db.$transaction(async (tx) => {
        const incap = await tx.incapacidad.update({
          where: { id },
          data: {
            estado: 'PAGADA',
            fechaPago: new Date(),
            valorPagado: parseFloat(valorPagado),
            referenciaPagoEPS: referenciaPago || null,
          },
        })

        if (incapacidad.diasAcumulados > 180) {
          const desglose = calcularDesglose(incapacidad.empleado.salary, incapacidad.diasIncapacidad, incapacidad.tipoNovedad)
          if (desglose.valorFondoPension > 0) {
            await tx.reintegro.upsert({
              where: { incapacidadId: id },
              create: {
                incapacidadId: id,
                montoRecibido: parseFloat(valorPagado),
                montoReintegro: desglose.valorFondoPension,
                estado: 'PENDIENTE',
                observaciones: 'Reintegro pendiente - incapacidad supera 180 dias',
              },
              update: {
                montoRecibido: parseFloat(valorPagado),
                montoReintegro: desglose.valorFondoPension,
                estado: 'PENDIENTE',
              },
            })
          }
        }

        await tx.historialEstado.create({
          data: {
            incapacidadId: id,
            estadoAnterior,
            estadoNuevo: 'PAGADA',
            accion: 'PAGO_EPS',
            usuarioId: session.userId,
            observaciones: `Pago recibido de ${incapacidad.eps.nombre}. Valor: $${parseFloat(valorPagado).toLocaleString()}${referenciaPago ? `. Ref: ${referenciaPago}` : ''}`,
          },
        })

        await tx.seguimiento.create({
          data: {
            incapacidadId: id,
            usuarioId: session.userId,
            tipoAlerta: 'VERDE',
            accion: 'PAGO_RECIBIDO',
            observaciones: `Pago recibido de ${incapacidad.eps.nombre} por $${parseFloat(valorPagado).toLocaleString()}`,
          },
        })

        return incap
      })

      const ghUsers = await db.user.findMany({ where: { role: 'AUXILIAR_GH', active: true } })
      const contUsers = await db.user.findMany({ where: { role: 'CONTABILIDAD', active: true } })
      await db.notification.createMany({
        data: [...ghUsers, ...contUsers].map(u => ({
          userId: u.id,
          tipo: 'ESTADO_CHANGE',
          titulo: 'Pago recibido',
          mensaje: `Se recibio pago de ${incapacidad.eps.nombre} por la incapacidad ${incapacidad.radicado}. Valor: $${parseFloat(valorPagado).toLocaleString()}`,
        })),
      })

      return NextResponse.json({ incapacidad: updated, message: 'Pago registrado exitosamente' })
    }

    if (tipoRespuesta === 'GLOSAR' && incapacidad.estado === 'EN_COBRO') {
      const updated = await db.$transaction(async (tx) => {
        const incap = await tx.incapacidad.update({
          where: { id },
          data: { estado: 'GLOSA' },
        })

        await tx.historialEstado.create({
          data: {
            incapacidadId: id,
            estadoAnterior,
            estadoNuevo: 'GLOSA',
            accion: 'GLOSA_EPS',
            usuarioId: session.userId,
            observaciones: observaciones || `EPS glosa parcialmente la incapacidad`,
          },
        })

        return incap
      })

      return NextResponse.json({ incapacidad: updated, message: 'Glosa registrada' })
    }

    return NextResponse.json({ error: `No se puede procesar tipoRespuesta=${tipoRespuesta} en estado=${incapacidad.estado}` }, { status: 400 })
  } catch (error) {
    console.error('Error en respuesta EPS:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}