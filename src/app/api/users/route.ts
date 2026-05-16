// Administracion de usuarios y roles

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, hashPassword } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        document: true,
        role: true,
        active: true,
        createdAt: true,
        employee: {
          select: { id: true, area: true, cargo: true, salary: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Users error:', error)
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
      return NextResponse.json({ error: 'Solo administradores pueden crear usuarios' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, document, password, role } = body

    if (!name || !email || !document || !password || !role) {
      return NextResponse.json(
        { error: 'Campos requeridos: name, email, document, password, role' },
        { status: 400 }
      )
    }

    const validRoles = ['EMPLEADO', 'AUXILIAR_GH', 'GERENCIA', 'CONTABILIDAD', 'ABOGADO', 'ADMIN']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Rol inválido. Use: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }

    // Check for existing user
    const existing = await db.user.findFirst({
      where: {
        OR: [{ email }, { document }],
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe un usuario con ese email o documento' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = await db.user.create({
      data: {
        name,
        email,
        document,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        document: true,
        role: true,
        active: true,
        createdAt: true,
      },
    })

    // If role is EMPLEADO, create Employee record too
    if (role === 'EMPLEADO') {
      // We need at minimum epsId for the employee - use a default or require it
      // For now, create with minimal data - the employee can be updated later
      const defaultEps = await db.ePS.findFirst()
      if (defaultEps) {
        await db.employee.create({
          data: {
            userId: user.id,
            document,
            name,
            email,
            area: 'POR_ASIGNAR',
            cargo: 'POR_ASIGNAR',
            salary: 0,
            epsId: defaultEps.id,
          },
        })
      }
    }

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
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
      return NextResponse.json({ error: 'Solo administradores pueden editar usuarios' }, { status: 403 })
    }

    const body = await request.json()
    const { id, name, email, role, active } = body

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }

    const existingUser = await db.user.findUnique({ where: { id } })
    if (!existingUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (role !== undefined) {
      const validRoles = ['EMPLEADO', 'AUXILIAR_GH', 'GERENCIA', 'CONTABILIDAD', 'ABOGADO', 'ADMIN']
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: `Rol invalido. Use: ${validRoles.join(', ')}` }, { status: 400 })
      }
      updateData.role = role
    }
    if (active !== undefined) updateData.active = active

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        document: true,
        role: true,
        active: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
