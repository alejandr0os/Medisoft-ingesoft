import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { hashPassword } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!['AUXILIAR_GH', 'GERENCIA', 'CONTABILIDAD', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const nombre = searchParams.get('nombre')
    const documento = searchParams.get('documento')
    const area = searchParams.get('area')
    const active = searchParams.get('active')

    const where: Record<string, unknown> = {}
    if (nombre) where.name = { contains: nombre }
    if (documento) where.document = { contains: documento }
    if (area) where.area = { contains: area }
    if (active !== null && active !== undefined) where.active = active === 'true'

    const empleados = await db.employee.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, role: true, active: true } },
        eps: { select: { id: true, nombre: true } },
        arl: { select: { id: true, nombre: true } },
        _count: { select: { incapacidades: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ empleados })
  } catch (error) {
    console.error('Error listing empleados:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo administradores pueden crear empleados' }, { status: 403 })
    }

    const body = await request.json()
    const {
      document,
      name,
      email,
      phone,
      area,
      cargo,
      salary,
      epsId,
      arlId,
      password,
    } = body

    if (!document || !name || !email || !area || !cargo || !salary || !epsId) {
      return NextResponse.json(
        { error: 'Campos requeridos: document, name, email, area, cargo, salary, epsId' },
        { status: 400 }
      )
    }

    // Check for existing document or email
    const existing = await db.employee.findFirst({
      where: {
        OR: [{ document }, { email }],
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe un empleado con ese documento o email' },
        { status: 400 }
      )
    }

    // Create User account first
    const hashedPassword = await hashPassword(password || document)
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        document,
        role: 'EMPLEADO',
      },
    })

    // Create Employee
    const empleado = await db.employee.create({
      data: {
        userId: user.id,
        document,
        name,
        email,
        phone: phone || null,
        area,
        cargo,
        salary: Number(salary),
        epsId,
        arlId: arlId || null,
      },
      include: {
        eps: { select: { id: true, nombre: true } },
        arl: { select: { id: true, nombre: true } },
      },
    })

    return NextResponse.json({ empleado }, { status: 201 })
  } catch (error) {
    console.error('Error creating empleado:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!['AUXILIAR_GH', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'No tiene permisos para actualizar empleados' }, { status: 403 })
    }

    const body = await request.json()
    const { id, name, email, phone, area, cargo, salary, epsId, arlId, active } = body

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }

    const empleado = await db.employee.findUnique({ where: { id } })
    if (!empleado) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (area !== undefined) updateData.area = area
    if (cargo !== undefined) updateData.cargo = cargo
    if (salary !== undefined) updateData.salary = Number(salary)
    if (epsId !== undefined) updateData.epsId = epsId
    if (arlId !== undefined) updateData.arlId = arlId
    if (active !== undefined) updateData.active = active

    const updated = await db.employee.update({
      where: { id },
      data: updateData,
      include: {
        eps: { select: { id: true, nombre: true } },
        arl: { select: { id: true, nombre: true } },
      },
    })

    // Also update user email if changed
    if (email && email !== empleado.email) {
      await db.user.update({
        where: { id: empleado.userId },
        data: { email },
      })
    }

    return NextResponse.json({ empleado: updated })
  } catch (error) {
    console.error('Error updating empleado:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
