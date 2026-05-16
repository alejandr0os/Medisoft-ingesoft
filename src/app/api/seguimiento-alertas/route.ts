import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { daysSince, getSemaphore } from '@/lib/incapacidades-utils'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!['AUXILIAR_GH', 'GERENCIA', 'CONTABILIDAD', 'ABOGADO', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Get all active incapacidades (not in terminal states)
    const activeEstados = [
      'RECIBIDA',
      'PENDIENTE_VALIDACION',
      'VALIDADA',
      'PENDIENTE_SUBSANACION',
      'TRANSCRITA',
      'RECHAZADA_ENTIDAD',
      'EN_COBRO',
      'COBRO_PERSUASIVO',
      'COBRO_JURIDICO',
      'GLOSA',
    ]

    const incapacidades = await db.incapacidad.findMany({
      where: { estado: { in: activeEstados } },
      include: {
        empleado: { select: { id: true, name: true, document: true, area: true, cargo: true } },
        eps: { select: { id: true, nombre: true } },
      },
      orderBy: { fechaRegistro: 'asc' },
    })

    // Calculate alerts for each
    const alertas = incapacidades.map(inc => {
      const dias = daysSince(inc.fechaRegistro)
      const semaforo = getSemaphore(dias)

      // Check for 90-day and 180-day thresholds
      const fechaInicioTime = inc.fechaInicio.getTime()
      const now = Date.now()
      const diasDesdeInicio = Math.floor((now - fechaInicioTime) / (1000 * 60 * 60 * 24))
      const alerta90Dias = diasDesdeInicio >= 90
      const alerta180Dias = diasDesdeInicio >= 180

      return {
        id: inc.id,
        radicado: inc.radicado,
        estado: inc.estado,
        tipoNovedad: inc.tipoNovedad,
        fechaRegistro: inc.fechaRegistro,
        fechaInicio: inc.fechaInicio,
        fechaFin: inc.fechaFin,
        diasIncapacidad: inc.diasIncapacidad,
        empleado: inc.empleado,
        eps: inc.eps,
        diasRadicacion: dias,
        semaforo,
        alerta90Dias,
        alerta180Dias,
        esProrroga: inc.esProrroga,
        esReporteExtemporaneo: inc.esReporteExtemporaneo,
      }
    })

    // Group by semaphore
    const verdes = alertas.filter(a => a.semaforo === 'VERDE')
    const amarillos = alertas.filter(a => a.semaforo === 'AMARILLO')
    const rojos = alertas.filter(a => a.semaforo === 'ROJO')

    // 90-day and 180-day alerts
    const alerta90 = alertas.filter(a => a.alerta90Dias && !a.alerta180Dias)
    const alerta180 = alertas.filter(a => a.alerta180Dias)

    return NextResponse.json({
      resumen: {
        total: alertas.length,
        verdes: verdes.length,
        amarillos: amarillos.length,
        rojos: rojos.length,
        alerta90Dias: alerta90.length,
        alerta180Dias: alerta180.length,
      },
      alertas,
      porSemaforo: {
        verde: verdes,
        amarillo: amarillos,
        rojo: rojos,
      },
      umbrales: {
        dias90: alerta90,
        dias180: alerta180,
      },
    })
  } catch (error) {
    console.error('Error getting seguimiento alertas:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
