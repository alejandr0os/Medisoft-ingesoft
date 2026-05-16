'use client'

import { useState, useEffect, useCallback } from 'react'
import type { LoginUser } from '@/components/login-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  BarChart3,
  Loader2,
  AlertTriangle,
  FileText,
  Shield,
  CheckCircle2,
  Clock,
  User,
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
  esProrroga: boolean
  fechaRegistro: string
  empleado: { id: string; name: string; document: string; area: string; cargo: string; salary: number }
  eps: { id: string; nombre: string; nit: string }
  seguimientos: Array<{
    id: string
    accion: string
    observaciones: string | null
    fechaGestion: string
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

export default function GHLargoPlazo({ user, section, onSectionChange }: Props) {
  const { toast } = useToast()
  const [incapacidades, setIncapacidades] = useState<Incapacidad[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInc, setSelectedInc] = useState<Incapacidad | null>(null)
  const [accionDialogOpen, setAccionDialogOpen] = useState(false)
  const [accionTipo, setAccionTipo] = useState<'rehabilitacion' | 'concepto' | 'pension'>('rehabilitacion')
  const [accionNota, setAccionNota] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/incapacidades')
      if (res.ok) {
        const data = await res.json()
        // Filter >90 days accumulated, active states
        const largoPlazo = (data.incapacidades || []).filter(
          (inc: Incapacidad) => inc.diasAcumulados >= 90 && !['PAGADA', 'ARCHIVADA', 'SUBSANACION_VENCIDA'].includes(inc.estado)
        )
        setIncapacidades(largoPlazo)
      } else {
        setIncapacidades([])
        toast({ title: 'Error', description: 'No se pudieron cargar los casos de largo plazo', variant: 'destructive' })
      }
    } catch {
      setIncapacidades([])
      toast({ title: 'Error de conexión', description: 'No se pudo contactar con el servidor', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAccion = async () => {
    if (!selectedInc) return
    setSubmitting(true)
    try {
      const accionMap = {
        rehabilitacion: 'SOLICITUD_CONCEPTO_REHABILITACION',
        concepto: 'CARGA_CONCEPTO_MEDICO',
        pension: 'CONFIRMA_TRAMITE_FONDO_PENSIONES',
      }

      const res = await fetch(`/api/incapacidades/${selectedInc.id}/seguimiento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: accionMap[accionTipo],
          observaciones: accionNota,
        }),
      })

      if (res.ok) {
        // If pension, update estado
        if (accionTipo === 'pension') {
          await fetch(`/api/incapacidades/${selectedInc.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: 'TRAMITE_PENSION' }),
          })
        }

        toast({
          title: '✅ Acción registrada',
          description: `${accionTipo === 'rehabilitacion' ? 'Solicitud de concepto de rehabilitación' : accionTipo === 'concepto' ? 'Concepto médico cargado' : 'Trámite de fondo de pensiones confirmado'} para ${selectedInc.empleado.name} (Incapacidad ${selectedInc.radicado}).`,
        })
        setAccionDialogOpen(false)
        setAccionNota('')
        setSelectedInc(null)
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al registrar acción', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const openAccion = (inc: Incapacidad, tipo: 'rehabilitacion' | 'concepto' | 'pension') => {
    setSelectedInc(inc)
    setAccionTipo(tipo)
    setAccionNota('')
    setAccionDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          Casos Largo Plazo
        </h2>
        <p className="text-muted-foreground mt-1">Incapacidades con más de 90 días acumulados</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="bg-amber-50/50 border-amber-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{incapacidades.filter(i => i.diasAcumulados >= 90 && i.diasAcumulados < 180).length}</p>
            <p className="text-xs text-muted-foreground">90-179 días</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50/50 border-red-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{incapacidades.filter(i => i.diasAcumulados >= 180).length}</p>
            <p className="text-xs text-muted-foreground">180+ días</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50/50 border-purple-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">{incapacidades.filter(i => i.estado === 'TRAMITE_PENSION').length}</p>
            <p className="text-xs text-muted-foreground">Trámite Pensión</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Empleados con Incapacidades de Largo Plazo</CardTitle>
          <CardDescription>{incapacidades.length} casos activos</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : incapacidades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay casos de largo plazo activos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Radicado</TableHead>
                    <TableHead>EPS</TableHead>
                    <TableHead>Días Acum.</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incapacidades
                    .sort((a, b) => b.diasAcumulados - a.diasAcumulados)
                    .map((inc) => (
                    <TableRow key={inc.id} className={inc.diasAcumulados >= 180 ? 'bg-red-50/50' : inc.diasAcumulados >= 120 ? 'bg-amber-50/30' : ''}>
                      <TableCell className="font-medium text-sm">{inc.empleado.name}</TableCell>
                      <TableCell className="text-sm">{inc.empleado.area}</TableCell>
                      <TableCell className="font-mono text-sm">{inc.radicado}</TableCell>
                      <TableCell className="text-sm">{inc.eps.nombre}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            inc.diasAcumulados >= 180 ? 'bg-red-100 text-red-700 border-0'
                              : inc.diasAcumulados >= 150 ? 'bg-rose-100 text-rose-700 border-0'
                                : inc.diasAcumulados >= 120 ? 'bg-orange-100 text-orange-700 border-0'
                                  : 'bg-amber-100 text-amber-700 border-0'
                          }>
                            {inc.diasAcumulados}d
                          </Badge>
                          {inc.diasAcumulados >= 180 && (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          )}
                          {inc.diasAcumulados >= 150 && inc.diasAcumulados < 180 && (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={estadoColors[inc.estado] || 'bg-gray-100 text-gray-700 border-0 text-xs'}>
                          {estadoLabels[inc.estado] || inc.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-amber-600 hover:bg-amber-50"
                            onClick={() => openAccion(inc, 'rehabilitacion')}
                            title="Solicitar Concepto Rehabilitación"
                          >
                            <Shield className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-blue-600 hover:bg-blue-50"
                            onClick={() => openAccion(inc, 'concepto')}
                            title="Cargar Concepto Médico"
                          >
                            <FileText className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-purple-600 hover:bg-purple-50"
                            onClick={() => openAccion(inc, 'pension')}
                            title="Confirmar Trámite Fondo de Pensiones"
                          >
                            <Clock className="w-3 h-3" />
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

      {/* Accion Dialog */}
      <Dialog open={accionDialogOpen} onOpenChange={setAccionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {accionTipo === 'rehabilitacion' && 'Solicitar Concepto de Rehabilitación'}
              {accionTipo === 'concepto' && 'Cargar Concepto Médico'}
              {accionTipo === 'pension' && 'Confirmar Trámite Fondo de Pensiones'}
            </DialogTitle>
            <DialogDescription>
              Incapacidad {selectedInc?.radicado} - {selectedInc?.empleado.name}
            </DialogDescription>
          </DialogHeader>
          {selectedInc && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Empleado:</span> {selectedInc.empleado.name}</div>
                  <div><span className="text-muted-foreground">Días acumulados:</span> <span className="font-bold">{selectedInc.diasAcumulados}</span></div>
                  <div><span className="text-muted-foreground">EPS:</span> {selectedInc.eps.nombre}</div>
                  <div><span className="text-muted-foreground">Estado:</span> {estadoLabels[selectedInc.estado]}</div>
                </div>
              </div>

              {accionTipo === 'pension' && (
                <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 text-sm text-purple-700">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Al confirmar el trámite de fondo de pensiones, el estado cambiará a &quot;Trámite Pensión&quot;.
                </div>
              )}

              {accionTipo === 'rehabilitacion' && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Se solicitará el Concepto de Rehabilitación para el empleado con {selectedInc.diasAcumulados} días acumulados.
                </div>
              )}

              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Textarea
                  placeholder="Observaciones adicionales..."
                  value={accionNota}
                  onChange={e => setAccionNota(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAccionDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleAccion} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Confirmar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
