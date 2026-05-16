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
    const mes = searchParams.get('mes')
    const anio = searchParams.get('anio')

    if (!mes || !anio) {
      return NextResponse.json(
        { error: 'Parámetros requeridos: mes (1-12), anio (YYYY)' },
        { status: 400 }
      )
    }

    const mesNum = parseInt(mes)
    const anioNum = parseInt(anio)

    if (mesNum < 1 || mesNum > 12) {
      return NextResponse.json({ error: 'Mes debe ser entre 1 y 12' }, { status: 400 })
    }

    // Calculate date range for the month
    const fechaInicio = new Date(anioNum, mesNum - 1, 1)
    const fechaFin = new Date(anioNum, mesNum, 0, 23, 59, 59, 999)

    // Get all incapacidades in the month
    const incapacidades = await db.incapacidad.findMany({
      where: {
        fechaInicio: { gte: fechaInicio },
        fechaFin: { lte: fechaFin },
      },
      include: {
        empleado: { select: { id: true, name: true, area: true, cargo: true, salary: true } },
      },
    })

    // Get total employees for the period
    const totalEmpleados = await db.employee.count({ where: { active: true } })

    // Group by area
    const porArea: Record<string, { cantidad: number; dias: number; empleados: string[] }> = {}
    for (const inc of incapacidades) {
      const area = inc.empleado.area
      if (!porArea[area]) {
        porArea[area] = { cantidad: 0, dias: 0, empleados: [] }
      }
      porArea[area].cantidad++
      porArea[area].dias += inc.diasIncapacidad
      if (!porArea[area].empleados.includes(inc.empleado.name)) {
        porArea[area].empleados.push(inc.empleado.name)
      }
    }

    // Group by cargo
    const porCargo: Record<string, { cantidad: number; dias: number }> = {}
    for (const inc of incapacidades) {
      const cargo = inc.empleado.cargo
      if (!porCargo[cargo]) {
        porCargo[cargo] = { cantidad: 0, dias: 0 }
      }
      porCargo[cargo].cantidad++
      porCargo[cargo].dias += inc.diasIncapacidad
    }

    // Group by género - we don't have género field, so group by employee name
    // as a proxy (in real system, Employee model would have género field)
    const porEmpleado: Record<string, { incapacidades: number; dias: number }> = {}
    for (const inc of incapacidades) {
      const nombre = inc.empleado.name
      if (!porEmpleado[nombre]) {
        porEmpleado[nombre] = { incapacidades: 0, dias: 0 }
      }
      porEmpleado[nombre].incapacidades++
      porEmpleado[nombre].dias += inc.diasIncapacidad
    }

    // Group by diagnostico
    const porDiagnostico: Record<string, { cantidad: number; dias: number; tipoNovedad: string[] }> = {}
    for (const inc of incapacidades) {
      const diag = inc.diagnosticoCIE10 || 'SIN_DIAGNOSTICO'
      if (!porDiagnostico[diag]) {
        porDiagnostico[diag] = { cantidad: 0, dias: 0, tipoNovedad: [] }
      }
      porDiagnostico[diag].cantidad++
      porDiagnostico[diag].dias += inc.diasIncapacidad
      if (!porDiagnostico[diag].tipoNovedad.includes(inc.tipoNovedad)) {
        porDiagnostico[diag].tipoNovedad.push(inc.tipoNovedad)
      }
    }

    // Group by tipoNovedad
    const porTipoNovedad: Record<string, number> = {}
    for (const inc of incapacidades) {
      porTipoNovedad[inc.tipoNovedad] = (porTipoNovedad[inc.tipoNovedad] || 0) + 1
    }

    // Calculate severity and frequency indicators
    const totalDiasPerdidos = incapacidades.reduce((sum, inc) => sum + inc.diasIncapacidad, 0)
    const diasDelMes = new Date(anioNum, mesNum, 0).getDate()
    const horasLaboralesDiarias = 8

    const indiceFrecuencia = totalEmpleados > 0
      ? Math.round((incapacidades.length / totalEmpleados) * 200000) / 100
      : 0

    const indiceSeveridad = totalEmpleados > 0
      ? Math.round((totalDiasPerdidos * horasLaboralesDiarias / (totalEmpleados * diasDelMes * horasLaboralesDiarias)) * 200000) / 100
      : 0

    const promedioDiasIncapacidad = incapacidades.length > 0
      ? Math.round((totalDiasPerdidos / incapacidades.length) * 100) / 100
      : 0

    const reporte = {
      periodo: { mes: mesNum, anio: anioNum, fechaInicio: fechaInicio.toISOString(), fechaFin: fechaFin.toISOString() },
      resumen: {
        totalEmpleados,
        totalIncapacidades: incapacidades.length,
        totalDiasPerdidos,
        promedioDiasIncapacidad,
        indiceFrecuencia,
        indiceSeveridad,
        porcentajeAusentismo: totalEmpleados > 0
          ? Math.round((totalDiasPerdidos / (totalEmpleados * diasDelMes)) * 10000) / 100
          : 0,
      },
      porArea,
      porCargo,
      porEmpleado,
      porDiagnostico,
      porTipoNovedad,
    }

    return NextResponse.json({ reporte })
  } catch (error) {
    console.error('Error generating SG-SST report:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
