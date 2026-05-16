// Trazabilidad de incapacidades por radicado o documento

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
    const q = searchParams.get('q')

    if (!q) {
      return NextResponse.json({ eventos: [], incapacidad: null })
    }

    // Search by radicado or employee document
    const incapacidad = await db.incapacidad.findFirst({
      where: {
        OR: [
          { radicado: { contains: q } },
          { empleado: { document: { contains: q } } },
        ],
      },
      include: {
        empleado: { select: { id: true, name: true, document: true, area: true, cargo: true } },
        eps: { select: { id: true, nombre: true } },
        historial: {
          include: { usuario: { select: { id: true, name: true, role: true } } },
          orderBy: { fecha: 'asc' },
        },
      },
    })

    if (!incapacidad) {
      return NextResponse.json({ eventos: [], incapacidad: null })
    }

    const eventos = incapacidad.historial.map(h => ({
      id: h.id,
      accion: h.accion,
      estadoAnterior: h.estadoAnterior,
      estadoNuevo: h.estadoNuevo,
      observaciones: h.observaciones,
      createdAt: h.fecha,
      usuario: h.usuario ? { name: h.usuario.name } : { name: 'Sistema' },
    }))

    return NextResponse.json({
      eventos,
      incapacidad: {
        radicado: incapacidad.radicado,
        empleado: incapacidad.empleado.name,
        eps: incapacidad.eps.nombre,
      },
    })
  } catch (error) {
    console.error('Error en trazabilidad:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}