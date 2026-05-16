import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
      include: { employee: { include: { eps: true, arl: true } } },
    })

    if (!user || !user.active) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        document: user.document,
        employee: user.employee
          ? {
              id: user.employee.id,
              area: user.employee.area,
              cargo: user.employee.cargo,
              salary: user.employee.salary,
              eps: user.employee.eps
                ? { id: user.employee.eps.id, nombre: user.employee.eps.nombre }
                : null,
              arl: user.employee.arl
                ? { id: user.employee.arl.id, nombre: user.employee.arl.nombre }
                : null,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('Me error:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
