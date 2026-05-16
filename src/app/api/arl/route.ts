// CRUD de ARL

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const arl = await db.aRL.findMany({
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json({ arl })
  } catch (error) {
    console.error('ARL error:', error)
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
      return NextResponse.json({ error: 'Solo administradores pueden crear ARL' }, { status: 403 })
    }

    const body = await request.json()
    const { nombre, nit, telefono, email, contacto } = body

    if (!nombre || !nit) {
      return NextResponse.json({ error: 'Campos requeridos: nombre, nit' }, { status: 400 })
    }

    const existing = await db.aRL.findFirst({ where: { nit } })
    if (existing) {
      return NextResponse.json({ error: 'Ya existe una ARL con ese NIT' }, { status: 400 })
    }

    const arl = await db.aRL.create({
      data: {
        nombre,
        nit,
        telefono: telefono || null,
        email: email || null,
        contacto: contacto || null,
      },
    })

    return NextResponse.json({ arl }, { status: 201 })
  } catch (error) {
    console.error('Error creating ARL:', error)
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
      return NextResponse.json({ error: 'Solo administradores pueden editar ARL' }, { status: 403 })
    }

    const body = await request.json()
    const { id, nombre, nit, telefono, email, contacto, activa } = body

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }

    const existing = await db.aRL.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'ARL no encontrada' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (nombre !== undefined) updateData.nombre = nombre
    if (nit !== undefined) updateData.nit = nit
    if (telefono !== undefined) updateData.telefono = telefono
    if (email !== undefined) updateData.email = email
    if (contacto !== undefined) updateData.contacto = contacto
    if (activa !== undefined) updateData.activa = activa

    const arl = await db.aRL.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ arl })
  } catch (error) {
    console.error('Error updating ARL:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}