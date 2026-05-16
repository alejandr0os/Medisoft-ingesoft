import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!['AUXILIAR_GH', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'No tiene permisos para enviar recordatorios' }, { status: 403 })
    }

    const body = await request.json()
    const { incapacidadId } = body

    const where: Record<string, unknown> = { estado: 'PENDIENTE' }

    // If specific incapacidadId provided, filter to that one
    if (incapacidadId) {
      where.incapacidadId = incapacidadId
    }

    // Find all PENDIENTE subsanaciones
    const subsanaciones = await db.subsanacion.findMany({
      where,
      include: {
        incapacidad: {
          include: {
            empleado: { select: { id: true, name: true, userId: true } },
          },
        },
      },
    })

    const now = new Date()
    const recordatoriosEnviados: string[] = []
    const yaVencidas: string[] = []

    for (const sub of subsanaciones) {
      const diasRestantes = Math.ceil(
        (sub.fechaLimite.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Skip if already expired - should be marked as VENCIDA
      if (diasRestantes < 0) {
        yaVencidas.push(sub.incapacidad.radicado)
        // Auto-mark as VENCIDA
        await db.subsanacion.update({
          where: { id: sub.id },
          data: { estado: 'VENCIDA', fechaRespuesta: now },
        })
        await db.incapacidad.update({
          where: { id: sub.incapacidadId },
          data: { estado: 'SUBSANACION_VENCIDA' },
        })
        await db.historialEstado.create({
          data: {
            incapacidadId: sub.incapacidadId,
            estadoAnterior: 'PENDIENTE_SUBSANACION',
            estadoNuevo: 'SUBSANACION_VENCIDA',
            accion: 'SUBSANACION_VENCIDA_AUTO',
            usuarioId: session.userId,
            observaciones: 'Subsanación vencida automáticamente por sistema de recordatorios',
          },
        })
        continue
      }

      // Send reminder for subsanaciones near deadline (3 days or less) or all if specifically requested
      if (incapacidadId || diasRestantes <= 3) {
        // Increment recordatorios counter
        await db.subsanacion.update({
          where: { id: sub.id },
          data: { recordatoriosEnviados: { increment: 1 } },
        })

        // Create notification for the employee
        await db.notification.create({
          data: {
            userId: sub.incapacidad.empleado.userId,
            tipo: 'RECORDATORIO',
            titulo: 'Recordatorio de subsanación',
            mensaje: `Tiene ${diasRestantes} día(s) para completar la subsanación de la incapacidad ${sub.incapacidad.radicado}. Fecha límite: ${sub.fechaLimite.toISOString().split('T')[0]}`,
            enlace: `/incapacidades/${sub.incapacidadId}`,
          },
        })

        // Add seguimiento
        await db.seguimiento.create({
          data: {
            incapacidadId: sub.incapacidadId,
            usuarioId: session.userId,
            accion: 'RECORDATORIO_SUBSANACION',
            observaciones: `Recordatorio enviado (${sub.recordatoriosEnviados + 1}). Días restantes: ${diasRestantes}`,
          },
        })

        recordatoriosEnviados.push(sub.incapacidad.radicado)
      }
    }

    return NextResponse.json({
      message: 'Recordatorios procesados',
      recordatoriosEnviados: recordatoriosEnviados.length,
      vencidasAutomaticamente: yaVencidas.length,
      detalles: {
        enviados: recordatoriosEnviados,
        vencidas: yaVencidas,
      },
    })
  } catch (error) {
    console.error('Error sending reminders:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
