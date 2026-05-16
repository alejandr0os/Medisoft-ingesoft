'use client'

import { useState, useEffect, useCallback } from 'react'
import type { LoginUser } from '@/components/login-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { useToast } from '@/hooks/use-toast'
import {
  ClipboardCheck,
  FileCheck,
  Clock,
  Loader2,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Download,
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
  eps: { id: string; nombre: string; nit: string; portalWeb?: string; contacto?: string; email?: string }
  documentos: Array<{
    id: string
    tipoDocumento: string
    nombreArchivo: string
    formato: string
    aprobado: boolean | null
    obligatorio: boolean
    observaciones: string | null
  }>
  subsanaciones: Array<{
    id: string
    fechaLimite: string
    documentosFaltantes: string
    estado: string
    diasRestantes?: number
    vencida?: boolean
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

function EstadoBadge({ estado }: { estado: string }) {
  return (
    <Badge className={estadoColors[estado] || 'bg-gray-100 text-gray-700 border-0'}>
      {estadoLabels[estado] || estado}
    </Badge>
  )
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}

interface Props {
  user: LoginUser
  section: string
  onSectionChange: (s: string) => void
}

export default function GHIncapacidadesPendientes({ user, section, onSectionChange }: Props) {
  const { toast } = useToast()

  switch (section) {
    case 'validar-incapacidad':
      return <ValidarIncapacidad user={user} onSectionChange={onSectionChange} toast={toast} />
    case 'gestionar-subsanacion':
      return <GestionarSubsanacion user={user} onSectionChange={onSectionChange} toast={toast} />
    case 'incapacidades-pendientes':
    default:
      return <IncapacidadesPendientes user={user} onSectionChange={onSectionChange} toast={toast} />
  }
}

// ==================== INCAPACIDADES PENDIENTES ====================
function IncapacidadesPendientes({ onSectionChange, toast }: { user: LoginUser; onSectionChange: (s: string) => void; toast: ReturnType<typeof useToast>['toast'] }) {
  const [incapacidades, setIncapacidades] = useState<Incapacidad[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIncapacidad, setSelectedIncapacidad] = useState<Incapacidad | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [resRecibida, resPendiente] = await Promise.all([
        fetch('/api/incapacidades?estado=RECIBIDA'),
        fetch('/api/incapacidades?estado=PENDIENTE_VALIDACION'),
      ])
      
      if (!resRecibida.ok || !resPendiente.ok) {
        throw new Error('Error al obtener datos')
      }

      const dataRecibida = await resRecibida.json()
      const dataPendiente = await resPendiente.json()
      setIncapacidades([...(dataRecibida.incapacidades || []), ...(dataPendiente.incapacidades || [])])
    } catch {
      setIncapacidades([])
      toast({ title: 'Error', description: 'Error al cargar incapacidades pendientes', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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

  const handleSolicitarSubsanacion = async (id: string) => {
    try {
      const res = await fetch(`/api/incapacidades/${id}/validar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'subsanar', observaciones: 'Se solicita subsanación de documentación' }),
      })
      if (res.ok) {
        toast({ title: '✅ Subsanación solicitada', description: `Se ha notificado al empleado para que complete la documentación faltante.` })
        setSelectedIncapacidad(null)
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al solicitar subsanación', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-primary" />
          Incapacidades Pendientes
        </h2>
        <p className="text-muted-foreground mt-1">Incapacidades que requieren validación</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : incapacidades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay incapacidades pendientes de validación</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Radicado</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Tipo Novedad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Registro</TableHead>
                    <TableHead>EPS</TableHead>
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
                      <TableCell className="text-sm">{inc.empleado.name}</TableCell>
                      <TableCell className="text-sm">{tipoNovedadLabels[inc.tipoNovedad] || inc.tipoNovedad}</TableCell>
                      <TableCell><EstadoBadge estado={inc.estado} /></TableCell>
                      <TableCell className="text-sm">{formatDate(inc.fechaRegistro)}</TableCell>
                      <TableCell className="text-sm">{inc.eps.nombre}</TableCell>
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
            <DialogDescription>Revise la información y documentos de la incapacidad</DialogDescription>
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
                  <Label className="text-xs text-muted-foreground">Empleado</Label>
                  <p className="text-sm">{selectedIncapacidad.empleado.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">EPS</Label>
                  <p className="text-sm">{selectedIncapacidad.eps.nombre}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Período</Label>
                  <p className="text-sm">{formatDate(selectedIncapacidad.fechaInicio)} - {formatDate(selectedIncapacidad.fechaFin)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Días</Label>
                  <p className="text-sm">{selectedIncapacidad.diasIncapacidad} días</p>
                </div>
              </div>

              {selectedIncapacidad.esReporteExtemporaneo && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm text-amber-700">Reporte extemporáneo</span>
                </div>
              )}

              {/* Documents */}
              {selectedIncapacidad.documentos && selectedIncapacidad.documentos.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Documentos Adjuntos</Label>
                  <div className="mt-1 space-y-2">
                    {selectedIncapacidad.documentos.map((doc) => (
<div key={doc.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                         <div className="flex items-center gap-2">
                           <span className="font-medium">{doc.tipoDocumento.replace(/_/g, ' ')}</span>
                           <span className="text-muted-foreground text-xs">({doc.nombreArchivo})</span>
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

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedIncapacidad(null)
                    onSectionChange('validar-incapacidad')
                  }}
                >
                  <FileCheck className="w-4 h-4 mr-2" /> Validar
                </Button>
                <Button
                  variant="outline"
                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  onClick={() => handleSolicitarSubsanacion(selectedIncapacidad.id)}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" /> Solicitar Subsanación
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== VALIDAR INCAPACIDAD ====================
function ValidarIncapacidad({ onSectionChange, toast }: { user: LoginUser; onSectionChange: (s: string) => void; toast: ReturnType<typeof useToast>['toast'] }) {
  const [incapacidades, setIncapacidades] = useState<Incapacidad[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInc, setSelectedInc] = useState<Incapacidad | null>(null)
  const [docAprobaciones, setDocAprobaciones] = useState<Record<string, boolean | null>>({})
  const [observaciones, setObservaciones] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [resRecibida, resPendiente] = await Promise.all([
        fetch('/api/incapacidades?estado=RECIBIDA'),
        fetch('/api/incapacidades?estado=PENDIENTE_VALIDACION'),
      ])
      
      if (!resRecibida.ok || !resPendiente.ok) {
        throw new Error('Error al obtener datos')
      }

      const dataRecibida = await resRecibida.json()
      const dataPendiente = await resPendiente.json()
      setIncapacidades([...(dataRecibida.incapacidades || []), ...(dataPendiente.incapacidades || [])])
    } catch {
      setIncapacidades([])
      toast({ title: 'Error', description: 'No se pudieron cargar las incapacidades para validar', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSelectIncapacidad = async (id: string) => {
    try {
      const res = await fetch(`/api/incapacidades/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedInc(data.incapacidad)
        // Initialize doc aprobaciones
        const aprovacoes: Record<string, boolean | null> = {}
        data.incapacidad.documentos?.forEach((doc: { id: string; aprobado: boolean | null }) => {
          aprovacoes[doc.id] = doc.aprobado
        })
        setDocAprobaciones(aprovacoes)
      }
    } catch {
      toast({ title: 'Error', description: 'Error al cargar detalle', variant: 'destructive' })
    }
  }

  const handleAprobarDoc = (docId: string, aprobado: boolean) => {
    setDocAprobaciones(prev => ({ ...prev, [docId]: aprobado }))
  }

  const handleAccion = async (accion: 'aprobar' | 'subsanar') => {
    if (!selectedInc) return
    setSubmitting(true)
    try {
      if (accion === 'aprobar') {
        for (const [docId, aprobado] of Object.entries(docAprobaciones)) {
          if (aprobado !== null) {
            await fetch(`/api/documentos/${docId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ aprobado }),
            })
          }
        }
      }

      const res = await fetch(`/api/incapacidades/${selectedInc.id}/validar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, observaciones }),
      })
      if (res.ok) {
        toast({
          title: accion === 'aprobar' ? '✅ Documentación aprobada' : '⚠️ Subsanación solicitada',
          description: accion === 'aprobar'
            ? `La incapacidad ${selectedInc.radicado} ha sido validada exitosamente y pasa a transcripción.`
            : `Se ha solicitado subsanación de documentos al empleado ${selectedInc.empleado.name}.`,
        })
        setSelectedInc(null)
        setObservaciones('')
        setDocAprobaciones({})
        fetchData()
        setTimeout(() => onSectionChange('incapacidades-pendientes'), 1500)
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error en la accion', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => onSectionChange('incapacidades-pendientes')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-primary" />
            Validar Incapacidad
          </h2>
          <p className="text-muted-foreground mt-1">Revise y valide incapacidades recibidas</p>
        </div>
      </div>

      {!selectedInc ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Seleccione una Incapacidad para Validar</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : incapacidades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay incapacidades pendientes de validación</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Radicado</TableHead>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>EPS</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incapacidades.map((inc) => (
                      <TableRow key={inc.id}>
                        <TableCell className="font-mono text-sm">{inc.radicado}</TableCell>
                        <TableCell className="text-sm">{inc.empleado.name}</TableCell>
                        <TableCell className="text-sm">{tipoNovedadLabels[inc.tipoNovedad]}</TableCell>
                        <TableCell><EstadoBadge estado={inc.estado} /></TableCell>
                        <TableCell className="text-sm">{inc.eps.nombre}</TableCell>
                        <TableCell>
                          <Button size="sm" onClick={() => handleSelectIncapacidad(inc.id)}>
                            Revisar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Información de la Incapacidad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div><Label className="text-xs text-muted-foreground">Radicado</Label><p className="font-mono font-medium">{selectedInc.radicado}</p></div>
                <div><Label className="text-xs text-muted-foreground">Empleado</Label><p className="text-sm">{selectedInc.empleado.name}</p></div>
                <div><Label className="text-xs text-muted-foreground">EPS</Label><p className="text-sm">{selectedInc.eps.nombre}</p></div>
                <div><Label className="text-xs text-muted-foreground">Tipo</Label><p className="text-sm">{tipoNovedadLabels[selectedInc.tipoNovedad]}</p></div>
                <div><Label className="text-xs text-muted-foreground">Período</Label><p className="text-sm">{formatDate(selectedInc.fechaInicio)} - {formatDate(selectedInc.fechaFin)}</p></div>
                <div><Label className="text-xs text-muted-foreground">Días</Label><p className="text-sm">{selectedInc.diasIncapacidad}</p></div>
              </div>
            </CardContent>
          </Card>

          {/* Document Review */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Revisión de Documentos</CardTitle>
              <CardDescription>Apruebe o rechace cada documento adjunto</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedInc.documentos && selectedInc.documentos.length > 0 ? (
                <div className="space-y-3">
                  {selectedInc.documentos.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          docAprobaciones[doc.id] === true ? 'bg-green-500'
                            : docAprobaciones[doc.id] === false ? 'bg-red-500'
                              : 'bg-yellow-500'
                        }`} />
                        <div>
                          <p className="text-sm font-medium">{doc.tipoDocumento.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-muted-foreground">{doc.nombreArchivo} | {doc.formato}</p>
                          {doc.observaciones && <p className="text-xs text-muted-foreground mt-0.5">{doc.observaciones}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-8 w-8 ${docAprobaciones[doc.id] === true ? 'bg-green-100 text-green-700' : ''}`}
                          onClick={() => handleAprobarDoc(doc.id, true)}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className={`h-8 w-8 ${docAprobaciones[doc.id] === false ? 'bg-red-100 text-red-700' : ''}`}
                          onClick={() => handleAprobarDoc(doc.id, false)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No hay documentos adjuntos para revisar
                </div>
              )}
            </CardContent>
          </Card>

          {/* Observaciones */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Observaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Observaciones de la validación..."
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setSelectedInc(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Volver a la lista
            </Button>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
                onClick={() => handleAccion('subsanar')}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                Solicitar Subsanación
              </Button>
              <Button
                onClick={() => handleAccion('aprobar')}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Aprobar Documentación
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== GESTIONAR SUBSANACION ====================
function GestionarSubsanacion({ onSectionChange, toast }: { user: LoginUser; onSectionChange: (s: string) => void; toast: ReturnType<typeof useToast>['toast'] }) {
  const [subsanaciones, setSubsanaciones] = useState<Array<{
    id: string
    fechaLimite: string
    documentosFaltantes: string
    estado: string
    diasRestantes: number
    vencida: boolean
    urgente: boolean
    incapacidad: {
      id: string
      radicado: string
      estado: string
      tipoNovedad: string
      fechaRegistro: string
      empleado: { id: string; name: string; document: string; area: string }
      eps: { id: string; nombre: string }
    }
  }>>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [detailSub, setDetailSub] = useState<typeof subsanaciones[0] | null>(null)
  const [detailDocs, setDetailDocs] = useState<Array<{ id: string; tipoDocumento: string; nombreArchivo: string; formato: string; aprobado: boolean | null; obligatorio: boolean }>>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/subsanaciones?estado=PENDIENTE')
      if (res.ok) {
        const data = await res.json()
        setSubsanaciones(data.subsanaciones || [])
      }
    } catch {
      toast({ title: 'Error', description: 'Error al cargar subsanaciones', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleViewDetail = async (sub: typeof subsanaciones[0]) => {
    setDetailSub(sub)
    setDetailLoading(true)
    setDetailDocs([])
    try {
      const res = await fetch(`/api/incapacidades/${sub.incapacidad.id}/documentos`)
      if (res.ok) {
        const data = await res.json()
        setDetailDocs(data.documentos || [])
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los documentos', variant: 'destructive' })
    } finally {
      setDetailLoading(false)
    }
  }

  const handleResolve = async (incapacidadId: string, estado: 'SUBSANADA' | 'VENCIDA') => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/subsanaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incapacidadId, estado }),
      })
      if (res.ok) {
        toast({
          title: estado === 'SUBSANADA' ? '✅ Subsanación completada' : '⚠️ Subsanación vencida',
          description: estado === 'SUBSANADA'
            ? 'La documentación ha sido completada exitosamente. La incapacidad vuelve a validación.'
            : 'El plazo ha vencido sin respuesta del empleado.',
        })
        setDetailSub(null)
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al resolver', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSegundoAviso = async (incapacidadId: string) => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/subsanaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incapacidadId, accion: 'SEGUNDO_AVISO' }),
      })
      if (res.ok) {
        toast({ title: '📨 Segundo aviso enviado', description: 'Se ha enviado un recordatorio al empleado con un nuevo plazo de 3 días hábiles para completar la documentación.' })
        setDetailSub(null)
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al enviar segundo aviso', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => onSectionChange('incapacidades-pendientes')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            Gestionar Subsanacion
          </h2>
          <p className="text-muted-foreground mt-1">Gestione solicitudes de subsanacion</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : subsanaciones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay subsanaciones pendientes</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Radicado</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Docs. Faltantes</TableHead>
                    <TableHead>Fecha Limite</TableHead>
                    <TableHead>Dias Rest.</TableHead>
                    <TableHead>EPS</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subsanaciones.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-mono text-sm">{sub.incapacidad.radicado}</TableCell>
                      <TableCell className="text-sm">{sub.incapacidad.empleado.name}</TableCell>
                      <TableCell className="text-sm text-orange-600 max-w-48 truncate">{sub.documentosFaltantes}</TableCell>
                      <TableCell className="text-sm">{formatDate(sub.fechaLimite)}</TableCell>
                      <TableCell>
                        <Badge className={
                          sub.vencida ? 'bg-red-100 text-red-700 border-0'
                            : sub.urgente ? 'bg-orange-100 text-orange-700 border-0'
                              : sub.diasRestantes <= 3 ? 'bg-yellow-100 text-yellow-700 border-0'
                                : 'bg-green-100 text-green-700 border-0'
                        }>
                          {sub.vencida ? 'Vencido' : `${sub.diasRestantes}d`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{sub.incapacidad.eps.nombre}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-300 hover:bg-blue-50 text-xs"
                            onClick={() => handleViewDetail(sub)}
                          >
                            <FileCheck className="w-3 h-3 mr-1" /> Ver Docs
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-300 hover:bg-green-50 text-xs"
                            onClick={() => handleResolve(sub.incapacidad.id, 'SUBSANADA')}
                            disabled={submitting}
                          >
                            Subsanada
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-orange-600 border-orange-300 hover:bg-orange-50 text-xs"
                            onClick={() => handleSegundoAviso(sub.incapacidad.id)}
                            disabled={submitting}
                          >
                            2do Aviso
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-300 hover:bg-red-50 text-xs"
                            onClick={() => handleResolve(sub.incapacidad.id, 'VENCIDA')}
                            disabled={submitting}
                          >
                            Vencida
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detailSub} onOpenChange={() => setDetailSub(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Documentos - Incapacidad {detailSub?.incapacidad.radicado}</DialogTitle>
            <DialogDescription>
              {detailSub?.incapacidad.empleado.name} - Documentos faltantes: {detailSub?.documentosFaltantes}
            </DialogDescription>
          </DialogHeader>
          {detailSub && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-sm">
                <p className="font-medium text-orange-700">Documentos requeridos:</p>
                <p className="text-orange-600">{detailSub.documentosFaltantes}</p>
              </div>
              {detailLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : detailDocs.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Documentos adjuntos:</p>
                  {detailDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{doc.tipoDocumento.replace(/_/g, ' ')}</span>
                        <span className="text-muted-foreground text-xs">({doc.nombreArchivo})</span>
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
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">El empleado aun no ha subido documentos</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  className="text-green-600 border-green-300 hover:bg-green-50"
                  onClick={() => { handleResolve(detailSub.incapacidad.id, 'SUBSANADA'); setDetailSub(null) }}
                  disabled={submitting}
                >
                  Documentacion Completa
                </Button>
                <Button variant="outline" onClick={() => setDetailSub(null)}>Cerrar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
