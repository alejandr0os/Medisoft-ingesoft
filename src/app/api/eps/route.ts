// CRUD de EPS

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const eps = await db.ePS.findMany({
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json({ eps })
  } catch (error) {
    console.error('EPS error:', error)
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
      return NextResponse.json({ error: 'Solo administradores pueden crear EPS' }, { status: 403 })
    }

    const body = await request.json()
    const { nombre, nit, telefono, email, portalWeb, contacto } = body

    if (!nombre || !nit) {
      return NextResponse.json({ error: 'Campos requeridos: nombre, nit' }, { status: 400 })
    }

    const existing = await db.ePS.findFirst({ where: { nit } })
    if (existing) {
      return NextResponse.json({ error: 'Ya existe una EPS con ese NIT' }, { status: 400 })
    }

    const eps = await db.ePS.create({
      data: {
        nombre,
        nit,
        telefono: telefono || null,
        email: email || null,
        portalWeb: portalWeb || null,
        contacto: contacto || null,
      },
    })

    return NextResponse.json({ eps }, { status: 201 })
  } catch (error) {
    console.error('Error creating EPS:', error)
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
      return NextResponse.json({ error: 'Solo administradores pueden editar EPS' }, { status: 403 })
    }

    const body = await request.json()
    const { id, nombre, nit, telefono, email, portalWeb, contacto, activa } = body

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }

    const existing = await db.ePS.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'EPS no encontrada' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (nombre !== undefined) updateData.nombre = nombre
    if (nit !== undefined) updateData.nit = nit
    if (telefono !== undefined) updateData.telefono = telefono
    if (email !== undefined) updateData.email = email
    if (portalWeb !== undefined) updateData.portalWeb = portalWeb
    if (contacto !== undefined) updateData.contacto = contacto
    if (activa !== undefined) updateData.activa = activa

    const eps = await db.ePS.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ eps })
  } catch (error) {
    console.error('Error updating EPS:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}