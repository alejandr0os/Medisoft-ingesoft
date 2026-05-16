import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [
      epsCount,
      arlCount,
      userCount,
      employeeCount,
      parametroCount,
      incapacidadCount,
      notificationCount,
    ] = await Promise.all([
      db.ePS.count(),
      db.aRL.count(),
      db.user.count(),
      db.employee.count(),
      db.parametro.count(),
      db.incapacidad.count(),
      db.notification.count(),
    ])

    return NextResponse.json({
      initialized: epsCount > 0 && userCount > 0,
      stats: {
        eps: epsCount,
        arl: arlCount,
        users: userCount,
        employees: employeeCount,
        parametros: parametroCount,
        incapacidades: incapacidadCount,
        notifications: notificationCount,
      },
    })
  } catch (error) {
    console.error('Setup check error:', error)
    return NextResponse.json(
      { initialized: false, error: 'Database error' },
      { status: 500 }
    )
  }
}
