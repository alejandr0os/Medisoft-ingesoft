import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads')

const VALID_TIPOS = [
  'CERTIFICADO_ORIGINAL',
  'EPICRISIS',
  'FURIPS',
  'CERTIFICADO_NACIDO_VIVO',
  'REGISTRO_CIVIL',
  'DOCUMENTO_IDENTIDAD',
  'CERTIFICADO_MEDICO',
  'SOPORTE_RADICACION',
  'OTRO',
]

const VALID_FORMATS = ['PDF', 'JPG', 'JPEG', 'PNG']

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

function getFormatFromMimeType(mimeType: string): string | null {
  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'image/jpeg': 'JPG',
    'image/jpg': 'JPG',
    'image/png': 'PNG',
  }
  return map[mimeType] || null
}

function getFormatFromExtension(filename: string): string | null {
  const ext = filename.split('.').pop()?.toUpperCase() || ''
  if (['PDF', 'JPG', 'JPEG', 'PNG'].includes(ext)) {
    return ext === 'JPEG' ? 'JPG' : ext
  }
  return null
}

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
      select: { id: true, empleadoId: true },
    })

    if (!incapacidad) {
      return NextResponse.json({ error: 'Incapacidad no encontrada' }, { status: 404 })
    }

    // EMPLEADO can only see their own
    if (session.role === 'EMPLEADO') {
      const employee = await db.employee.findUnique({ where: { userId: session.userId } })
      if (!employee || employee.id !== incapacidad.empleadoId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    }

    const documentos = await db.documento.findMany({
      where: { incapacidadId: id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ documentos })
  } catch (error) {
    console.error('Error listing documentos:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!['AUXILIAR_GH', 'ADMIN', 'EMPLEADO'].includes(session.role)) {
      return NextResponse.json({ error: 'No tiene permisos para subir documentos' }, { status: 403 })
    }

    const { id } = await params

    // Verify the incapacidad exists
    const incapacidad = await db.incapacidad.findUnique({
      where: { id },
      select: { id: true, empleadoId: true },
    })
    if (!incapacidad) {
      return NextResponse.json({ error: 'Incapacidad no encontrada' }, { status: 404 })
    }

    // EMPLEADO can only upload to their own incapacidades
    if (session.role === 'EMPLEADO') {
      const employee = await db.employee.findUnique({ where: { userId: session.userId } })
      if (!employee || employee.id !== incapacidad.empleadoId) {
        return NextResponse.json({ error: 'No autorizado para subir documentos a esta incapacidad' }, { status: 403 })
      }
    }

    // Parse the content type to determine if it's multipart or JSON
    const contentType = request.headers.get('content-type') || ''
    let tipoDocumento: string
    let nombreArchivo: string
    let formato: string
    let pesoKB: number
    let obligatorio: boolean = true
    let observaciones: string | null = null
    let savedFilePath: string | null = null

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload via multipart/form-data
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      tipoDocumento = formData.get('tipoDocumento') as string || ''
      obligatorio = formData.get('obligatorio') !== 'false'
      observaciones = (formData.get('observaciones') as string) || null

      if (!tipoDocumento) {
        return NextResponse.json(
          { error: 'Campo requerido: tipoDocumento' },
          { status: 400 }
        )
      }

      if (!VALID_TIPOS.includes(tipoDocumento)) {
        return NextResponse.json({ error: 'tipoDocumento inválido' }, { status: 400 })
      }

      if (file && file.size > 0) {
        // Real file upload
        if (file.size > MAX_FILE_SIZE_BYTES) {
          return NextResponse.json(
            { error: `El archivo excede el tamaño máximo permitido (${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB)` },
            { status: 400 }
          )
        }

        nombreArchivo = file.name

        // Determine format from MIME type, fallback to extension
        formato = getFormatFromMimeType(file.type) || getFormatFromExtension(nombreArchivo) || ''

        if (!formato || !VALID_FORMATS.includes(formato)) {
          return NextResponse.json(
            { error: `Formato de archivo no soportado. Formatos permitidos: ${VALID_FORMATS.join(', ')}` },
            { status: 400 }
          )
        }

        // Calculate size in KB
        pesoKB = Math.ceil(file.size / 1024)

        // Create the upload directory if it doesn't exist
        const uploadDir = path.join(UPLOADS_DIR, id)
        await mkdir(uploadDir, { recursive: true })

        // Generate unique filename with timestamp
        const timestamp = Date.now()
        const safeFilename = nombreArchivo.replace(/[^a-zA-Z0-9._-]/g, '_')
        const savedFilename = `${timestamp}_${safeFilename}`
        const fullFilePath = path.join(uploadDir, savedFilename)

        // Write the file to disk
        const fileBuffer = Buffer.from(await file.arrayBuffer())
        await writeFile(fullFilePath, fileBuffer)

        // Store path relative to public/ for web access
        savedFilePath = `/uploads/${id}/${savedFilename}`
      } else {
        // No file provided - metadata-only upload fallback
        nombreArchivo = (formData.get('nombreArchivo') as string) || ''
        formato = (formData.get('formato') as string) || ''
        const pesoKBStr = formData.get('pesoKB') as string | null

        if (!nombreArchivo || !formato) {
          return NextResponse.json(
            { error: 'Campos requeridos para metadata: nombreArchivo, formato' },
            { status: 400 }
          )
        }

        if (!VALID_FORMATS.includes(formato.toUpperCase())) {
          return NextResponse.json(
            { error: `Formato no soportado. Permitidos: ${VALID_FORMATS.join(', ')}` },
            { status: 400 }
          )
        }

        formato = formato.toUpperCase()
        pesoKB = pesoKBStr ? parseInt(pesoKBStr, 10) : 0

        if (isNaN(pesoKB) || pesoKB < 0) {
          pesoKB = 0
        }

        savedFilePath = `/uploads/${id}/${nombreArchivo}`
      }
    } else {
      // Handle JSON body (metadata-only fallback for backward compatibility)
      const body = await request.json()
      tipoDocumento = body.tipoDocumento
      nombreArchivo = body.nombreArchivo
      formato = body.formato
      pesoKB = body.pesoKB
      obligatorio = body.obligatorio !== undefined ? body.obligatorio : true
      observaciones = body.observaciones || null

      if (!tipoDocumento || !nombreArchivo || !formato || pesoKB === undefined) {
        return NextResponse.json(
          { error: 'Campos requeridos: tipoDocumento, nombreArchivo, formato, pesoKB' },
          { status: 400 }
        )
      }

      if (!VALID_TIPOS.includes(tipoDocumento)) {
        return NextResponse.json({ error: 'tipoDocumento inválido' }, { status: 400 })
      }

      if (!VALID_FORMATS.includes(formato.toUpperCase())) {
        return NextResponse.json(
          { error: `Formato no soportado. Permitidos: ${VALID_FORMATS.join(', ')}` },
          { status: 400 }
        )
      }

      formato = formato.toUpperCase()
      savedFilePath = `/uploads/${id}/${nombreArchivo}`
    }

    // Create the document record in the database
    const documento = await db.documento.create({
      data: {
        incapacidadId: id,
        tipoDocumento,
        nombreArchivo,
        rutaArchivo: savedFilePath || `/uploads/${id}/${nombreArchivo}`,
        formato,
        pesoKB,
        obligatorio,
        observaciones,
      },
    })

    // Check if this is a subsanacion upload - if incapacidad is PENDIENTE_SUBSANACION, notify GH
    const incapacidadActual = await db.incapacidad.findUnique({
      where: { id },
      select: { 
        estado: true, 
        radicado: true, 
        empleadoId: true,
        empleado: { select: { name: true } }
      },
    })

    if (incapacidadActual?.estado === 'PENDIENTE_SUBSANACION') {
      // Notify AUXILIAR_GH users that subsanacion documents have been submitted
      try {
        const auxiliares = await db.user.findMany({
          where: { role: 'AUXILIAR_GH', active: true },
        })
        for (const aux of auxiliares) {
          await db.notification.create({
            data: {
              userId: aux.id,
              tipo: 'ESTADO_CHANGE',
              titulo: 'Documentos de subsanación recibidos',
              mensaje: `Se han recibido documentos de subsanación para la incapacidad ${incapacidadActual.radicado} del empleado ${incapacidadActual.empleado?.name || 'desconocido'}`,
              enlace: `/incapacidades/${id}`,
            },
          })
        }
      } catch (notifError) {
        console.error('Error creating subsanacion notification:', notifError)
        // Don't block the upload if notifications fail
      }
    }

    return NextResponse.json({ documento }, { status: 201 })
  } catch (error) {
    console.error('Error uploading documento:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
