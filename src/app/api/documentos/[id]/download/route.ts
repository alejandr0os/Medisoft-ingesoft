import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { readFile, stat } from 'fs/promises'
import path from 'path'

const PUBLIC_DIR = path.join(process.cwd(), 'public')

const MIME_TYPES: Record<string, string> = {
  PDF: 'application/pdf',
  JPG: 'image/jpeg',
  JPEG: 'image/jpeg',
  PNG: 'image/png',
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

    // Fetch the document record
    const documento = await db.documento.findUnique({
      where: { id },
      include: {
        incapacidad: {
          select: { id: true, empleadoId: true },
        },
      },
    })

    if (!documento) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    // Permission check: EMPLEADO can only download their own documents
    if (session.role === 'EMPLEADO') {
      const employee = await db.employee.findUnique({
        where: { userId: session.userId },
      })
      if (!employee || employee.id !== documento.incapacidad.empleadoId) {
        return NextResponse.json({ error: 'No autorizado para acceder a este documento' }, { status: 403 })
      }
    }

    // GERENCIA, CONTABILIDAD, ABOGADO can view documents (read-only roles)
    // AUXILIAR_GH and ADMIN have full access
    // No additional check needed for these roles

    // Resolve the file path on disk
    const rutaArchivo = documento.rutaArchivo
    const filePath = path.join(PUBLIC_DIR, rutaArchivo)

    // Security: ensure the resolved path is within the public/uploads directory
    const resolvedPath = path.resolve(filePath)
    const allowedBase = path.resolve(PUBLIC_DIR, 'uploads')
    if (!resolvedPath.startsWith(allowedBase)) {
      return NextResponse.json({ error: 'Ruta de archivo no permitida' }, { status: 403 })
    }

    // Check if the file exists
    let fileStat
    try {
      fileStat = await stat(resolvedPath)
    } catch {
      return NextResponse.json(
        { error: 'Archivo físico no encontrado en el servidor', rutaArchivo },
        { status: 404 }
      )
    }

    if (!fileStat.isFile()) {
      return NextResponse.json({ error: 'La ruta no corresponde a un archivo' }, { status: 400 })
    }

    // Read the file
    const fileBuffer = await readFile(resolvedPath)

    // Determine content type
    const contentType = MIME_TYPES[documento.formato] || 'application/octet-stream'

    // Return the file with download headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(documento.nombreArchivo)}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, no-cache',
      },
    })
  } catch (error) {
    console.error('Error downloading documento:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
