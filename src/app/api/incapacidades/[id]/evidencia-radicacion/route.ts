// Registro de evidencia de radicacion EPS

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!['AUXILIAR_GH', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'No tiene permisos' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { metodoRadicacion, numeroRadicadoEPS, soporteUrl, portalUrl, observaciones } = body

    if (!metodoRadicacion) {
      return NextResponse.json({ error: 'metodoRadicacion es requerido' }, { status: 400 })
    }

    const metodoValido = ['PORTAL_WEB', 'CORREO', 'FISICO'].includes(metodoRadicacion)
    if (!metodoValido) {
      return NextResponse.json({ error: 'metodoRadicacion debe ser PORTAL_WEB, CORREO o FISICO' }, { status: 400 })
    }

    const incapacidad = await db.incapacidad.findUnique({ where: { id } })
    if (!incapacidad) {
      return NextResponse.json({ error: 'Incapacidad no encontrada' }, { status: 404 })
    }

    const evidencia = await db.evidenciaRadicacion.create({
      data: {
        incapacidadId: id,
        metodoRadicacion,
        numeroRadicadoEPS: numeroRadicadoEPS || null,
        soporteUrl: soporteUrl || null,
        portalUrl: portalUrl || null,
        observaciones: observaciones || null,
        radicadoPor: session.userId,
      },
    })

    await db.historialEstado.create({
      data: {
        incapacidadId: id,
        estadoAnterior: incapacidad.estado,
        estadoNuevo: incapacidad.estado,
        accion: 'EVIDENCIA_RADICACION',
        usuarioId: session.userId,
        observaciones: `Evidencia de radicacion registrada. Metodo: ${metodoRadicacion}. Radicado EPS: ${numeroRadicadoEPS || 'N/A'}`,
      },
    })

    return NextResponse.json({ evidencia }, { status: 201 })
  } catch (error) {
    console.error('Error creating evidencia:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id } = await params
    const evidencias = await db.evidenciaRadicacion.findMany({
      where: { incapacidadId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ evidencias })
  } catch (error) {
    console.error('Error fetching evidencias:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}