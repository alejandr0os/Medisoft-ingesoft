// Flujo de archivo documental

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
    const { accion, observaciones, documentacionCompleta, historiaClinicaDestruida } = body

    const incapacidad = await db.incapacidad.findUnique({ where: { id } })
    if (!incapacidad) {
      return NextResponse.json({ error: 'Incapacidad no encontrada' }, { status: 404 })
    }

    if (accion === 'INICIAR') {
      const existing = await db.archivo.findUnique({ where: { incapacidadId: id } })
      if (existing) {
        return NextResponse.json({ error: 'Ya existe un registro de archivo' }, { status: 400 })
      }

      const validStates = ['PAGADA', 'RECHAZADA_ENTIDAD', 'ARCHIVADA', 'TRAMITE_PENSION']
      if (!validStates.includes(incapacidad.estado)) {
        return NextResponse.json({ error: 'Solo se pueden archivar incapacidades en estado PAGADA, RECHAZADA_ENTIDAD, TRAMITE_PENSION o ARCHIVADA' }, { status: 400 })
      }

      const archivo = await db.$transaction(async (tx) => {
        const arch = await tx.archivo.create({
          data: {
            incapacidadId: id,
            estado: 'PENDIENTE',
            documentacionCompleta: documentacionCompleta ?? true,
            observaciones: observaciones || null,
          },
        })

        await tx.historialEstado.create({
          data: {
            incapacidadId: id,
            estadoAnterior: incapacidad.estado,
            estadoNuevo: incapacidad.estado,
            accion: 'ARCHIVO_INICIADO',
            usuarioId: session.userId,
            observaciones: documentacionCompleta ? 'Documentacion completa, lista para archivo' : 'Documentacion incompleta',
          },
        })

        return arch
      })

      return NextResponse.json({ archivo }, { status: 201 })
    }

    if (accion === 'ENVIAR_GESTION_DOCUMENTAL') {
      const archivo = await db.archivo.findUnique({ where: { incapacidadId: id } })
      if (!archivo) {
        return NextResponse.json({ error: 'No existe registro de archivo' }, { status: 404 })
      }
      if (archivo.estado !== 'PENDIENTE') {
        return NextResponse.json({ error: 'El archivo debe estar en estado PENDIENTE para enviar a Gestion Documental' }, { status: 400 })
      }

      const updated = await db.$transaction(async (tx) => {
        const arch = await tx.archivo.update({
          where: { incapacidadId: id },
          data: {
            estado: 'ENVIADO',
            fechaEnvioGestionDocumental: new Date(),
            enviadoPor: session.userId,
            historiaClinicaDestruida: historiaClinicaDestruida ?? false,
            observaciones: observaciones || undefined,
          },
        })

        await tx.historialEstado.create({
          data: {
            incapacidadId: id,
            estadoAnterior: incapacidad.estado,
            estadoNuevo: incapacidad.estado,
            accion: 'ARCHIVO_ENVIADO_GD',
            usuarioId: session.userId,
            observaciones: 'Enviado a Gestion Documental',
          },
        })

        return arch
      })

      return NextResponse.json({ archivo: updated })
    }

    if (accion === 'COMPLETAR') {
      const archivo = await db.archivo.findUnique({ where: { incapacidadId: id } })
      if (!archivo) {
        return NextResponse.json({ error: 'No existe registro de archivo' }, { status: 404 })
      }
      if (archivo.estado !== 'ENVIADO') {
        return NextResponse.json({ error: 'El archivo debe estar en estado ENVIADO para completar' }, { status: 400 })
      }

      const updated = await db.$transaction(async (tx) => {
        const arch = await tx.archivo.update({
          where: { incapacidadId: id },
          data: {
            estado: 'COMPLETADO',
            historiaClinicaDestruida: historiaClinicaDestruida ?? true,
            observaciones: observaciones || undefined,
          },
        })

        const estadoAnterior = incapacidad.estado
        await tx.incapacidad.update({
          where: { id },
          data: { estado: 'ARCHIVADA', fechaArchivo: new Date() },
        })

        await tx.historialEstado.create({
          data: {
            incapacidadId: id,
            estadoAnterior,
            estadoNuevo: 'ARCHIVADA',
            accion: 'ARCHIVO_COMPLETADO',
            usuarioId: session.userId,
            observaciones: 'Incapacidad archivada. Historia clinica destruida segun normativa.',
          },
        })

        return arch
      })

      return NextResponse.json({ archivo: updated })
    }

    return NextResponse.json({ error: 'Accion no valida' }, { status: 400 })
  } catch (error) {
    console.error('Error en archivo:', error)
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
    const archivo = await db.archivo.findUnique({ where: { incapacidadId: id } })
    return NextResponse.json({ archivo })
  } catch (error) {
    console.error('Error fetching archivo:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}