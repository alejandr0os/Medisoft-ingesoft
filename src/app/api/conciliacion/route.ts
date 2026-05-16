import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { canManageCobros } from '@/lib/incapacidades-utils'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!canManageCobros(session.role)) {
      return NextResponse.json({ error: 'No tiene permisos para conciliar pagos' }, { status: 403 })
    }

    const body = await request.json()
    const { loteCobroId, pagos } = body

    if (!loteCobroId || !pagos || !Array.isArray(pagos) || pagos.length === 0) {
      return NextResponse.json(
        { error: 'Campos requeridos: loteCobroId, pagos (array con {incapacidadId, valorPagado, comprobante?})' },
        { status: 400 }
      )
    }

    // Validate lote exists
    const lote = await db.loteCobro.findUnique({
      where: { id: loteCobroId },
      include: { detalles: { include: { incapacidad: true } }, eps: true },
    })
    if (!lote) {
      return NextResponse.json({ error: 'Lote de cobro no encontrado' }, { status: 404 })
    }

    const resultados = []

    await db.$transaction(async (tx) => {
      for (const pago of pagos) {
        const { incapacidadId, valorPagado, comprobante } = pago

        if (!incapacidadId || valorPagado === undefined) {
          resultados.push({ incapacidadId, error: 'incapacidadId y valorPagado son requeridos' })
          continue
        }

        const detalle = lote.detalles.find(d => d.incapacidadId === incapacidadId)
        if (!detalle) {
          resultados.push({ incapacidadId, error: 'Incapacidad no encontrada en este lote' })
          continue
        }

        const valorPagadoNum = Number(valorPagado)
        const valorEsperado = detalle.valorEsperado

        let detalleEstado: string
        let incapacidadEstado: string
        let fechaPago: Date | null = null

        if (Math.abs(valorPagadoNum - valorEsperado) < 1) {
          detalleEstado = 'PAGADO'
          incapacidadEstado = 'PAGADA'
          fechaPago = new Date()
        } else if (valorPagadoNum < valorEsperado) {
          detalleEstado = 'GLOSA'
          incapacidadEstado = 'GLOSA'
        } else {
          detalleEstado = 'PAGADO'
          incapacidadEstado = 'PAGADA'
          fechaPago = new Date()
        }

        await tx.detalleCobro.update({
          where: { id: detalle.id },
          data: {
            valorPagado: valorPagadoNum,
            estado: detalleEstado,
            fechaPago: fechaPago || undefined,
            comprobante: comprobante || null,
          },
        })

        const estadoAnterior = detalle.incapacidad.estado
        await tx.incapacidad.update({
          where: { id: incapacidadId },
          data: {
            estado: incapacidadEstado,
            valorPagado: valorPagadoNum,
            ...(fechaPago && { fechaPago }),
          },
        })

        await tx.historialEstado.create({
          data: {
            incapacidadId,
            estadoAnterior,
            estadoNuevo: incapacidadEstado,
            accion: `CONCILIACION_${detalleEstado}`,
            usuarioId: session.userId,
            observaciones: `Valor esperado: $${valorEsperado.toLocaleString()}, Valor pagado: $${valorPagadoNum.toLocaleString()}, Diferencia: $${(valorEsperado - valorPagadoNum).toLocaleString()}`,
          },
        })

        await tx.seguimiento.create({
          data: {
            incapacidadId,
            usuarioId: session.userId,
            accion: `PAGO_${detalleEstado}`,
            observaciones: `Conciliación: Esperado $${valorEsperado.toLocaleString()}, Pagado $${valorPagadoNum.toLocaleString()}`,
          },
        })

        resultados.push({
          incapacidadId,
          detalleEstado,
          incapacidadEstado,
          valorEsperado,
          valorPagado: valorPagadoNum,
          diferencia: Math.round((valorEsperado - valorPagadoNum) * 100) / 100,
        })
      }

      const detallesActualizados = await tx.detalleCobro.findMany({
        where: { loteCobroId },
      })
      const allPaid = detallesActualizados.every(d => d.estado === 'PAGADO')
      const someProcessed = detallesActualizados.some(d => d.estado === 'PAGADO' || d.estado === 'GLOSA')

      let nuevoEstadoLote = lote.estado
      if (allPaid) nuevoEstadoLote = 'PAGADO_TOTAL'
      else if (someProcessed) nuevoEstadoLote = 'PAGADO_PARCIAL'

      await tx.loteCobro.update({
        where: { id: loteCobroId },
        data: { estado: nuevoEstadoLote },
      })
    })

    const loteEstadoFinal = resultados.length > 0 ? (resultados.every(r => !r.error) ? (resultados.every(r => r.detalleEstado === 'PAGADO') ? 'PAGADO_TOTAL' : 'PAGADO_PARCIAL') : lote.estado) : lote.estado

    return NextResponse.json({
      message: 'Conciliación procesada',
      resultados,
      loteEstado: loteEstadoFinal,
    })
  } catch (error) {
    console.error('Error conciliating payments:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
