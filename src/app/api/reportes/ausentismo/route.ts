import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { calcularValorEsperado } from '@/lib/incapacidades-utils'

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
    const fechaInicio = searchParams.get('fechaInicio')
    const fechaFin = searchParams.get('fechaFin')

    if (!fechaInicio || !fechaFin) {
      return NextResponse.json(
        { error: 'Parámetros requeridos: fechaInicio, fechaFin (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    const inicio = new Date(fechaInicio)
    inicio.setHours(0, 0, 0, 0)
    const fin = new Date(fechaFin)
    fin.setHours(23, 59, 59, 999)

    // Get all incapacidades in the date range
    const incapacidades = await db.incapacidad.findMany({
      where: {
        fechaInicio: { gte: inicio },
        fechaFin: { lte: fin },
      },
      include: {
        empleado: { select: { id: true, name: true, area: true, cargo: true, salary: true } },
        eps: { select: { id: true, nombre: true } },
        cobros: { select: { valorEsperado: true, valorPagado: true, estado: true } },
      },
    })

    // Aggregate stats
    const totalIncapacidades = incapacidades.length
    const totalDiasPerdidos = incapacidades.reduce((sum, inc) => sum + inc.diasIncapacidad, 0)

    // Calculate costo total using IBC formula
    let costoTotal = 0
    let recuperadoTotal = 0

    for (const inc of incapacidades) {
      const valorEsperado = calcularValorEsperado(
        inc.empleado.salary,
        inc.diasIncapacidad,
        inc.tipoNovedad
      )
      costoTotal += valorEsperado

      // Add recovered amounts from cobros
      for (const cobro of inc.cobros) {
        recuperadoTotal += cobro.valorPagado || 0
      }
    }

    // Group by tipoNovedad
    const porTipo: Record<string, { cantidad: number; dias: number; costo: number }> = {}
    for (const inc of incapacidades) {
      if (!porTipo[inc.tipoNovedad]) {
        porTipo[inc.tipoNovedad] = { cantidad: 0, dias: 0, costo: 0 }
      }
      porTipo[inc.tipoNovedad].cantidad++
      porTipo[inc.tipoNovedad].dias += inc.diasIncapacidad
      porTipo[inc.tipoNovedad].costo += calcularValorEsperado(
        inc.empleado.salary,
        inc.diasIncapacidad,
        inc.tipoNovedad
      )
    }

    // Group by EPS
    const porEPS: Record<string, { cantidad: number; dias: number; costo: number; recuperado: number }> = {}
    for (const inc of incapacidades) {
      const epsNombre = inc.eps.nombre
      if (!porEPS[epsNombre]) {
        porEPS[epsNombre] = { cantidad: 0, dias: 0, costo: 0, recuperado: 0 }
      }
      porEPS[epsNombre].cantidad++
      porEPS[epsNombre].dias += inc.diasIncapacidad
      porEPS[epsNombre].costo += calcularValorEsperado(
        inc.empleado.salary,
        inc.diasIncapacidad,
        inc.tipoNovedad
      )
      for (const cobro of inc.cobros) {
        porEPS[epsNombre].recuperado += cobro.valorPagado || 0
      }
    }

    // Group by diagnostico CIE10
    const porDiagnostico: Record<string, { cantidad: number; dias: number }> = {}
    for (const inc of incapacidades) {
      const diag = inc.diagnosticoCIE10 || 'SIN_DIAGNOSTICO'
      if (!porDiagnostico[diag]) {
        porDiagnostico[diag] = { cantidad: 0, dias: 0 }
      }
      porDiagnostico[diag].cantidad++
      porDiagnostico[diag].dias += inc.diasIncapacidad
    }

    // Group by estado
    const porEstado: Record<string, number> = {}
    for (const inc of incapacidades) {
      porEstado[inc.estado] = (porEstado[inc.estado] || 0) + 1
    }

    // Group by area
    const porArea: Record<string, { cantidad: number; dias: number }> = {}
    for (const inc of incapacidades) {
      const area = inc.empleado.area
      if (!porArea[area]) {
        porArea[area] = { cantidad: 0, dias: 0 }
      }
      porArea[area].cantidad++
      porArea[area].dias += inc.diasIncapacidad
    }

    // Extemporaneous count
    const extemporaneas = incapacidades.filter(inc => inc.esReporteExtemporaneo).length

    // Prórrogas count
    const prorrogas = incapacidades.filter(inc => inc.esProrroga).length

    const reporte = {
      periodo: { fechaInicio, fechaFin },
      resumen: {
        totalIncapacidades,
        totalDiasPerdidos,
        costoTotal: Math.round(costoTotal * 100) / 100,
        recuperadoTotal: Math.round(recuperadoTotal * 100) / 100,
        pendienteRecuperar: Math.round((costoTotal - recuperadoTotal) * 100) / 100,
        extemporaneas,
        prorrogas,
        indiceAusentismo: totalDiasPerdidos > 0
          ? Math.round((totalDiasPerdidos / (incapacidades.length * 30)) * 10000) / 100
          : 0,
      },
      porTipo,
      porEPS,
      porDiagnostico,
      porEstado,
      porArea,
    }

    return NextResponse.json({ reporte })
  } catch (error) {
    console.error('Error generating ausentismo report:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
