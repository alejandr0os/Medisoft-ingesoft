// Gestion de subsanaciones - incluye segundo aviso

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { addBusinessDays } from '@/lib/incapacidades-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!['AUXILIAR_GH', 'GERENCIA', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado')

    const where: Record<string, unknown> = estado ? { estado } : {}

    const subsanaciones = await db.subsanacion.findMany({
      where,
      include: {
        incapacidad: {
          select: {
            id: true,
            radicado: true,
            estado: true,
            tipoNovedad: true,
            fechaRegistro: true,
            empleado: { select: { id: true, name: true, document: true, area: true } },
            eps: { select: { id: true, nombre: true } },
          },
        },
      },
      orderBy: { fechaLimite: 'asc' },
    })

    const now = new Date()
    const result = subsanaciones.map(sub => {
      const diasRestantes = Math.ceil(
        (sub.fechaLimite.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      return {
        ...sub,
        diasRestantes,
        vencida: diasRestantes < 0,
        urgente: diasRestantes >= 0 && diasRestantes <= 1,
      }
    })

    return NextResponse.json({ subsanaciones: result })
  } catch (error) {
    console.error('Error listing subsanaciones:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!['AUXILIAR_GH', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'No tiene permisos para resolver subsanaciones' }, { status: 403 })
    }

    const body = await request.json()
    const { incapacidadId, estado, accion } = body

    if (accion === 'SEGUNDO_AVISO') {
      const incapacidad = await db.incapacidad.findUnique({
        where: { id: incapacidadId },
        include: { subsanaciones: { where: { estado: 'PENDIENTE' }, orderBy: { fechaSolicitud: 'desc' } }, empleado: true },
      })
      if (!incapacidad) {
        return NextResponse.json({ error: 'Incapacidad no encontrada' }, { status: 404 })
      }
      if (incapacidad.subsanaciones.length === 0) {
        return NextResponse.json({ error: 'No hay subsanaciones pendientes' }, { status: 400 })
      }

      const subsanacion = incapacidad.subsanaciones[0]
      const nuevaFechaLimite = addBusinessDays(new Date(), 3)

      const segundaSubsanacion = await db.$transaction(async (tx) => {
        const segunda = await tx.subsanacion.create({
          data: {
            incapacidadId,
            fechaLimite: nuevaFechaLimite,
            estado: 'PENDIENTE',
            documentosFaltantes: subsanacion.documentosFaltantes,
            tipo: 'SEGUNDO',
            recordatoriosEnviados: 0,
            observaciones: 'Segundo aviso - citatorio a coordinacion de administracion de personal',
          },
        })

        await tx.subsanacion.update({
          where: { id: subsanacion.id },
          data: {
            estado: 'VENCIDA',
            citatorioEnviado: true,
          },
        })

        // IMPORTANTE: Mantener el estado como PENDIENTE_SUBSANACION porque hay una nueva subsanacion pendiente
        // NO cambiar a SUBSANACION_VENCIDA, eso es solo para cuando se vence definitivamente
        await tx.historialEstado.create({
          data: {
            incapacidadId,
            estadoAnterior: incapacidad.estado,
            estadoNuevo: 'PENDIENTE_SUBSANACION',
            accion: 'SEGUNDO_AVISO_SUBSANACION',
            usuarioId: session.userId,
            observaciones: 'Segundo aviso de subsanacion enviado. Nuevo plazo: 3 dias habiles.',
          },
        })

        return segunda
      })

      await db.notification.create({
        data: {
          userId: incapacidad.empleado.userId,
          tipo: 'ALERTA',
          titulo: 'Segundo aviso de subsanacion',
          mensaje: `Su incapacidad ${incapacidad.radicado} requiere documentacion. Pierde 3 dias habiles para subsanar o sera citado a coordinacion.`,
        },
      })

      return NextResponse.json({ subsanacion: segundaSubsanacion, message: 'Segundo aviso enviado' })
    }

    // Default: RESOLVER subsanacion
    if (!incapacidadId || !estado) {
      return NextResponse.json(
        { error: 'Campos requeridos: incapacidadId, estado (SUBSANADA o VENCIDA)' },
        { status: 400 }
      )
    }

    if (!['SUBSANADA', 'VENCIDA'].includes(estado)) {
      return NextResponse.json(
        { error: 'Estado invalido. Use: SUBSANADA o VENCIDA' },
        { status: 400 }
      )
    }

    const incapacidad = await db.incapacidad.findUnique({
      where: { id: incapacidadId },
      include: { subsanaciones: { where: { estado: 'PENDIENTE' }, orderBy: { fechaSolicitud: 'desc' } } },
    })
    if (!incapacidad) {
      return NextResponse.json({ error: 'Incapacidad no encontrada' }, { status: 404 })
    }

    if (incapacidad.subsanaciones.length === 0) {
      return NextResponse.json(
        { error: 'No hay subsanaciones pendientes para esta incapacidad' },
        { status: 400 }
      )
    }

    const subsanacion = incapacidad.subsanaciones[0]
    const estadoAnterior = incapacidad.estado

    const updatedSubsanacion = await db.$transaction(async (tx) => {
      const updated = await tx.subsanacion.update({
        where: { id: subsanacion.id },
        data: {
          estado,
          fechaRespuesta: new Date(),
        },
      })

      if (estado === 'SUBSANADA') {
        await tx.incapacidad.update({
          where: { id: incapacidadId },
          data: { estado: 'PENDIENTE_VALIDACION' },
        })

        await tx.historialEstado.create({
          data: {
            incapacidadId,
            estadoAnterior,
            estadoNuevo: 'PENDIENTE_VALIDACION',
            accion: 'SUBSANACION_RESUELTA',
            usuarioId: session.userId,
            observaciones: 'Subsanacion resuelta - documentacion completada',
          },
        })
      } else {
        await tx.incapacidad.update({
          where: { id: incapacidadId },
          data: { estado: 'SUBSANACION_VENCIDA' },
        })

        await tx.historialEstado.create({
          data: {
            incapacidadId,
            estadoAnterior,
            estadoNuevo: 'SUBSANACION_VENCIDA',
            accion: 'SUBSANACION_VENCIDA',
            usuarioId: session.userId,
            observaciones: 'Plazo de subsanacion vencido sin respuesta del empleado',
          },
        })
      }

      await tx.seguimiento.create({
        data: {
          incapacidadId,
          usuarioId: session.userId,
          accion: estado === 'SUBSANADA' ? 'SUBSANACION_COMPLETADA' : 'SUBSANACION_VENCIDA',
          observaciones: estado === 'SUBSANADA'
            ? 'Documentacion subsanada exitosamente'
            : 'Plazo de subsanacion vencido sin respuesta del empleado',
        },
      })

      return updated
    })

    return NextResponse.json({
      subsanacion: updatedSubsanacion,
      incapacidadEstado: estado === 'SUBSANADA' ? 'PENDIENTE_VALIDACION' : 'SUBSANACION_VENCIDA',
    })
  } catch (error) {
    console.error('Error resolving subsanacion:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}