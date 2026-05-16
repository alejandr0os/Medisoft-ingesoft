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
    const radicado = searchParams.get('radicado')
    const empleadoId = searchParams.get('empleadoId')
    const incapacidadId = searchParams.get('incapacidadId')

    if (!radicado && !empleadoId && !incapacidadId) {
      return NextResponse.json(
        { error: 'Proporcione al menos un filtro: radicado, empleadoId o incapacidadId' },
        { status: 400 }
      )
    }

    // Find the incapacidad/in capacities
    const where: Record<string, unknown> = {}
    if (radicado) where.radicado = radicado
    if (incapacidadId) where.id = incapacidadId
    if (empleadoId) where.empleadoId = empleadoId

    const incapacidades = await db.incapacidad.findMany({
      where,
      include: {
        empleado: { select: { id: true, name: true, document: true, area: true, cargo: true } },
        eps: { select: { id: true, nombre: true, nit: true } },
        historial: {
          include: {
            usuario: { select: { id: true, name: true, role: true } },
          },
          orderBy: { fecha: 'asc' },
        },
        seguimientos: {
          include: {
            usuario: { select: { id: true, name: true, role: true } },
          },
          orderBy: { fechaGestion: 'asc' },
        },
        documentos: { select: { id: true, tipoDocumento: true, nombreArchivo: true, createdAt: true, aprobado: true } },
        subsanaciones: true,
        rechazos: true,
        cobroJuridico: true,
        reintegro: true,
        archivo: true,
        derechosPeticion: true,
        cobros: {
          include: { loteCobro: { select: { numeroLote: true, estado: true } } },
        },
        incapacidadOriginal: {
          select: { id: true, radicado: true, estado: true },
        },
        prorrogas: {
          select: { id: true, radicado: true, estado: true, diasIncapacidad: true },
        },
      },
      orderBy: { fechaRegistro: 'desc' },
    })

    if (incapacidades.length === 0) {
      return NextResponse.json({ error: 'No se encontraron incapacidades con los filtros proporcionados' }, { status: 404 })
    }

    // Build trazabilidad timeline for each incapacidad
    const trazabilidad = incapacidades.map(inc => {
      // Combine historial and seguimientos into a single timeline
      const timeline = [
        ...inc.historial.map(h => ({
          tipo: 'CAMBIO_ESTADO' as const,
          fecha: h.fecha,
          accion: h.accion,
          detalle: `${h.estadoAnterior || 'Inicio'} a ${h.estadoNuevo}`,
          usuario: h.usuario ? { name: h.usuario.name, role: h.usuario.role } : null,
          observaciones: h.observaciones,
        })),
        ...inc.seguimientos.map(s => ({
          tipo: 'SEGUIMIENTO' as const,
          fecha: s.fechaGestion,
          accion: s.accion,
          detalle: s.tipoAlerta ? `Alerta: ${s.tipoAlerta}` : '',
          usuario: s.usuario ? { name: s.usuario.name, role: s.usuario.role } : null,
          observaciones: s.observaciones,
        })),
      ].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

      return {
        incapacidad: {
          id: inc.id,
          radicado: inc.radicado,
          estado: inc.estado,
          tipoNovedad: inc.tipoNovedad,
          fechaInicio: inc.fechaInicio,
          fechaFin: inc.fechaFin,
          diasIncapacidad: inc.diasIncapacidad,
          esProrroga: inc.esProrroga,
          esReporteExtemporaneo: inc.esReporteExtemporaneo,
          empleado: inc.empleado,
          eps: inc.eps,
        },
        timeline,
        documentos: inc.documentos,
        subsanaciones: inc.subsanaciones,
        rechazos: inc.rechazos,
        cobroJuridico: inc.cobroJuridico,
        reintegro: inc.reintegro,
        archivo: inc.archivo,
        derechosPeticion: inc.derechosPeticion,
        cobros: inc.cobros,
        incapacidadOriginal: inc.incapacidadOriginal,
        prorrogas: inc.prorrogas,
      }
    })

    return NextResponse.json({ trazabilidad })
  } catch (error) {
    console.error('Error getting trazabilidad:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
