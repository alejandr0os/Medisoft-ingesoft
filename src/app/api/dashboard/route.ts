// Datos agregados para el dashboard por rol

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const role = session.role

    // Base stats
    const totalIncapacidades = await db.incapacidad.count()
    const pendientesValidacion = await db.incapacidad.count({
      where: { estado: { in: ['RECIBIDA', 'PENDIENTE_VALIDACION'] } },
    })
    const enCobro = await db.incapacidad.count({
      where: { estado: { in: ['EN_COBRO', 'COBRO_PERSUASIVO', 'COBRO_JURIDICO'] } },
    })
    const pagadas = await db.incapacidad.count({
      where: { estado: 'PAGADA' },
    })
    const rechazadas = await db.incapacidad.count({
      where: { estado: 'RECHAZADA_ENTIDAD' },
    })
    const largoPlazo = await db.incapacidad.count({
      where: { diasAcumulados: { gte: 90 } },
    })
    const reintegros = await db.reintegro.count({
      where: { estado: 'PENDIENTE' },
    })

    // EPS stats
    const epsStats = await db.ePS.findMany({
      include: {
        _count: { select: { incapacidades: true, empleados: true } },
      },
      where: { activa: true },
    })

    // Recent activity
    const recentIncapacidades = await db.incapacidad.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        empleado: { select: { name: true, cargo: true } },
        eps: { select: { nombre: true } },
      },
    })

    // Unread notifications
    const unreadNotifications = await db.notification.count({
      where: { userId: session.userId, leida: false },
    })

    // By tipo novedad
    const byTipo = await db.incapacidad.groupBy({
      by: ['tipoNovedad'],
      _count: { tipoNovedad: true },
    })

    // By estado
    const byEstado = await db.incapacidad.groupBy({
      by: ['estado'],
      _count: { estado: true },
    })

    // Role-specific data and access filtering
    let roleSpecificData: Record<string, unknown> = {}
    
    // Personal stats (for everyone, since everyone is an employee)
    const employee = await db.employee.findUnique({
      where: { userId: session.userId },
    })
    let personalStats = { misIncapacidades: 0, misPendientes: 0 }
    if (employee) {
      const misIncapacidadesCount = await db.incapacidad.count({
        where: { empleadoId: employee.id },
      })
      const misPendientesCount = await db.incapacidad.count({
        where: { empleadoId: employee.id, estado: { in: ['RECIBIDA', 'PENDIENTE_VALIDACION'] } },
      })
      personalStats = { misIncapacidades: misIncapacidadesCount, misPendientes: misPendientesCount }
    }

    if (role === 'EMPLEADO' && employee) {
      const whereEmpleado = { empleadoId: employee.id }
      const totalIncapacidades = await db.incapacidad.count({ where: whereEmpleado })
      const pendientesValidacion = await db.incapacidad.count({
        where: { ...whereEmpleado, estado: { in: ['RECIBIDA', 'PENDIENTE_VALIDACION'] } },
      })
      const enCobro = await db.incapacidad.count({
        where: { ...whereEmpleado, estado: { in: ['EN_COBRO', 'COBRO_PERSUASIVO', 'COBRO_JURIDICO'] } },
      })
      const pagadas = await db.incapacidad.count({
        where: { ...whereEmpleado, estado: 'PAGADA' },
      })

      const recentIncapacidades = await db.incapacidad.findMany({
        where: whereEmpleado,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          empleado: { select: { name: true, cargo: true } },
          eps: { select: { nombre: true } },
        },
      })

      const byEstado = await db.incapacidad.groupBy({
        by: ['estado'],
        where: whereEmpleado,
        _count: { estado: true },
      })

      return NextResponse.json({
        stats: { totalIncapacidades, pendientesValidacion, enCobro, pagadas, rechazadas: 0, largoPlazo: 0, reintegros: 0, unreadNotifications },
        byTipo: [],
        byEstado,
        epsStats: [],
        recentIncapacidades,
        roleSpecificData: personalStats,
      })
    }

    if (role === 'ABOGADO') {
      const cobrosJuridicos = await db.cobroJuridico.count({
        where: { estado: { in: ['ASIGNADO', 'DERECHO_PETICION', 'TUTELA', 'DEMANDA'] } },
      })
      const derechosPeticion = await db.derechoPeticion.count({
        where: { estado: { in: ['BORRADOR', 'RADICADO'] } },
      })
      roleSpecificData = { ...personalStats, cobrosJuridicos, derechosPeticion }
    } else if (role === 'CONTABILIDAD') {
      const reintegrosPendientes = await db.reintegro.count({
        where: { estado: 'PENDIENTE' },
      })
      const lotesPendientes = await db.loteCobro.count({
        where: { estado: { in: ['GENERADO', 'ENVIADO'] } },
      })
      roleSpecificData = { ...personalStats, reintegrosPendientes, lotesPendientes }
    } else {
      roleSpecificData = personalStats
    }

    return NextResponse.json({
      stats: {
        totalIncapacidades,
        pendientesValidacion,
        enCobro,
        pagadas,
        rechazadas,
        largoPlazo,
        reintegros,
        unreadNotifications,
      },
      byTipo,
      byEstado,
      epsStats: epsStats.map(e => ({
        id: e.id,
        nombre: e.nombre,
        incapacidades: e._count.incapacidades,
        empleados: e._count.empleados,
      })),
      recentIncapacidades,
      roleSpecificData,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
