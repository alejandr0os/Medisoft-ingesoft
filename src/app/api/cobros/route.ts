import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { generateLoteNumero, calcularValorEsperado, canManageCobros } from '@/lib/incapacidades-utils'

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
    const epsId = searchParams.get('epsId')
    const estado = searchParams.get('estado')

    const where: Record<string, unknown> = {}
    if (epsId) where.epsId = epsId
    if (estado) where.estado = estado

    const lotes = await db.loteCobro.findMany({
      where,
      include: {
        eps: { select: { id: true, nombre: true, nit: true } },
        detalles: {
          include: {
            incapacidad: {
              include: {
                empleado: { select: { id: true, name: true, document: true, area: true, salary: true } },
              },
            },
          },
        },
      },
      orderBy: { fechaGeneracion: 'desc' },
    })

    return NextResponse.json({ lotes })
  } catch (error) {
    console.error('Error listing cobros:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!canManageCobros(session.role)) {
      return NextResponse.json({ error: 'No tiene permisos para crear lotes de cobro' }, { status: 403 })
    }

    const body = await request.json()
    const { epsId, incapacidadIds } = body

    if (!epsId || !incapacidadIds || !Array.isArray(incapacidadIds) || incapacidadIds.length === 0) {
      return NextResponse.json(
        { error: 'Campos requeridos: epsId, incapacidadIds (array no vacío)' },
        { status: 400 }
      )
    }

    // Validate EPS
    const eps = await db.ePS.findUnique({ where: { id: epsId } })
    if (!eps) {
      return NextResponse.json({ error: 'EPS no encontrada' }, { status: 404 })
    }

    // Validate all incapacidades exist and are in TRANSCRITA state for this EPS
    const incapacidades = await db.incapacidad.findMany({
      where: {
        id: { in: incapacidadIds },
        epsId,
        estado: 'TRANSCRITA',
      },
      include: {
        empleado: { select: { id: true, name: true, salary: true } },
      },
    })

    if (incapacidades.length !== incapacidadIds.length) {
      const found = incapacidades.map(i => i.id)
      const missing = incapacidadIds.filter((iid: string) => !found.includes(iid))
      return NextResponse.json(
        { error: `Algunas incapacidades no existen, no pertenecen a esta EPS o no están en estado TRANSCRITA. IDs: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    // Generate lote number
    const numeroLote = generateLoteNumero()

    // Calculate valorEsperado for each incapacidad
    let valorTotal = 0
    const detallesData = []

    for (const inc of incapacidades) {
      const valorEsperado = calcularValorEsperado(
        inc.empleado.salary,
        inc.diasIncapacidad,
        inc.tipoNovedad
      )
      valorTotal += valorEsperado
      detallesData.push({
        incapacidadId: inc.id,
        valorEsperado,
        estado: 'PENDIENTE',
      })
    }

    valorTotal = Math.round(valorTotal * 100) / 100

    // Create LoteCobro with details
    const lote = await db.loteCobro.create({
      data: {
        numeroLote,
        epsId,
        estado: 'GENERADO',
        valorTotal,
        detalles: {
          create: detallesData,
        },
      },
      include: {
        eps: { select: { id: true, nombre: true, nit: true } },
        detalles: {
          include: {
            incapacidad: {
              include: {
                empleado: { select: { id: true, name: true, document: true, salary: true } },
              },
            },
          },
        },
      },
    })

    // Update each incapacidad to EN_COBRO
    for (const inc of incapacidades) {
      await db.incapacidad.update({
        where: { id: inc.id },
        data: { estado: 'EN_COBRO', fechaCobro: new Date() },
      })

      await db.historialEstado.create({
        data: {
          incapacidadId: inc.id,
          estadoAnterior: 'TRANSCRITA',
          estadoNuevo: 'EN_COBRO',
          accion: 'INCLUIDA_LOTE_COBRO',
          usuarioId: session.userId,
          observaciones: `Incluida en lote ${numeroLote}`,
        },
      })
    }

    return NextResponse.json({ lote }, { status: 201 })
  } catch (error) {
    console.error('Error creating lote cobro:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
