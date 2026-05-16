// Gestion de cobros juridicos

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { canManageJuridico } from '@/lib/incapacidades-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!['AUXILIAR_GH', 'GERENCIA', 'CONTABILIDAD', 'ABOGADO', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado')

    const where: Record<string, unknown> = {}
    if (estado) where.estado = estado

    const cobrosJuridicos = await db.cobroJuridico.findMany({
      where,
      include: {
        incapacidad: {
          include: {
            empleado: { select: { id: true, name: true, document: true, area: true, salary: true } },
            eps: { select: { id: true, nombre: true, nit: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ cobrosJuridicos })
  } catch (error) {
    console.error('Error listing cobros jurídicos:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!canManageJuridico(session.role)) {
      return NextResponse.json({ error: 'No tiene permisos para gestionar cobro jurídico' }, { status: 403 })
    }

    const body = await request.json()
    const {
      incapacidadId,
      estado,
      analisisLegal,
      estrategia,
      radicadoDP,
      resultado,
      observaciones,
    } = body

    if (!incapacidadId) {
      return NextResponse.json({ error: 'incapacidadId es requerido' }, { status: 400 })
    }

    const incapacidad = await db.incapacidad.findUnique({
      where: { id: incapacidadId },
      include: { cobroJuridico: true },
    })
    if (!incapacidad) {
      return NextResponse.json({ error: 'Incapacidad no encontrada' }, { status: 404 })
    }

    // If CobroJuridico already exists, update it
    if (incapacidad.cobroJuridico) {
      const updateData: Record<string, unknown> = {}
      if (estado) updateData.estado = estado
      if (analisisLegal) updateData.analisisLegal = analisisLegal
      if (estrategia) updateData.estrategia = estrategia
      if (radicadoDP) {
        updateData.radicadoDP = radicadoDP
        updateData.fechaRadicadoDP = new Date()
      }
      if (resultado) {
        updateData.resultado = resultado
        updateData.fechaResultado = new Date()
      }
      if (observaciones) updateData.observaciones = observaciones

      const updated = await db.cobroJuridico.update({
        where: { id: incapacidad.cobroJuridico.id },
        data: updateData,
      })

      // If estado changes affect the incapacidad
      if (estado) {
        const estadoMap: Record<string, string> = {
          'FAVORABLE': 'PAGADA',
          'CONCILIACION': 'PAGADA',
          'FALLO_FAVORABLE': 'PAGADA',
          'CERRADO': 'ARCHIVADA',
        }
        const newIncapEstado = estadoMap[estado]
        if (newIncapEstado) {
          await db.incapacidad.update({
            where: { id: incapacidadId },
            data: {
              estado: newIncapEstado,
              ...(newIncapEstado === 'PAGADA' && { fechaPago: new Date() }),
              ...(newIncapEstado === 'ARCHIVADA' && { fechaArchivo: new Date() }),
            },
          })

          await db.historialEstado.create({
            data: {
              incapacidadId,
              estadoAnterior: incapacidad.estado,
              estadoNuevo: newIncapEstado,
              accion: `COBRO_JURIDICO_${estado}`,
              usuarioId: session.userId,
              observaciones: `Cobro jurídico: ${estado}`,
            },
          })
        }

        // If derecho de petición state, update incapacidad accordingly
        if (estado === 'DERECHO_PETICION') {
          await db.incapacidad.update({
            where: { id: incapacidadId },
            data: { estado: 'COBRO_JURIDICO' },
          })
        }
      }

      // Add seguimiento
      await db.seguimiento.create({
        data: {
          incapacidadId,
          usuarioId: session.userId,
          accion: `COBRO_JURIDICO_ACTUALIZADO`,
          observaciones: `Estado actualizado a: ${estado || incapacidad.cobroJuridico.estado}`,
        },
      })

      return NextResponse.json({ cobroJuridico: updated })
    }

    // Create new CobroJuridico
    if (!estado) {
      return NextResponse.json({ error: 'estado es requerido para crear cobro jurídico' }, { status: 400 })
    }

    const cobroJuridico = await db.cobroJuridico.create({
      data: {
        incapacidadId,
        estado,
        analisisLegal: analisisLegal || null,
        estrategia: estrategia || null,
        radicadoDP: radicadoDP || null,
        fechaRadicadoDP: radicadoDP ? new Date() : null,
        resultado: resultado || null,
        observaciones: observaciones || null,
      },
    })

    // Ensure incapacidad is in COBRO_JURIDICO state
    if (incapacidad.estado !== 'COBRO_JURIDICO') {
      const estadoAnterior = incapacidad.estado
      await db.incapacidad.update({
        where: { id: incapacidadId },
        data: { estado: 'COBRO_JURIDICO' },
      })

      await db.historialEstado.create({
        data: {
          incapacidadId,
          estadoAnterior,
          estadoNuevo: 'COBRO_JURIDICO',
          accion: 'CREACION_COBRO_JURIDICO',
          usuarioId: session.userId,
          observaciones: observaciones || 'Cobro jurídico iniciado',
        },
      })
    }

    return NextResponse.json({ cobroJuridico }, { status: 201 })
  } catch (error) {
    console.error('Error managing cobro jurídico:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
