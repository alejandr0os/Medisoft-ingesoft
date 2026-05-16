// Parametros configurables del sistema

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!['AUXILIAR_GH', 'GERENCIA', 'CONTABILIDAD', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const parametros = await db.parametro.findMany({
      where: { activo: true },
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
    })

    return NextResponse.json({ parametros })
  } catch (error) {
    console.error('Parametros error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden crear parámetros' }, { status: 403 })
    }

    const body = await request.json()
    const { categoria, nombre, valor, descripcion, fechaVigencia } = body

    if (!categoria || !nombre || !valor) {
      return NextResponse.json(
        { error: 'Campos requeridos: categoria, nombre, valor' },
        { status: 400 }
      )
    }

    const validCategorias = ['LEGALES', 'ENTIDADES', 'TIEMPOS', 'COBRO', 'CONFIG', 'NOTIFICACIONES']
    if (!validCategorias.includes(categoria)) {
      return NextResponse.json(
        { error: `Categoría inválida. Use: ${validCategorias.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if parameter with same categoria+nombre exists
    const existing = await db.parametro.findFirst({
      where: { categoria, nombre },
    })

    if (existing) {
      // Update existing
      const updated = await db.parametro.update({
        where: { id: existing.id },
        data: {
          valor,
          descripcion: descripcion || existing.descripcion,
          fechaVigencia: fechaVigencia ? new Date(fechaVigencia) : existing.fechaVigencia,
        },
      })
      return NextResponse.json({ parametro: updated })
    }

    // Create new
    const parametro = await db.parametro.create({
      data: {
        categoria,
        nombre,
        valor,
        descripcion: descripcion || null,
        fechaVigencia: fechaVigencia ? new Date(fechaVigencia) : new Date(),
      },
    })

    return NextResponse.json({ parametro }, { status: 201 })
  } catch (error) {
    console.error('Error creating parametro:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden actualizar parámetros' }, { status: 403 })
    }

    const body = await request.json()
    const { id, valor, descripcion, activo, fechaVigencia } = body

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }

    const parametro = await db.parametro.findUnique({ where: { id } })
    if (!parametro) {
      return NextResponse.json({ error: 'Parámetro no encontrado' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (valor !== undefined) updateData.valor = valor
    if (descripcion !== undefined) updateData.descripcion = descripcion
    if (activo !== undefined) updateData.activo = activo
    if (fechaVigencia !== undefined) updateData.fechaVigencia = new Date(fechaVigencia)

    const updated = await db.parametro.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ parametro: updated })
  } catch (error) {
    console.error('Error updating parametro:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
