'use client'

import { useState, useEffect, useCallback } from 'react'
import type { LoginUser } from '@/components/login-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  FileText,
  PenTool,
  Search,
  FileCheck,
  Clock,
  Loader2,
  Plus,
  ArrowLeft,
  Upload,
  AlertTriangle,
  Calendar,
  ChevronRight,
  Download,
  XCircle,
} from 'lucide-react'

interface Incapacidad {
  id: string
  radicado: string
  tipoNovedad: string
  estado: string
  fechaInicio: string
  fechaFin: string
  diasIncapacidad: number
  diasAcumulados: number
  diagnosticoCIE10: string | null
  descripcionCIE10: string | null
  esProrroga: boolean
  esReporteExtemporaneo: boolean
  observaciones: string | null
  fechaRegistro: string
  empleado: { id: string; name: string; document: string; area: string; cargo: string; salary: number }
  eps: { id: string; nombre: string; nit: string }
  documentos: Array<{
    id: string
    tipoDocumento: string
    nombreArchivo: string
    formato: string
    aprobado: boolean | null
    obligatorio: boolean
  }>
  incapacidadOriginal: { id: string; radicado: string; estado: string } | null
  prorrogas: Array<{ id: string; radicado: string; estado: string; diasIncapacidad: number }>
  subsanaciones: Array<{
    id: string
    fechaLimite: string
    documentosFaltantes: string
    estado: string
  }>
  historial: Array<{
    estadoAnterior: string | null
    estadoNuevo: string
    accion: string
    observaciones: string | null
    fecha: string
    usuario: { name: string; role: string } | null
  }>
}

const estadoColors: Record<string, string> = {
  RECIBIDA: 'bg-blue-100 text-blue-700 border-0',
  PENDIENTE_VALIDACION: 'bg-yellow-100 text-yellow-700 border-0',
  VALIDADA: 'bg-green-100 text-green-700 border-0',
  PENDIENTE_SUBSANACION: 'bg-orange-100 text-orange-700 border-0',
  TRANSCRITA: 'bg-teal-100 text-teal-700 border-0',
  EN_COBRO: 'bg-indigo-100 text-indigo-700 border-0',
  PAGADA: 'bg-emerald-100 text-emerald-700 border-0',
  ARCHIVADA: 'bg-gray-100 text-gray-700 border-0',
  RECHAZADA_ENTIDAD: 'bg-red-100 text-red-700 border-0',
  COBRO_PERSUASIVO: 'bg-amber-100 text-amber-700 border-0',
  COBRO_JURIDICO: 'bg-rose-100 text-rose-700 border-0',
  GLOSA: 'bg-pink-100 text-pink-700 border-0',
  SUBSANACION_VENCIDA: 'bg-red-100 text-red-700 border-0',
  TRAMITE_PENSION: 'bg-purple-100 text-purple-700 border-0',
}

const estadoLabels: Record<string, string> = {
  RECIBIDA: 'Recibida',
  PENDIENTE_VALIDACION: 'Pendiente Validación',
  VALIDADA: 'Validada',
  PENDIENTE_SUBSANACION: 'Pendiente Subsanación',
  TRANSCRITA: 'Transcrita',
  EN_COBRO: 'En Cobro',
  PAGADA: 'Pagada',
  ARCHIVADA: 'Archivada',
  RECHAZADA_ENTIDAD: 'Rechazada EPS',
  COBRO_PERSUASIVO: 'Cobro Persuasivo',
  COBRO_JURIDICO: 'Cobro Jurídico',
  GLOSA: 'Glosa',
  SUBSANACION_VENCIDA: 'Subsanación Vencida',
  TRAMITE_PENSION: 'Trámite Pensión',
}

const tipoNovedadLabels: Record<string, string> = {
  ENFERMEDAD_COMUN: 'Enfermedad Común',
  ACCIDENTE_TRANSITO: 'Accidente Tránsito',
  ACCIDENTE_TRABAJO: 'Accidente Trabajo',
  LICENCIA_MATERNIDAD: 'Licencia Maternidad',
  LICENCIA_PATERNIDAD: 'Licencia Paternidad',
  PRORROGA: 'Prórroga',
}

const requiredDocuments: Record<string, Array<{ tipo: string; label: string }>> = {
  ENFERMEDAD_COMUN: [
    { tipo: 'CERTIFICADO_ORIGINAL', label: 'Certificado Médico Original' },
    { tipo: 'EPICRISIS', label: 'Epicrisis' },
  ],
  ACCIDENTE_TRANSITO: [
    { tipo: 'CERTIFICADO_ORIGINAL', label: 'Certificado Médico Original' },
    { tipo: 'FURIPS', label: 'FURIPS' },
    { tipo: 'DOCUMENTO_IDENTIDAD', label: 'Documento de Identidad' },
  ],
  ACCIDENTE_TRABAJO: [
    { tipo: 'CERTIFICADO_ORIGINAL', label: 'Certificado Médico Original' },
    { tipo: 'FURIPS', label: 'FURIPS' },
    { tipo: 'EPICRISIS', label: 'Epicrisis' },
  ],
  LICENCIA_MATERNIDAD: [
    { tipo: 'CERTIFICADO_ORIGINAL', label: 'Certificado Médico Original' },
    { tipo: 'CERTIFICADO_NACIDO_VIVO', label: 'Certificado Nacido Vivo' },
    { tipo: 'REGISTRO_CIVIL', label: 'Registro Civil' },
  ],
  LICENCIA_PATERNIDAD: [
    { tipo: 'CERTIFICADO_ORIGINAL', label: 'Certificado Médico Original' },
    { tipo: 'REGISTRO_CIVIL', label: 'Registro Civil del Menor' },
  ],
}

function EstadoBadge({ estado }: { estado: string }) {
  return (
    <Badge className={estadoColors[estado] || 'bg-gray-100 text-gray-700 border-0'}>
      {estadoLabels[estado] || estado}
    </Badge>
  )
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}

interface Props {
  user: LoginUser
  section: string
  onSectionChange: (s: string) => void
}

export default function EmpleadoIncapacidades({ user, section, onSectionChange }: Props) {
  const { toast } = useToast()

  switch (section) {
    case 'registrar-incapacidad':
      return <RegistrarIncapacidad user={user} onSectionChange={onSectionChange} toast={toast} />
    case 'subsanar-incapacidad':
      return <SubsanarIncapacidad user={user} onSectionChange={onSectionChange} toast={toast} />
    case 'prorrogas-empleado':
      return <ProrrogasEmpleado user={user} onSectionChange={onSectionChange} toast={toast} />
    case 'mis-incapacidades':
    default:
      return <MisIncapacidades user={user} onSectionChange={onSectionChange} toast={toast} />
  }
}

// ==================== MIS INCAPACIDADES ====================
function MisIncapacidades({ user, onSectionChange, toast }: { user: LoginUser; onSectionChange: (s: string) => void; toast: ReturnType<typeof useToast>['toast'] }) {
  const [incapacidades, setIncapacidades] = useState<Incapacidad[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('TODOS')
  const [selectedIncapacidad, setSelectedIncapacidad] = useState<Incapacidad | null>(null)

  const fetchIncapacidades = useCallback(async () => {
    try {
      setLoading(true)
      const url = filtroEstado && filtroEstado !== 'TODOS'
        ? `/api/incapacidades?misIncapacidades=true&estado=${filtroEstado}`
        : '/api/incapacidades?misIncapacidades=true'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setIncapacidades(data.incapacidades || [])
      }
    } catch {
      toast({ title: 'Error', description: 'Error al cargar incapacidades', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [filtroEstado, toast])

  useEffect(() => {
    fetchIncapacidades()
  }, [fetchIncapacidades])

  const handleViewDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/incapacidades/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedIncapacidad(data.incapacidad)
      }
    } catch {
      toast({ title: 'Error', description: 'Error al cargar detalle', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Mis Incapacidades
          </h2>
          <p className="text-muted-foreground mt-1">Consulte y gestione sus incapacidades</p>
        </div>
        <Button onClick={() => onSectionChange('registrar-incapacidad')}>
          <Plus className="w-4 h-4 mr-2" />
          Registrar Nueva Incapacidad
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">Historial de Incapacidades</CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Filtrar:</Label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-48 h-8 text-xs">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos los estados</SelectItem>
                  {Object.entries(estadoLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : incapacidades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No tiene incapacidades registradas</p>
              <Button variant="outline" className="mt-3" onClick={() => onSectionChange('registrar-incapacidad')}>
                <Plus className="w-4 h-4 mr-2" /> Registrar Incapacidad
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Radicado</TableHead>
                    <TableHead>Tipo Novedad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Inicio</TableHead>
                    <TableHead>Fecha Fin</TableHead>
                    <TableHead>Días</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incapacidades.map((inc) => (
                    <TableRow
                      key={inc.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewDetail(inc.id)}
                    >
                      <TableCell className="font-mono font-medium text-sm">{inc.radicado}</TableCell>
                      <TableCell className="text-sm">{tipoNovedadLabels[inc.tipoNovedad] || inc.tipoNovedad}</TableCell>
                      <TableCell><EstadoBadge estado={inc.estado} /></TableCell>
                      <TableCell className="text-sm">{formatDate(inc.fechaInicio)}</TableCell>
                      <TableCell className="text-sm">{formatDate(inc.fechaFin)}</TableCell>
                      <TableCell className="text-sm font-medium">{inc.diasIncapacidad}</TableCell>
                      <TableCell><ChevronRight className="w-4 h-4 text-muted-foreground" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedIncapacidad} onOpenChange={() => setSelectedIncapacidad(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle Incapacidad {selectedIncapacidad?.radicado}</DialogTitle>
            <DialogDescription>Información completa de la incapacidad</DialogDescription>
          </DialogHeader>
          {selectedIncapacidad && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Radicado</Label>
                  <p className="font-mono font-medium">{selectedIncapacidad.radicado}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <div className="mt-1"><EstadoBadge estado={selectedIncapacidad.estado} /></div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo Novedad</Label>
                  <p className="text-sm">{tipoNovedadLabels[selectedIncapacidad.tipoNovedad]}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">EPS</Label>
                  <p className="text-sm">{selectedIncapacidad.eps.nombre}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha Inicio</Label>
                  <p className="text-sm">{formatDate(selectedIncapacidad.fechaInicio)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha Fin</Label>
                  <p className="text-sm">{formatDate(selectedIncapacidad.fechaFin)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Días Incapacidad</Label>
                  <p className="text-sm font-medium">{selectedIncapacidad.diasIncapacidad}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Días Acumulados</Label>
                  <p className="text-sm font-medium">{selectedIncapacidad.diasAcumulados}</p>
                </div>
              </div>

              {selectedIncapacidad.diagnosticoCIE10 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Diagnóstico CIE-10</Label>
                  <p className="text-sm">{selectedIncapacidad.diagnosticoCIE10} - {selectedIncapacidad.descripcionCIE10}</p>
                </div>
              )}

              {selectedIncapacidad.esReporteExtemporaneo && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-700">Reporte extemporáneo</span>
                </div>
              )}

              {selectedIncapacidad.observaciones && (
                <div>
                  <Label className="text-xs text-muted-foreground">Observaciones</Label>
                  <p className="text-sm">{selectedIncapacidad.observaciones}</p>
                </div>
              )}

              {/* Documents */}
              {selectedIncapacidad.documentos && selectedIncapacidad.documentos.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Documentos</Label>
                  <div className="mt-1 space-y-1">
                    {selectedIncapacidad.documentos.map((doc) => (
<div key={doc.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                         <div className="flex items-center gap-2">
                           <span>{doc.nombreArchivo}</span>
                         </div>
                         <div className="flex items-center gap-2">
                           <a href={`/api/documentos/${doc.id}/download`} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                             <Download className="w-4 h-4" />
                           </a>
                           {doc.aprobado === true && <Badge className="bg-green-100 text-green-700 border-0 text-xs">Aprobado</Badge>}
                           {doc.aprobado === false && <Badge className="bg-red-100 text-red-700 border-0 text-xs">Rechazado</Badge>}
                           {doc.aprobado === null && <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs">Pendiente</Badge>}
                         </div>
                       </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subsanaciones */}
              {selectedIncapacidad.subsanaciones && selectedIncapacidad.subsanaciones.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Subsanaciones</Label>
                  <div className="mt-1 space-y-1">
                    {selectedIncapacidad.subsanaciones.map((sub) => (
                      <div key={sub.id} className="p-2 rounded-lg bg-orange-50 border border-orange-200 text-sm">
                        <span className="font-medium">Documentos faltantes:</span> {sub.documentosFaltantes}
                        <br />
                        <span className="text-xs text-muted-foreground">Fecha límite: {formatDate(sub.fechaLimite)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prórrogas */}
              {selectedIncapacidad.prorrogas && selectedIncapacidad.prorrogas.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Prórrogas</Label>
                  <div className="mt-1 space-y-1">
                    {selectedIncapacidad.prorrogas.map((pro) => (
                      <div key={pro.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                        <span className="font-mono">{pro.radicado}</span>
                        <div className="flex items-center gap-2">
                          <span>{pro.diasIncapacidad} días</span>
                          <EstadoBadge estado={pro.estado} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Historial */}
              {selectedIncapacidad.historial && selectedIncapacidad.historial.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Historial</Label>
                  <div className="mt-1 max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                    {selectedIncapacidad.historial.map((h, i) => (
                      <div key={i} className="p-2 rounded-lg bg-muted/30 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{h.accion}</span>
                          <span className="text-muted-foreground">{formatDate(h.fecha)}</span>
                        </div>
                        {h.observaciones && <p className="text-muted-foreground mt-0.5">{h.observaciones}</p>}
                        {h.usuario && <p className="text-muted-foreground">Por: {h.usuario.name}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== REGISTRAR INCAPACIDAD ====================
function RegistrarIncapacidad({ user, onSectionChange, toast }: { user: LoginUser; onSectionChange: (s: string) => void; toast: ReturnType<typeof useToast>['toast'] }) {
  const [tipoNovedad, setTipoNovedad] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [diagnosticoCIE10, setDiagnosticoCIE10] = useState('')
  const [descripcionCIE10, setDescripcionCIE10] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [partoMultiple, setPartoMultiple] = useState(false)
  const [observaciones, setObservaciones] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({})
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({})
  const diasIncapacidad = fechaInicio && fechaFin
    ? Math.max(1, Math.ceil((new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 0

  const docs = requiredDocuments[tipoNovedad] || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tipoNovedad || !fechaInicio || !fechaFin) {
      toast({ title: 'Error', description: 'Complete los campos obligatorios', variant: 'destructive' })
      return
    }
    if (diasIncapacidad <= 0) {
      toast({ title: 'Error', description: 'La fecha fin debe ser posterior a la fecha inicio', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/incapacidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoNovedad,
          fechaInicio,
          fechaFin,
          diasIncapacidad,
          diagnosticoCIE10: diagnosticoCIE10 || null,
          descripcionCIE10: descripcionCIE10 || null,
          observaciones: observaciones || null,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const incId = data.incapacidad?.id
        // Upload documents if an incapacidad was created
        if (incId && Object.keys(uploadedFiles).length > 0) {
          let docUploadErrors = []
          for (const [tipo, file] of Object.entries(uploadedFiles)) {
            try {
              const formData = new FormData()
              formData.append('file', file)
              formData.append('tipoDocumento', tipo)
              formData.append('obligatorio', 'true')
              const docRes = await fetch(`/api/incapacidades/${incId}/documentos`, {
                method: 'POST',
                body: formData,
              })
              if (!docRes.ok) {
                const docErr = await docRes.json()
                docUploadErrors.push(`${tipo}: ${docErr.error || 'Error desconocido'}`)
              }
            } catch (err) {
              docUploadErrors.push(`${tipo}: Error de conexión`)
            }
          }
          if (docUploadErrors.length > 0) {
            toast({ 
              title: '⚠️ Incapacidad creada con advertencias', 
              description: `Radicado: ${data.incapacidad?.radicado || 'N/A'}. Algunos documentos tuvieron errores: ${docUploadErrors.join('; ')}`,
              variant: 'destructive'
            })
          } else {
            toast({ title: '✅ Incapacidad registrada exitosamente', description: `Radicado: ${data.incapacidad?.radicado || 'N/A'}. Su incapacidad ha sido radicada con todos los documentos adjuntos.` })
          }
        } else {
          toast({ title: '✅ Incapacidad registrada exitosamente', description: `Radicado: ${data.incapacidad?.radicado || 'N/A'}. Recuerde adjuntar los documentos requeridos.` })
        }
        setTimeout(() => onSectionChange('mis-incapacidades'), 1500)
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al registrar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDocUpload = (tipo: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.jpg,.jpeg,.png'
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement
      const file = target.files?.[0]
      if (file) {
        setUploadedDocs(prev => ({
          ...prev,
          [tipo]: file.name,
        }))
        // Store the file for later upload
        setUploadedFiles(prev => ({ ...prev, [tipo]: file }))
      }
    }
    input.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => onSectionChange('mis-incapacidades')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <PenTool className="w-6 h-6 text-primary" />
            Registrar Incapacidad
          </h2>
          <p className="text-muted-foreground mt-1">Complete el formulario para registrar una nueva incapacidad</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Tipo de Novedad */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tipo de Novedad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Novedad *</Label>
                <Select value={tipoNovedad} onValueChange={setTipoNovedad}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione el tipo de novedad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENFERMEDAD_COMUN">Enfermedad Común</SelectItem>
                    <SelectItem value="ACCIDENTE_TRANSITO">Accidente de Tránsito</SelectItem>
                    <SelectItem value="ACCIDENTE_TRABAJO">Accidente de Trabajo</SelectItem>
                    <SelectItem value="LICENCIA_MATERNIDAD">Licencia de Maternidad</SelectItem>
                    <SelectItem value="LICENCIA_PATERNIDAD">Licencia de Paternidad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Fechas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Fechas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Fecha Inicio *</Label>
                  <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Fin *</Label>
                  <Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Días de Incapacidad</Label>
                  <Input value={diasIncapacidad || '-'} readOnly className="bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Diagnóstico CIE-10 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Diagnóstico CIE-10</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código CIE-10</Label>
                  <Input
                    placeholder="Ej: J06.9"
                    value={diagnosticoCIE10}
                    onChange={e => setDiagnosticoCIE10(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción CIE-10</Label>
                  <Input
                    placeholder="Descripción del diagnóstico"
                    value={descripcionCIE10}
                    onChange={e => setDescripcionCIE10(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Maternidad / Paternidad additional fields */}
          {(tipoNovedad === 'LICENCIA_MATERNIDAD' || tipoNovedad === 'LICENCIA_PATERNIDAD') && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {tipoNovedad === 'LICENCIA_MATERNIDAD' ? 'Datos de Maternidad' : 'Datos de Paternidad'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha de Nacimiento *</Label>
                    <Input type="date" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} />
                  </div>
                  {tipoNovedad === 'LICENCIA_MATERNIDAD' && (
                    <div className="flex items-center gap-3 pt-6">
                      <Checkbox
                        id="partoMultiple"
                        checked={partoMultiple}
                        onCheckedChange={(c) => setPartoMultiple(c === true)}
                      />
                      <Label htmlFor="partoMultiple">Parto Múltiple</Label>
                    </div>
                  )}
                </div>
                {partoMultiple && tipoNovedad === 'LICENCIA_MATERNIDAD' && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
                    <AlertTriangle className="w-4 h-4 inline mr-2" />
                    Parto múltiple: La licencia se extiende a 84 días (12 semanas) por la normatividad vigente.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Document Checklist */}
          {docs.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Documentos Requeridos</CardTitle>
                <CardDescription>Suba los documentos obligatorios según el tipo de novedad</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {docs.map((doc) => (
                    <div key={doc.tipo} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <FileCheck className={`w-4 h-4 ${uploadedDocs[doc.tipo] ? 'text-green-500' : 'text-muted-foreground'}`} />
                        <div>
                          <p className="text-sm font-medium">{doc.label}</p>
                          <p className="text-xs text-muted-foreground">Obligatorio</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {uploadedDocs[doc.tipo] ? (
                          <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                            <FileCheck className="w-3 h-3 mr-1" /> Cargado
                          </Badge>
                        ) : (
                          <Button type="button" variant="outline" size="sm" onClick={() => handleDocUpload(doc.tipo)}>
                            <Upload className="w-3 h-3 mr-1" /> Subir
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Observaciones */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Observaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Observaciones adicionales..."
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onSectionChange('mis-incapacidades')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !tipoNovedad || !fechaInicio || !fechaFin}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <PenTool className="w-4 h-4 mr-2" />
                  Registrar Incapacidad
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

// ==================== SUBSANAR INCAPACIDAD ====================
function SubsanarIncapacidad({ user, onSectionChange, toast }: { user: LoginUser; onSectionChange: (s: string) => void; toast: ReturnType<typeof useToast>['toast'] }) {
  const [incapacidades, setIncapacidades] = useState<Incapacidad[]>([])
  const [loading, setLoading] = useState(true)
  const [subsanarDialogOpen, setSubsanarDialogOpen] = useState(false)
  const [selectedInc, setSelectedInc] = useState<Incapacidad | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [subsanarFiles, setSubsanarFiles] = useState<Record<string, File>>({})
  const [subsanarExtraType, setSubsanarExtraType] = useState('')

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/incapacidades?misIncapacidades=true&estado=PENDIENTE_SUBSANACION')
      if (res.ok) {
        const data = await res.json()
        setIncapacidades(data.incapacidades || [])
      }
    } catch {
      toast({ title: 'Error', description: 'Error al cargar', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchPending()
    // Recargar la lista cada 30 segundos para detectar nuevos avisos de subsanación
    const interval = setInterval(() => {
      fetchPending()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchPending])

  const handleSubsanar = async () => {
    if (!selectedInc) return
    const allFiles = Object.entries(subsanarFiles)
    if (allFiles.length === 0) {
      toast({ title: 'Error', description: 'Debe subir al menos un documento', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      for (const [docType, file] of allFiles) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('tipoDocumento', docType || 'OTRO')
        formData.append('obligatorio', 'true')
        const uploadRes = await fetch(`/api/incapacidades/${selectedInc.id}/documentos`, {
          method: 'POST',
          body: formData,
        })
        if (!uploadRes.ok) {
          const errData = await uploadRes.json()
          toast({ title: 'Error', description: errData.error || `Error al subir ${docType}`, variant: 'destructive' })
        }
      }
      toast({ title: '✅ Documentos enviados correctamente', description: 'Los documentos de subsanación han sido enviados. El equipo de Recursos Humanos revisará su documentación.' })
      setSubsanarDialogOpen(false)
      setSelectedInc(null)
      setSubsanarFiles({})
      // Recargar la lista después de enviar documentos
      await fetchPending()
    } catch {
      toast({ title: 'Error', description: 'Error al subir documentos', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => onSectionChange('mis-incapacidades')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-primary" />
            Subsanar Documentos
          </h2>
          <p className="text-muted-foreground mt-1">Complete documentos pendientes de subsanación</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : incapacidades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No tiene incapacidades pendientes de subsanación</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Radicado</TableHead>
                    <TableHead>Tipo Novedad</TableHead>
                    <TableHead>Docs. Faltantes</TableHead>
                    <TableHead>Fecha Límite</TableHead>
                    <TableHead>Días Restantes</TableHead>
                    <TableHead>Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incapacidades.map((inc) => {
                    const sub = inc.subsanaciones?.[0]
                    const fechaLimite = sub?.fechaLimite ? new Date(sub.fechaLimite) : null
                    const diasRestantes = fechaLimite
                      ? Math.ceil((fechaLimite.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : null

                    return (
                      <TableRow key={inc.id}>
                        <TableCell className="font-mono font-medium text-sm">{inc.radicado}</TableCell>
                        <TableCell className="text-sm">{tipoNovedadLabels[inc.tipoNovedad]}</TableCell>
                        <TableCell className="text-sm text-orange-600 max-w-48 truncate">
                          {sub?.documentosFaltantes || '-'}
                        </TableCell>
                        <TableCell className="text-sm">{fechaLimite ? formatDate(sub.fechaLimite) : '-'}</TableCell>
                        <TableCell>
                          {diasRestantes !== null && (
                            <Badge className={
                              diasRestantes < 0
                                ? 'bg-red-100 text-red-700 border-0'
                                : diasRestantes <= 1
                                  ? 'bg-orange-100 text-orange-700 border-0'
                                  : 'bg-yellow-100 text-yellow-700 border-0'
                            }>
                              {diasRestantes < 0 ? 'Vencido' : `${diasRestantes}d`}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedInc(inc)
                              setSubsanarDialogOpen(true)
                            }}
                          >
                            <Upload className="w-3 h-3 mr-1" /> Subsanar
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subsanar Dialog */}
      <Dialog open={subsanarDialogOpen} onOpenChange={setSubsanarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subsanar Documentos - {selectedInc?.radicado}</DialogTitle>
            <DialogDescription>Suba los documentos faltantes para completar la subsanacion</DialogDescription>
          </DialogHeader>
          {selectedInc && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-2">
                <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  <strong>Nota:</strong> Cuando envíe los documentos, el equipo de Recursos Humanos será notificado automáticamente para revisar su subsanación.
                </p>
              </div>

              {selectedInc.subsanaciones?.[0]?.documentosFaltantes && (
                <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                  <p className="text-sm font-medium text-orange-700">Documentos Faltantes:</p>
                  <p className="text-sm text-orange-600">{selectedInc.subsanaciones[0].documentosFaltantes}</p>
                  {selectedInc.subsanaciones[0].fechaLimite && (
                    <p className="text-xs text-orange-500 mt-1">
                      Fecha limite: {formatDate(selectedInc.subsanaciones[0].fechaLimite)}
                    </p>
                  )}
                </div>
              )}

              {/* Specific missing docs from subsanacion */}
              {selectedInc.subsanaciones?.[0]?.documentosFaltantes?.split(', ').filter(Boolean).map((doc) => (
                <div key={doc} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{doc}</span>
                    {subsanarFiles[doc.trim()] && (
                      <Badge className="bg-green-100 text-green-700 border-0 text-xs ml-2">
                        <FileCheck className="w-3 h-3 mr-1" /> {subsanarFiles[doc.trim()].name}
                      </Badge>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = '.pdf,.jpg,.jpeg,.png'
                    input.onchange = (e: Event) => {
                      const target = e.target as HTMLInputElement
                      const file = target.files?.[0]
                      if (file) {
                        setSubsanarFiles(prev => ({ ...prev, [doc.trim()]: file }))
                      }
                    }
                    input.click()
                  }}>
                    <Upload className="w-3 h-3 mr-1" /> Subir
                  </Button>
                </div>
              ))}

              {/* Generic file upload for any additional docs */}
              <div className="space-y-3 p-4 rounded-xl border border-dashed border-primary/20 bg-primary/5">
                <h4 className="text-sm font-semibold">Cargar documento adicional</h4>
                <p className="text-xs text-muted-foreground">Si desea subir un documento que no esta en la lista anterior, seleccione el tipo y cargue el archivo</p>
                <div className="space-y-2">
                  <Label className="text-xs">Tipo de documento</Label>
                  <Select value={subsanarExtraType} onValueChange={setSubsanarExtraType}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Seleccione tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CERTIFICADO_ORIGINAL">Certificado Medico Original</SelectItem>
                      <SelectItem value="EPICRISIS">Epicrisis</SelectItem>
                      <SelectItem value="FURIPS">FURIPS</SelectItem>
                      <SelectItem value="CERTIFICADO_NACIDO_VIVO">Certificado Nacido Vivo</SelectItem>
                      <SelectItem value="REGISTRO_CIVIL">Registro Civil</SelectItem>
                      <SelectItem value="DOCUMENTO_IDENTIDAD">Documento de Identidad</SelectItem>
                      <SelectItem value="CERTIFICADO_MEDICO">Certificado Medico</SelectItem>
                      <SelectItem value="SOPORTE_RADICACION">Soporte de Radicacion</SelectItem>
                      <SelectItem value="OTRO">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={!subsanarExtraType}
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = '.pdf,.jpg,.jpeg,.png'
                    input.onchange = (e: Event) => {
                      const target = e.target as HTMLInputElement
                      const file = target.files?.[0]
                      if (file) {
                        setSubsanarFiles(prev => ({ ...prev, [subsanarExtraType]: file }))
                      }
                    }
                    input.click()
                  }}
                >
                  <Upload className="w-3 h-3 mr-1" /> Cargar archivo
                </Button>
              </div>

              {/* Show all selected files */}
              {Object.keys(subsanarFiles).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Archivos seleccionados ({Object.keys(subsanarFiles).length})</Label>
                  {Object.entries(subsanarFiles).map(([docType, file]) => (
                    <div key={docType} className="flex items-center justify-between p-2 rounded-lg bg-green-50 border border-green-200 text-sm">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-700">{docType.replace(/_/g, ' ')}</span>
                        <span className="text-muted-foreground text-xs">({(file as File).name})</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setSubsanarFiles(prev => {
                          const next = { ...prev }
                          delete next[docType]
                          return next
                        })}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setSubsanarDialogOpen(false); setSubsanarFiles({}); setSubsanarExtraType('') }}>Cancelar</Button>
                <Button onClick={handleSubsanar} disabled={submitting || Object.keys(subsanarFiles).length === 0}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileCheck className="w-4 h-4 mr-2" />}
                  Enviar Documentos
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== PRORROGAS EMPLEADO ====================
function ProrrogasEmpleado({ user, onSectionChange, toast }: { user: LoginUser; onSectionChange: (s: string) => void; toast: ReturnType<typeof useToast>['toast'] }) {
  const [incapacidades, setIncapacidades] = useState<Incapacidad[]>([])
  const [loading, setLoading] = useState(true)
  const [prorrogaDialogOpen, setProrrogaDialogOpen] = useState(false)
  const [selectedInc, setSelectedInc] = useState<Incapacidad | null>(null)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchProrrogas = useCallback(async () => {
    try {
      const res = await fetch('/api/incapacidades?misIncapacidades=true')
      if (res.ok) {
        const data = await res.json()
        const active = (data.incapacidades || []).filter(
          (inc: Incapacidad) => !['PAGADA', 'ARCHIVADA', 'SUBSANACION_VENCIDA'].includes(inc.estado)
        )
        setIncapacidades(active)
      }
    } catch {
      toast({ title: 'Error', description: 'Error al cargar', variant: 'destructive' })
    }
  }, [toast])

  useEffect(() => {
    fetchProrrogas().finally(() => setLoading(false))
  }, [fetchProrrogas])

  const diasProrroga = fechaInicio && fechaFin
    ? Math.max(1, Math.ceil((new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 0

  const handleRegistrarProrroga = async () => {
    if (!selectedInc || !fechaInicio || !fechaFin) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/incapacidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empleadoId: selectedInc.empleado.id,
          epsId: selectedInc.eps.id,
          tipoNovedad: 'PRORROGA',
          fechaInicio,
          fechaFin,
          diasIncapacidad: diasProrroga,
          incapacidadOriginalId: selectedInc.id,
          observaciones: `Prórroga de incapacidad ${selectedInc.radicado}`,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast({ title: '✅ Prórroga registrada', description: `Prórroga de ${diasProrroga} días para la incapacidad ${selectedInc.radicado} registrada exitosamente. Radicado: ${data.incapacidad?.radicado || 'N/A'}` })
        setProrrogaDialogOpen(false)
        setFechaInicio('')
        setFechaFin('')
        setSelectedInc(null)
        fetchProrrogas()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al registrar la prórroga', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => onSectionChange('mis-incapacidades')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            Prórrogas
          </h2>
          <p className="text-muted-foreground mt-1">Gestión de prórrogas de incapacidades</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Incapacidades Activas</CardTitle>
          <CardDescription>Puede registrar prórrogas sobre incapacidades activas</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : incapacidades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No tiene incapacidades activas para prórroga</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Radicado</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Días</TableHead>
                    <TableHead>Acum.</TableHead>
                    <TableHead>Prórrogas</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incapacidades.map((inc) => (
                    <TableRow key={inc.id}>
                      <TableCell className="font-mono font-medium text-sm">{inc.radicado}</TableCell>
                      <TableCell className="text-sm">{tipoNovedadLabels[inc.tipoNovedad]}</TableCell>
                      <TableCell><EstadoBadge estado={inc.estado} /></TableCell>
                      <TableCell className="text-xs">
                        {formatDate(inc.fechaInicio)} - {formatDate(inc.fechaFin)}
                      </TableCell>
                      <TableCell className="text-sm">{inc.diasIncapacidad}</TableCell>
                      <TableCell className="text-sm font-medium">{inc.diasAcumulados}</TableCell>
                      <TableCell className="text-sm">{inc.prorrogas?.length || 0}</TableCell>
                      <TableCell>
                        {!inc.esProrroga && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedInc(inc)
                              setProrrogaDialogOpen(true)
                            }}
                          >
                            <Clock className="w-3 h-3 mr-1" /> Prórroga
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prórroga Dialog */}
      <Dialog open={prorrogaDialogOpen} onOpenChange={setProrrogaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Prórroga - {selectedInc?.radicado}</DialogTitle>
            <DialogDescription>Ingrese las fechas de la prórroga</DialogDescription>
          </DialogHeader>
          {selectedInc && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm"><span className="font-medium">Incapacidad original:</span> {selectedInc.radicado}</p>
                <p className="text-sm"><span className="font-medium">Días acumulados:</span> {selectedInc.diasAcumulados}</p>
                <p className="text-sm"><span className="font-medium">EPS:</span> {selectedInc.eps.nombre}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha Inicio Prórroga *</Label>
                  <Input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Fin Prórroga *</Label>
                  <Input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Días de Prórroga</Label>
                <Input value={diasProrroga || '-'} readOnly className="bg-muted" />
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700">
                <Calendar className="w-4 h-4 inline mr-1" />
                Total días acumulados: {selectedInc.diasAcumulados + diasProrroga}
                {selectedInc.diasAcumulados + diasProrroga >= 90 && (
                  <span className="ml-2 font-medium">Umbral 90 días</span>
                )}
                {selectedInc.diasAcumulados + diasProrroga >= 180 && (
                  <span className="ml-2 font-medium text-red-600">Umbral 180 días</span>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setProrrogaDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleRegistrarProrroga} disabled={submitting || !fechaInicio || !fechaFin}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
                  Registrar Prórroga
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
