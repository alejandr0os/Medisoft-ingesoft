import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

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
    const incapacidadId = searchParams.get('incapacidadId')
    const tipo = searchParams.get('tipo')

    const where: Record<string, unknown> = {}
    if (estado) where.estado = estado
    if (incapacidadId) where.incapacidadId = incapacidadId
    if (tipo) where.tipo = tipo

    const derechosPeticion = await db.derechoPeticion.findMany({
      where,
      include: {
        incapacidad: {
          select: {
            id: true,
            radicado: true,
            estado: true,
            empleado: { select: { id: true, name: true, document: true } },
            eps: { select: { id: true, nombre: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ derechosPeticion })
  } catch (error) {
    console.error('Error listing derechos de petición:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!['ABOGADO', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'No tiene permisos para crear derechos de petición' }, { status: 403 })
    }

    const body = await request.json()
    const { incapacidadId, tipo, contenido } = body

    if (!incapacidadId || !tipo || !contenido) {
      return NextResponse.json(
        { error: 'Campos requeridos: incapacidadId, tipo, contenido' },
        { status: 400 }
      )
    }

    const validTipos = ['FALTA_PAGO', 'GLOSA_INJUSTIFICADA', 'FALTA_RESPUESTA']
    if (!validTipos.includes(tipo)) {
      return NextResponse.json(
        { error: 'Tipo inválido. Use: FALTA_PAGO, GLOSA_INJUSTIFICADA, FALTA_RESPUESTA' },
        { status: 400 }
      )
    }

    const incapacidad = await db.incapacidad.findUnique({
      where: { id: incapacidadId },
    })
    if (!incapacidad) {
      return NextResponse.json({ error: 'Incapacidad no encontrada' }, { status: 404 })
    }

    const derechoPeticion = await db.derechoPeticion.create({
      data: {
        incapacidadId,
        tipo,
        contenido,
        estado: 'BORRADOR',
      },
    })

    // Add seguimiento
    await db.seguimiento.create({
      data: {
        incapacidadId,
        usuarioId: session.userId,
        accion: 'DERECHO_PETICION_CREADO',
        observaciones: `Derecho de petición creado - Tipo: ${tipo}`,
      },
    })

    return NextResponse.json({ derechoPeticion }, { status: 201 })
  } catch (error) {
    console.error('Error creating derecho de petición:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!['ABOGADO', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'No tiene permisos para actualizar derechos de petición' }, { status: 403 })
    }

    const body = await request.json()
    const { id, radicado, fechaRadicado, respuesta, estado } = body

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }

    const dp = await db.derechoPeticion.findUnique({
      where: { id },
      include: { incapacidad: true },
    })
    if (!dp) {
      return NextResponse.json({ error: 'Derecho de petición no encontrado' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (radicado !== undefined) {
      updateData.radicado = radicado
      updateData.estado = 'RADICADO'
      updateData.fechaRadicado = fechaRadicado ? new Date(fechaRadicado) : new Date()
    }
    if (respuesta !== undefined) {
      updateData.respuesta = respuesta
      updateData.fechaRespuesta = new Date()
      if (!estado) updateData.estado = 'RESPONDIDO'
    }
    if (estado !== undefined) {
      updateData.estado = estado
      if (estado === 'RADICADO' && !updateData.fechaRadicado) {
        updateData.fechaRadicado = new Date()
      }
      if (['RESPONDIDO', 'FAVORABLE', 'DESFAVORABLE'].includes(estado) && !updateData.fechaRespuesta) {
        updateData.fechaRespuesta = new Date()
      }
    }

    const updated = await db.derechoPeticion.update({
      where: { id },
      data: updateData,
    })

    // Add seguimiento on the incapacidad
    if (dp.incapacidadId) {
      await db.seguimiento.create({
        data: {
          incapacidadId: dp.incapacidadId,
          usuarioId: session.userId,
          accion: 'DERECHO_PETICION_ACTUALIZADO',
          observaciones: `Derecho de petición actualizado - Estado: ${updated.estado}`,
        },
      })

      // If favorable, may update incapacidad
      if (estado === 'FAVORABLE') {
        await db.incapacidad.update({
          where: { id: dp.incapacidadId },
          data: { estado: 'PAGADA', fechaPago: new Date() },
        })
        await db.historialEstado.create({
          data: {
            incapacidadId: dp.incapacidadId,
            estadoAnterior: dp.incapacidad.estado,
            estadoNuevo: 'PAGADA',
            accion: 'DERECHO_PETICION_FAVORABLE',
            usuarioId: session.userId,
            observaciones: 'Derecho de petición favorable',
          },
        })
      }
    }

    return NextResponse.json({ derechoPeticion: updated })
  } catch (error) {
    console.error('Error updating derecho de petición:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
