// CRUD de incapacidades

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import {
  generateRadicado,
  addBusinessDays,
  isMoreThanBusinessDaysAfter,
  canViewAll,
} from '@/lib/incapacidades-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado')
    const empleadoId = searchParams.get('empleadoId')
    const epsId = searchParams.get('epsId')
    const tipoNovedad = searchParams.get('tipoNovedad')
    const groupBy = searchParams.get('groupBy')
    const q = searchParams.get('q')

    if (groupBy === 'eps') {
      const epsList = await db.ePS.findMany({ orderBy: { nombre: 'asc' } })
      const epsSaldos: any[] = []
      for (const eps of epsList) {
        const incs = await db.incapacidad.findMany({
          where: { epsId: eps.id, estado: { in: ['EN_COBRO', 'COBRO_PERSUASIVO', 'COBRO_JURIDICO'] } },
          include: {
            empleado: { select: { id: true, name: true, document: true, area: true, cargo: true } },
          },
        })
        const totalCobrado = incs.reduce((s, i) => s + (i.valorCobro || 0), 0)
        const totalPagado = incs.reduce((s, i) => s + (i.valorPagado || 0), 0)
        if (incs.length > 0) {
          epsSaldos.push({
            epsId: eps.id,
            epsNombre: eps.nombre,
            totalCobrado,
            totalPagado,
            saldoPendiente: totalCobrado - totalPagado,
            incapacidades: incs,
          })
        }
      }
      return NextResponse.json({ epsSaldos })
    }

    const misIncapacidades = searchParams.get('misIncapacidades') === 'true'

    // Build where clause
    const where: Record<string, unknown> = {}

    // Role-based filtering or personal request
    if (misIncapacidades || session.role === 'EMPLEADO') {
      const employee = await db.employee.findUnique({
        where: { userId: session.userId },
      })
      if (!employee) {
        return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })
      }
      where.empleadoId = employee.id
    } else if (session.role === 'AUXILIAR_GH') {
      where.estado = { not: 'ARCHIVADA' }
    }

    // Apply filters
    if (estado) where.estado = estado
    if (empleadoId && canViewAll(session.role)) where.empleadoId = empleadoId
    if (epsId) where.epsId = epsId
    if (tipoNovedad) where.tipoNovedad = tipoNovedad
    if (q) {
      where.OR = [
        { radicado: { contains: q } },
        { empleado: { name: { contains: q } } },
        { empleado: { document: { contains: q } } },
      ]
    }

    const incapacidades = await db.incapacidad.findMany({
      where,
      include: {
        empleado: {
          select: { id: true, name: true, document: true, area: true, cargo: true, salary: true },
        },
        eps: { select: { id: true, nombre: true, nit: true } },
        subsanaciones: { orderBy: { fechaSolicitud: 'desc' } },
        documentos: { select: { id: true, tipoDocumento: true, nombreArchivo: true, formato: true, aprobado: true, obligatorio: true } },
      },
      orderBy: { fechaRegistro: 'desc' },
    })

    return NextResponse.json({ incapacidades })
  } catch (error) {
    console.error('Error listing incapacidades:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    const body = await request.json()

    // EMPLEADO can create their own, others can create for anyone
    let empleadoId: string | null = null
    let epsId: string | null = null

    if (session.role === 'EMPLEADO') {
      const employee = await db.employee.findUnique({ where: { userId: session.userId } })
      if (!employee) {
        return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })
      }
      empleadoId = employee.id
      epsId = employee.epsId
    } else {
      empleadoId = body.empleadoId
      epsId = body.epsId
    }

    const {
      tipoNovedad,
      fechaInicio,
      fechaFin,
      diasIncapacidad,
      diagnosticoCIE10,
      descripcionCIE10,
      incapacidadOriginalId,
      observaciones,
    } = body

    // Validate required fields
    if (!empleadoId || !epsId || !tipoNovedad || !fechaInicio || !fechaFin || !diasIncapacidad) {
      return NextResponse.json(
        { error: 'Campos requeridos: tipoNovedad, fechaInicio, fechaFin, diasIncapacidad' },
        { status: 400 }
      )
    }

    const validTiposNovedad = [
      'ENFERMEDAD_COMUN',
      'ACCIDENTE_TRANSITO',
      'ACCIDENTE_TRABAJO',
      'LICENCIA_MATERNIDAD',
      'LICENCIA_PATERNIDAD',
      'PRORROGA',
    ]
    if (!validTiposNovedad.includes(tipoNovedad)) {
      return NextResponse.json({ error: 'tipoNovedad inválido' }, { status: 400 })
    }

    // Validate empleado exists
    const empleado = await db.employee.findUnique({ where: { id: empleadoId } })
    if (!empleado) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })
    }

    // Validate EPS exists
    const eps = await db.ePS.findUnique({ where: { id: epsId } })
    if (!eps) {
      return NextResponse.json({ error: 'EPS no encontrada' }, { status: 404 })
    }

    // Handle prórroga
    let esProrroga = false
    let diasAcumulados = diasIncapacidad
    if (tipoNovedad === 'PRORROGA') {
      if (!incapacidadOriginalId) {
        return NextResponse.json(
          { error: 'incapacidadOriginalId es requerido para prórrogas' },
          { status: 400 }
        )
      }
      const original = await db.incapacidad.findUnique({
        where: { id: incapacidadOriginalId },
      })
      if (!original) {
        return NextResponse.json({ error: 'Incapacidad original no encontrada' }, { status: 404 })
      }
      esProrroga = true
      diasAcumulados = original.diasAcumulados + diasIncapacidad
    }

    // Generate radicado
    const radicado = generateRadicado()

    // Check for extemporaneous report (>2 business days)
    const fechaRegistro = new Date()
    const fechaInicioDate = new Date(fechaInicio)
    const esReporteExtemporaneo = isMoreThanBusinessDaysAfter(fechaInicioDate, fechaRegistro, 2)

    // Create incapacidad with transaction for consistency
    let incapacidad
    try {
      incapacidad = await db.$transaction(async (tx) => {
        // Create the incapacidad
        const newInc = await tx.incapacidad.create({
          data: {
            radicado,
            empleadoId,
            epsId,
            tipoNovedad,
            estado: 'RECIBIDA',
            fechaInicio: new Date(fechaInicio),
            fechaFin: new Date(fechaFin),
            diasIncapacidad,
            diasAcumulados,
            diagnosticoCIE10: diagnosticoCIE10 || null,
            descripcionCIE10: descripcionCIE10 || null,
            esReporteExtemporaneo,
            esProrroga,
            incapacidadOriginalId: tipoNovedad === 'PRORROGA' ? incapacidadOriginalId : null,
            observaciones: observaciones || null,
          },
        })

        // Create HistorialEstado entry
        await tx.historialEstado.create({
          data: {
            incapacidadId: newInc.id,
            estadoAnterior: null,
            estadoNuevo: 'RECIBIDA',
            accion: 'CREACION',
            usuarioId: session.userId,
            observaciones: 'Incapacidad creada',
          },
        })

        return newInc
      })

      // Create notifications (outside transaction to not block incapacidad creation if notification fails)
      try {
        const auxiliares = await db.user.findMany({
          where: { role: 'AUXILIAR_GH', active: true },
        })
        for (const aux of auxiliares) {
          await db.notification.create({
            data: {
              userId: aux.id,
              tipo: 'ESTADO_CHANGE',
              titulo: 'Nueva incapacidad registrada',
              mensaje: `Se ha registrado la incapacidad ${radicado} para ${empleado.name}`,
              enlace: `/incapacidades/${incapacidad.id}`,
            },
          })
        }
      } catch (notifError) {
        console.error('Error creating notifications:', notifError)
        // Don't throw - notifications are not critical to the incapacidad creation
      }
    } catch (txError) {
      console.error('Error in incapacidad transaction:', txError)
      throw txError
    }

    // Fetch with relations
    const result = await db.incapacidad.findUnique({
      where: { id: incapacidad.id },
      include: {
        empleado: { select: { id: true, name: true, document: true, area: true, cargo: true, salary: true } },
        eps: { select: { id: true, nombre: true, nit: true } },
        documentos: { select: { id: true, tipoDocumento: true, nombreArchivo: true, formato: true, aprobado: true, obligatorio: true } },
        historial: { include: { usuario: { select: { id: true, name: true, role: true } } }, orderBy: { fecha: 'desc' } },
      },
    })

    return NextResponse.json({ incapacidad: result }, { status: 201 })
  } catch (error) {
    console.error('Error creating incapacidad:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
