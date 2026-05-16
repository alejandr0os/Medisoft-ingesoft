// Operaciones sobre una incapacidad especifica

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { id } = await params

    const incapacidad = await db.incapacidad.findUnique({
      where: { id },
      include: {
        empleado: {
          select: { id: true, name: true, document: true, area: true, cargo: true, salary: true, email: true, phone: true },
        },
        eps: { select: { id: true, nombre: true, nit: true, portalWeb: true, contacto: true, email: true } },
        documentos: true,
        historial: {
          include: { usuario: { select: { id: true, name: true, role: true } } },
          orderBy: { fecha: 'desc' },
        },
        seguimientos: {
          include: { usuario: { select: { id: true, name: true, role: true } } },
          orderBy: { fechaGestion: 'desc' },
        },
        subsanaciones: { orderBy: { fechaSolicitud: 'desc' } },
        rechazos: { orderBy: { fechaRechazo: 'desc' } },
        cobroJuridico: true,
        reintegro: true,
        archivo: true,
        derechosPeticion: { orderBy: { createdAt: 'desc' } },
        incapacidadOriginal: {
          select: { id: true, radicado: true, estado: true, fechaInicio: true, fechaFin: true },
        },
        prorrogas: {
          select: { id: true, radicado: true, estado: true, fechaInicio: true, fechaFin: true, diasIncapacidad: true },
        },
        cobros: {
          include: { loteCobro: { select: { id: true, numeroLote: true, estado: true } } },
        },
      },
    })

    if (!incapacidad) {
      return NextResponse.json({ error: 'Incapacidad no encontrada' }, { status: 404 })
    }

    // Role-based check for EMPLEADO
    if (session.role === 'EMPLEADO') {
      const employee = await db.employee.findUnique({
        where: { userId: session.userId },
      })
      if (!employee || employee.id !== incapacidad.empleadoId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    }

    return NextResponse.json({ incapacidad })
  } catch (error) {
    console.error('Error getting incapacidad:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!['AUXILIAR_GH', 'GERENCIA', 'CONTABILIDAD', 'ABOGADO', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'No tiene permisos para actualizar incapacidades' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { estado, observaciones, diagnosticoCIE10, descripcionCIE10, valorCobro } = body

    const incapacidad = await db.incapacidad.findUnique({ where: { id } })
    if (!incapacidad) {
      return NextResponse.json({ error: 'Incapacidad no encontrada' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (observaciones !== undefined) updateData.observaciones = observaciones
    if (diagnosticoCIE10 !== undefined) updateData.diagnosticoCIE10 = diagnosticoCIE10
    if (descripcionCIE10 !== undefined) updateData.descripcionCIE10 = descripcionCIE10
    if (valorCobro !== undefined) updateData.valorCobro = valorCobro

    let estadoChanged = false
    if (estado && estado !== incapacidad.estado) {
      updateData.estado = estado
      estadoChanged = true

      // Set corresponding dates
      if (estado === 'VALIDADA') updateData.fechaValidacion = new Date()
      if (estado === 'TRANSCRITA') updateData.fechaTranscripcion = new Date()
      if (estado === 'EN_COBRO') updateData.fechaCobro = new Date()
      if (estado === 'PAGADA') updateData.fechaPago = new Date()
      if (estado === 'ARCHIVADA') updateData.fechaArchivo = new Date()
    }

    const updated = await db.incapacidad.update({
      where: { id },
      data: updateData,
    })

    // Create HistorialEstado entry on estado change
    if (estadoChanged) {
      await db.historialEstado.create({
        data: {
          incapacidadId: id,
          estadoAnterior: incapacidad.estado,
          estadoNuevo: estado,
          accion: `CAMBIO_ESTADO_${estado}`,
          usuarioId: session.userId,
          observaciones: observaciones || `Cambio de estado: ${incapacidad.estado} a ${estado}`,
        },
      })
    } else if (observaciones) {
      // Log observation even without state change
      await db.historialEstado.create({
        data: {
          incapacidadId: id,
          estadoAnterior: incapacidad.estado,
          estadoNuevo: incapacidad.estado,
          accion: 'OBSERVACION',
          usuarioId: session.userId,
          observaciones,
        },
      })
    }

    return NextResponse.json({ incapacidad: updated })
  } catch (error) {
    console.error('Error updating incapacidad:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
