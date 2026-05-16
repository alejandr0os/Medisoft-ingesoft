import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { addBusinessDays, canValidate } from '@/lib/incapacidades-utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!canValidate(session.role)) {
      return NextResponse.json({ error: 'No tiene permisos para validar incapacidades' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { accion, observaciones } = body

    if (!accion || !['aprobar', 'subsanar'].includes(accion)) {
      return NextResponse.json({ error: 'Acción inválida. Use "aprobar" o "subsanar"' }, { status: 400 })
    }

    const incapacidad = await db.incapacidad.findUnique({
      where: { id },
      include: { documentos: true },
    })
    if (!incapacidad) {
      return NextResponse.json({ error: 'Incapacidad no encontrada' }, { status: 404 })
    }

    // Only validate incapacidades in valid states
    if (!['RECIBIDA', 'PENDIENTE_VALIDACION', 'PENDIENTE_SUBSANACION'].includes(incapacidad.estado)) {
      return NextResponse.json(
        { error: `No se puede validar una incapacidad en estado ${incapacidad.estado}` },
        { status: 400 }
      )
    }

    const estadoAnterior = incapacidad.estado

    if (accion === 'aprobar') {
      const updated = await db.$transaction(async (tx) => {
        const incap = await tx.incapacidad.update({
          where: { id },
          data: {
            estado: 'VALIDADA',
            fechaValidacion: new Date(),
          },
        })

        await tx.historialEstado.create({
          data: {
            incapacidadId: id,
            estadoAnterior,
            estadoNuevo: 'VALIDADA',
            accion: 'VALIDACION_APROBADA',
            usuarioId: session.userId,
            observaciones: observaciones || 'Documentación validada correctamente',
          },
        })

        return incap
      })

      const employee = await db.employee.findUnique({ where: { id: incapacidad.empleadoId } })
      if (employee) {
        await db.notification.create({
          data: {
            userId: employee.userId,
            tipo: 'ESTADO_CHANGE',
            titulo: 'Incapacidad validada',
            mensaje: `Su incapacidad ${incapacidad.radicado} ha sido validada exitosamente`,
            enlace: `/incapacidades/${id}`,
          },
        })
      }

      return NextResponse.json({ incapacidad: updated, message: 'Incapacidad validada exitosamente' })
    }

    // accion === 'subsanar'
    // Get documents that are not approved
    const documentosFaltantes = incapacidad.documentos
      .filter(d => !d.aprobado)
      .map(d => d.tipoDocumento)
      .join(', ') || 'Documentos pendientes'

    const fechaLimite = addBusinessDays(new Date(), 3)

    const updated = await db.$transaction(async (tx) => {
      const incap = await tx.incapacidad.update({
        where: { id },
        data: { estado: 'PENDIENTE_SUBSANACION' },
      })

      await tx.subsanacion.create({
        data: {
          incapacidadId: id,
          fechaLimite,
          documentosFaltantes,
          estado: 'PENDIENTE',
          observaciones: observaciones || null,
        },
      })

      await tx.historialEstado.create({
        data: {
          incapacidadId: id,
          estadoAnterior,
          estadoNuevo: 'PENDIENTE_SUBSANACION',
          accion: 'SOLICITUD_SUBSANACION',
          usuarioId: session.userId,
          observaciones: observaciones || `Subsanación solicitada. Fecha límite: ${fechaLimite.toISOString().split('T')[0]}`,
        },
      })

      return incap
    })

    const emp = await db.employee.findUnique({ where: { id: incapacidad.empleadoId } })
    if (emp) {
      await db.notification.create({
        data: {
          userId: emp.userId,
          tipo: 'ALERTA',
          titulo: 'Subsanación requerida',
          mensaje: `Su incapacidad ${incapacidad.radicado} requiere subsanación. Fecha límite: ${fechaLimite.toISOString().split('T')[0]}`,
          enlace: `/incapacidades/${id}`,
        },
      })
    }

    return NextResponse.json({
      incapacidad: updated,
      message: 'Subsanación solicitada',
      fechaLimite: fechaLimite.toISOString(),
    })
  } catch (error) {
    console.error('Error validating incapacidad:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
