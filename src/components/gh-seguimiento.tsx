'use client'

import { useState, useEffect, useCallback } from 'react'
import type { LoginUser } from '@/components/login-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  AlertTriangle,
  Loader2,
  CircleDot,
  MessageSquare,
  Shield,
  Clock,
  AlertCircle,
  Bell,
  HeartPulse,
  Archive,
  FileCheck,
  ClipboardCheck,
} from 'lucide-react'

interface AlertaItem {
  id: string
  radicado: string
  estado: string
  tipoNovedad: string
  fechaRegistro: string
  fechaInicio: string
  fechaFin: string
  diasIncapacidad: number
  empleado: { id: string; name: string; document: string; area: string; cargo: string }
  eps: { id: string; nombre: string }
  diasRadicacion: number
  semaforo: 'VERDE' | 'AMARILLO' | 'ROJO'
  alerta90Dias: boolean
  alerta180Dias: boolean
  esProrroga: boolean
  esReporteExtemporaneo: boolean
}

const tipoNovedadLabels: Record<string, string> = {
  ENFERMEDAD_COMUN: 'Enfermedad Común',
  ACCIDENTE_TRANSITO: 'Accidente Tránsito',
  ACCIDENTE_TRABAJO: 'Accidente Trabajo',
  LICENCIA_MATERNIDAD: 'Licencia Maternidad',
  LICENCIA_PATERNIDAD: 'Licencia Paternidad',
  PRORROGA: 'Prórroga',
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
  PENDIENTE_VALIDACION: 'Pend. Validación',
  VALIDADA: 'Validada',
  PENDIENTE_SUBSANACION: 'Pend. Subsanación',
  TRANSCRITA: 'Transcrita',
  EN_COBRO: 'En Cobro',
  PAGADA: 'Pagada',
  ARCHIVADA: 'Archivada',
  RECHAZADA_ENTIDAD: 'Rechazada EPS',
  COBRO_PERSUASIVO: 'Cobro Persuasivo',
  COBRO_JURIDICO: 'Cobro Jurídico',
  GLOSA: 'Glosa',
  SUBSANACION_VENCIDA: 'Subs. Vencida',
  TRAMITE_PENSION: 'Trámite Pensión',
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

export default function GHSeguimiento({ user, section, onSectionChange }: Props) {
  const { toast } = useToast()
  const [data, setData] = useState<{
    resumen: { total: number; verdes: number; amarillos: number; rojos: number; alerta90Dias: number; alerta180Dias: number }
    alertas: AlertaItem[]
    porSemaforo: { verde: AlertaItem[]; amarillo: AlertaItem[]; rojo: AlertaItem[] }
    umbrales: { dias90: AlertaItem[]; dias180: AlertaItem[] }
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtroEPS, setFiltroEPS] = useState('TODAS')
  const [epsList, setEpsList] = useState<Array<{ id: string; nombre: string }>>([])
  const [seguimientoDialogOpen, setSeguimientoDialogOpen] = useState(false)
  const [selectedAlerta, setSelectedAlerta] = useState<AlertaItem | null>(null)
  const [seguimientoNota, setSeguimientoNota] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [archivoDialogOpen, setArchivoDialogOpen] = useState(false)
  const [archivoInc, setArchivoInc] = useState<AlertaItem | null>(null)
  const [archivoData, setArchivoData] = useState<{ estado: string; documentacionCompleta: boolean; historiaClinicaDestruida: boolean; observaciones: string } | null>(null)
  const [archivoLoading, setArchivoLoading] = useState(false)
  const [archivoSubmitting, setArchivoSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/seguimiento-alertas')
      if (res.ok) {
        const jsonData = await res.json()
        setData(jsonData)
        // Extract EPS list
        const epsSet = new Map<string, string>()
        jsonData.alertas?.forEach((a: AlertaItem) => epsSet.set(a.eps.id, a.eps.nombre))
        setEpsList(Array.from(epsSet.entries()).map(([id, nombre]) => ({ id, nombre })))
      } else {
        setData(null)
        toast({ title: 'Error', description: 'No se pudieron cargar las alertas de seguimiento', variant: 'destructive' })
      }
    } catch {
      setData(null)
      toast({ title: 'Error de conexión', description: 'Error al contactar con el servidor', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filterAlertas = (items: AlertaItem[]) => {
    if (filtroEPS === 'TODAS') return items
    return items.filter(a => a.eps.id === filtroEPS)
  }

  const handleAddSeguimiento = async () => {
    if (!selectedAlerta || !seguimientoNota) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/incapacidades/${selectedAlerta.id}/seguimiento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'SEGUIMIENTO_MANUAL',
          observaciones: seguimientoNota,
          tipoAlerta: selectedAlerta.semaforo,
        }),
      })
      if (res.ok) {
        toast({ title: 'Seguimiento agregado', description: `Nota de seguimiento para ${selectedAlerta.radicado} registrada correctamente.` })
        setSeguimientoDialogOpen(false)
        setSeguimientoNota('')
        setSelectedAlerta(null)
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al agregar seguimiento', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleNotify180 = async (item: AlertaItem) => {
    try {
      const res = await fetch(`/api/incapacidades/${item.id}/notificar-180`, { method: 'POST' })
      if (res.ok) {
        toast({ title: '📨 Notificación 180d enviada', description: `Se notificó a ${item.empleado.name} sobre la suspensión de pago y trámite ante Fondo de Pensiones.` })
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al notificar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' })
    }
  }

  const handleRehabRequest = async (item: AlertaItem) => {
    try {
      const res = await fetch(`/api/incapacidades/${item.id}/rehabilitacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'SOLICITAR' }),
      })
      if (res.ok) {
        toast({ title: '✅ Solicitud enviada', description: `Se solicitó concepto de rehabilitación a la EPS ${item.eps.nombre} para ${item.empleado.name}.` })
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al solicitar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' })
    }
  }

  const fetchArchivoStatus = useCallback(async (incId: string) => {
    try {
      setArchivoLoading(true)
      const res = await fetch(`/api/incapacidades/${incId}/archivo`)
      if (res.ok) {
        const data = await res.json()
        setArchivoData(data.archivo || null)
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo cargar el estado del archivo.', variant: 'destructive' })
    } finally {
      setArchivoLoading(false)
    }
  }, [toast])

  const handleArchive = async (item: AlertaItem) => {
    try {
      const res = await fetch(`/api/incapacidades/${item.id}/archivo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'INICIAR' }),
      })
      if (res.ok) {
        toast({ title: '📁 Archivo iniciado', description: `Se inició el proceso de archivo documental para la incapacidad ${item.radicado}.` })
        if (archivoInc?.id === item.id) fetchArchivoStatus(item.id)
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al archivar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' })
    }
  }

  const handleOpenArchivo = (inc: AlertaItem) => {
    setArchivoInc(inc)
    setArchivoData(null)
    setArchivoDialogOpen(true)
    fetchArchivoStatus(inc.id)
  }

  const handleArchivoAction = async (accion: string, extra?: Record<string, unknown>) => {
    if (!archivoInc) return
    setArchivoSubmitting(true)
    try {
      const res = await fetch(`/api/incapacidades/${archivoInc.id}/archivo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, ...extra }),
      })
      if (res.ok) {
        const data = await res.json()
        const accionLabels: Record<string, string> = {
          'INICIAR': '📁 Archivo documental iniciado',
          'ENVIAR_GESTION_DOCUMENTAL': '📤 Enviado a Gestión Documental',
          'COMPLETAR': '✅ Archivo completado exitosamente',
        }
        toast({ title: accionLabels[accion] || '✅ Operación exitosa', description: `Incapacidad ${archivoInc.radicado} procesada correctamente.` })
        fetchArchivoStatus(archivoInc.id)
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al procesar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' })
    } finally {
      setArchivoSubmitting(false)
    }
  }

  const AlertCard = ({ item, color }: { item: AlertaItem; color: 'verde' | 'amarillo' | 'rojo' }) => {
    const borderColor = color === 'verde' ? 'border-l-green-500' : color === 'amarillo' ? 'border-l-yellow-500' : 'border-l-red-500'
    const bgColor = color === 'verde' ? 'bg-green-50/50' : color === 'amarillo' ? 'bg-yellow-50/50' : 'bg-red-50/50'

    return (
      <Card className={`border-l-4 ${borderColor} ${bgColor}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium text-sm">{item.radicado}</span>
                <Badge className={estadoColors[item.estado] || 'bg-gray-100 text-gray-700 border-0 text-xs'}>
                  {estadoLabels[item.estado] || item.estado}
                </Badge>
                {item.alerta90Dias && <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">90d</Badge>}
                {item.alerta180Dias && <Badge className="bg-red-100 text-red-700 border-0 text-xs">180d</Badge>}
              </div>
              <p className="text-sm">{item.empleado.name} | {tipoNovedadLabels[item.tipoNovedad] || item.tipoNovedad}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>EPS: {item.eps.nombre}</span>
                <span>|</span>
                <span>Dias rad: {item.diasRadicacion}</span>
                <span>|</span>
                <span>{item.diasIncapacidad}d incapacidad</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {item.alerta180Dias && (
                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 text-xs" onClick={() => handleNotify180(item)}>
                  <Bell className="w-3 h-3 mr-1" /> Notificar 180d
                </Button>
              )}
              {item.alerta90Dias && (
                <Button size="sm" variant="outline" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 h-7 text-xs" onClick={() => handleRehabRequest(item)}>
                  <HeartPulse className="w-3 h-3 mr-1" /> Rehab
                </Button>
              )}
              {['PAGADA', 'ARCHIVADA'].includes(item.estado) && (
                <Button size="sm" variant="outline" className="text-gray-600 hover:text-gray-700 h-7 text-xs" onClick={() => handleOpenArchivo(item)}>
                  <Archive className="w-3 h-3 mr-1" /> Archivar
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelectedAlerta(item)
                  setSeguimientoDialogOpen(true)
                }}
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            Seguimiento y Alertas
          </h2>
          <p className="text-muted-foreground mt-1">Monitoreo de incapacidades con semáforo de alertas</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">EPS:</Label>
          <Select value={filtroEPS} onValueChange={setFiltroEPS}>
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue placeholder="Todas las EPS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas las EPS</SelectItem>
              {epsList.map(eps => (
                <SelectItem key={eps.id} value={eps.id}>{eps.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      {data?.resumen && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{data.resumen.total}</p>
              <p className="text-xs text-muted-foreground">Total Activas</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50/50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{data.resumen.verdes}</p>
              <p className="text-xs text-muted-foreground">Verde</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50/50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{data.resumen.amarillos}</p>
              <p className="text-xs text-muted-foreground">Amarillo</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50/50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{data.resumen.rojos}</p>
              <p className="text-xs text-muted-foreground">Rojo</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50/50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{data.resumen.alerta90Dias}</p>
              <p className="text-xs text-muted-foreground">Alerta 90d</p>
            </CardContent>
          </Card>
          <Card className="bg-rose-50/50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-rose-600">{data.resumen.alerta180Dias}</p>
              <p className="text-xs text-muted-foreground">Alerta 180d</p>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : !data ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Error al cargar datos de seguimiento</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Verde */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold text-green-700">Verde</h3>
              <Badge className="bg-green-100 text-green-700 border-0 text-xs">{filterAlertas(data.porSemaforo.verde).length}</Badge>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
              {filterAlertas(data.porSemaforo.verde).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin alertas verdes</p>
              ) : (
                filterAlertas(data.porSemaforo.verde).map(item => (
                  <AlertCard key={item.id} item={item} color="verde" />
                ))
              )}
            </div>
          </div>

          {/* Amarillo */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <h3 className="font-semibold text-yellow-700">Amarillo</h3>
              <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs">{filterAlertas(data.porSemaforo.amarillo).length}</Badge>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
              {filterAlertas(data.porSemaforo.amarillo).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin alertas amarillas</p>
              ) : (
                filterAlertas(data.porSemaforo.amarillo).map(item => (
                  <AlertCard key={item.id} item={item} color="amarillo" />
                ))
              )}
            </div>
          </div>

          {/* Rojo */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="font-semibold text-red-700">Rojo</h3>
              <Badge className="bg-red-100 text-red-700 border-0 text-xs">{filterAlertas(data.porSemaforo.rojo).length}</Badge>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
              {filterAlertas(data.porSemaforo.rojo).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin alertas rojas</p>
              ) : (
                filterAlertas(data.porSemaforo.rojo).map(item => (
                  <AlertCard key={item.id} item={item} color="rojo" />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 90 and 180 Day Threshold Alerts */}
      {data?.umbrales && (filterAlertas(data.umbrales.dias90).length > 0 || filterAlertas(data.umbrales.dias180).length > 0) && (
        <div className="space-y-4">
          {filterAlertas(data.umbrales.dias180).length > 0 && (
            <Card className="border-red-200 bg-red-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Alerta 180+ Días
                </CardTitle>
                <CardDescription>Empleados con más de 180 días de incapacidad acumulados - Trámite de pensión</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filterAlertas(data.umbrales.dias180).map(item => (
                    <AlertCard key={item.id} item={item} color="rojo" />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {filterAlertas(data.umbrales.dias90).length > 0 && (
            <Card className="border-amber-200 bg-amber-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-amber-700 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Alerta 90+ Días
                </CardTitle>
                <CardDescription>Empleados con más de 90 días de incapacidad acumulados</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filterAlertas(data.umbrales.dias90).map(item => (
                    <AlertCard key={item.id} item={item} color="amarillo" />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Archivo Documental Dialog */}
      <Dialog open={archivoDialogOpen} onOpenChange={setArchivoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-primary" />
              Archivo Documental
            </DialogTitle>
            <DialogDescription>
              Incapacidad {archivoInc?.radicado} - {archivoInc?.empleado?.name}
            </DialogDescription>
          </DialogHeader>
          {archivoInc && (
            <div className="space-y-4">
              {archivoLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : archivoData ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Badge className={
                      archivoData.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-700 border-0'
                        : archivoData.estado === 'ENVIADO' ? 'bg-blue-100 text-blue-700 border-0'
                          : archivoData.estado === 'COMPLETADO' ? 'bg-green-100 text-green-700 border-0'
                            : 'bg-gray-100 text-gray-700 border-0'
                    }>
                      {archivoData.estado === 'PENDIENTE' ? 'Pendiente' : archivoData.estado === 'ENVIADO' ? 'Enviado a Gestion Doc.' : archivoData.estado === 'COMPLETADO' ? 'Completado' : archivoData.estado}
                    </Badge>
                    <span className="text-sm">Documentacion {archivoData.documentacionCompleta ? 'completa' : 'incompleta'}</span>
                  </div>

                  {archivoData.estado === 'COMPLETADO' && archivoData.historiaClinicaDestruida && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
                      <FileCheck className="w-4 h-4" />
                      Historia clinica destruida conforme normativa
                    </div>
                  )}

                  {archivoData.estado === 'PENDIENTE' && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg border border-dashed border-primary/20 bg-primary/5 text-sm">
                        <p className="font-medium">Siguiente paso: Enviar a Gestion Documental</p>
                        <p className="text-muted-foreground text-xs mt-1">El archivo sera enviado al area de gestion documental para su procesamiento</p>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => handleArchivoAction('ENVIAR_GESTION_DOCUMENTAL')}
                        disabled={archivoSubmitting}
                      >
                        {archivoSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardCheck className="w-4 h-4 mr-2" />}
                        Enviar a Gestion Documental
                      </Button>
                    </div>
                  )}

                  {archivoData.estado === 'ENVIADO' && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg border border-dashed border-green-200 bg-green-50 text-sm">
                        <p className="font-medium">En espera de completar archivo</p>
                        <p className="text-muted-foreground text-xs mt-1">Confirme la destruccion de historia clinica segun normativa para completar el archivo</p>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => handleArchivoAction('COMPLETAR', { historiaClinicaDestruida: true, observaciones: 'Historia clinica destruida conforme normativa vigente' })}
                        disabled={archivoSubmitting}
                      >
                        {archivoSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileCheck className="w-4 h-4 mr-2" />}
                        Completar Archivo y Confirmar Destruccion
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border border-dashed border-yellow-200 bg-yellow-50 text-sm">
                    <p className="font-medium">Iniciar proceso de archivo documental</p>
                    <p className="text-muted-foreground text-xs mt-1">Se creara el registro de archivo para esta incapacidad</p>
                  </div>
                  <Button className="w-full" onClick={() => handleArchivoAction('INICIAR', { documentacionCompleta: true })} disabled={archivoSubmitting}>
                    {archivoSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Archive className="w-4 h-4 mr-2" />}
                    Iniciar Archivo Documental
                  </Button>
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setArchivoDialogOpen(false)}>Cerrar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Seguimiento Dialog */}
      <Dialog open={seguimientoDialogOpen} onOpenChange={setSeguimientoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Seguimiento</DialogTitle>
            <DialogDescription>Incapacidad {selectedAlerta?.radicado} - Semáforo {selectedAlerta?.semaforo}</DialogDescription>
          </DialogHeader>
          {selectedAlerta && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted text-sm">
                <p><span className="font-medium">Empleado:</span> {selectedAlerta.empleado.name}</p>
                <p><span className="font-medium">EPS:</span> {selectedAlerta.eps.nombre}</p>
                <p><span className="font-medium">Días radicación:</span> {selectedAlerta.diasRadicacion}</p>
                <p><span className="font-medium">Estado:</span> {estadoLabels[selectedAlerta.estado]}</p>
              </div>
              <div className="space-y-2">
                <Label>Nota de Seguimiento *</Label>
                <Textarea
                  placeholder="Describa la gestión realizada..."
                  value={seguimientoNota}
                  onChange={e => setSeguimientoNota(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSeguimientoDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddSeguimiento} disabled={submitting || !seguimientoNota}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />}
                  Guardar Seguimiento
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
