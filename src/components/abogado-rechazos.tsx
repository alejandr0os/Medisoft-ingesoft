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
  XCircle,
  Loader2,
  ArrowRight,
  Scale,
  Gavel,
  RefreshCw,
  AlertCircle,
  Eye,
} from 'lucide-react'

interface RechazoEPS {
  id: string
  causal: string
  descripcion: string
  esSubsanable: boolean
  fechaRechazo: string
  observaciones: string | null
}

interface IncapacidadConRechazo {
  id: string
  radicado: string
  tipoNovedad: string
  estado: string
  fechaInicio: string
  diasIncapacidad: number
  empleado: { id: string; name: string; document: string }
  eps: { id: string; nombre: string }
  rechazosEPS: RechazoEPS[]
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
}

export default function AbogadoRechazos({ user }: Props) {
  const { toast } = useToast()
  const [rechazos, setRechazos] = useState<IncapacidadConRechazo[]>([])
  const [loading, setLoading] = useState(true)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [corregirDialogOpen, setCorregirDialogOpen] = useState(false)
  const [selected, setSelected] = useState<IncapacidadConRechazo | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [correccionObs, setCorreccionObs] = useState('')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/incapacidades?estado=RECHAZADA_ENTIDAD')
      if (res.ok) {
        const data = await res.json()
        setRechazos(data.incapacidades || [])
      } else {
        setRechazos([])
        toast({ title: 'Error', description: 'No se pudieron cargar las incapacidades rechazadas', variant: 'destructive' })
      }
    } catch {
      setRechazos([])
      toast({ title: 'Error de conexión', description: 'No se pudo contactar con el servidor', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleViewDetail = (inc: IncapacidadConRechazo) => {
    setSelected(inc)
    setDetailDialogOpen(true)
  }

  const handleCorregir = (inc: IncapacidadConRechazo) => {
    setSelected(inc)
    setCorreccionObs('')
    setCorregirDialogOpen(true)
  }

  const submitCorreccion = async () => {
    if (!selected) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/incapacidades/${selected.id}/corregir-rechazo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observaciones: correccionObs }),
      })
      if (res.ok) {
        toast({ title: '✅ Corrección enviada', description: `La incapacidad ${selected.radicado} ha sido corregida y reenviada a la EPS ${selected.eps.nombre}.` })
        setCorregirDialogOpen(false)
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al corregir', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDerivarPersuasivo = async (inc: IncapacidadConRechazo) => {
    try {
      const res = await fetch(`/api/incapacidades/${inc.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'COBRO_PERSUASIVO' }),
      })
      if (res.ok) {
        toast({ title: '✅ Derivado a Cobro Persuasivo', description: `La incapacidad ${inc.radicado} ha sido derivada a cobro persuasivo contra ${inc.eps.nombre}.` })
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al derivar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    }
  }

  const handleDerivarJuridico = async (inc: IncapacidadConRechazo) => {
    try {
      const res = await fetch('/api/cobro-juridico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incapacidadId: inc.id }),
      })
      if (res.ok) {
        toast({ title: '⚖️ Derivado a Cobro Jurídico', description: `La incapacidad ${inc.radicado} ha sido asignada a cobro jurídico.` })
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al derivar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <XCircle className="w-6 h-6 text-red-500" />
          Rechazos EPS
        </h2>
        <p className="text-muted-foreground mt-1">Gestión de incapacidades rechazadas por entidades EPS</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Rechazadas</p>
                <p className="text-2xl font-bold text-red-600">{rechazos.length}</p>
              </div>
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Subsanables</p>
                <p className="text-2xl font-bold text-amber-600">
                  {rechazos.filter(r => r.rechazosEPS?.some(re => re.esSubsanable)).length}
                </p>
              </div>
              <RefreshCw className="w-5 h-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">No Subsanables</p>
                <p className="text-2xl font-bold">
                  {rechazos.filter(r => r.rechazosEPS?.some(re => !re.esSubsanable)).length}
                </p>
              </div>
              <AlertCircle className="w-5 h-5 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : rechazos.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <XCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay incapacidades rechazadas por EPS</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Incapacidades Rechazadas</CardTitle>
            <CardDescription>Listado de incapacidades con rechazo de EPS</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Radicado</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>EPS</TableHead>
                    <TableHead>Causal</TableHead>
                    <TableHead>Subsanable</TableHead>
                    <TableHead>Fecha Rechazo</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rechazos.map(inc => {
                    const rechazo = inc.rechazosEPS?.[0]
                    return (
                      <TableRow key={inc.id}>
                        <TableCell className="font-mono text-sm">{inc.radicado}</TableCell>
                        <TableCell className="text-sm">{inc.empleado.name}</TableCell>
                        <TableCell className="text-sm">{inc.eps.nombre}</TableCell>
                        <TableCell className="text-sm max-w-48 truncate">{rechazo?.causal || '-'}</TableCell>
                        <TableCell>
                          {rechazo ? (
                            <Badge className={rechazo.esSubsanable ? 'bg-green-100 text-green-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                              {rechazo.esSubsanable ? 'Sí' : 'No'}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-sm">{rechazo ? formatDate(rechazo.fechaRechazo) : '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleViewDetail(inc)} title="Ver detalle">
                              <Eye className="w-4 h-4" />
                            </Button>
                            {rechazo?.esSubsanable && (
                              <Button size="sm" variant="outline" onClick={() => handleCorregir(inc)} className="h-7 text-xs" title="Corregir y reenviar">
                                <RefreshCw className="w-3 h-3 mr-1" /> Corregir
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => handleDerivarPersuasivo(inc)} className="h-7 text-xs" title="Cobro persuasivo">
                              <Scale className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDerivarJuridico(inc)} className="h-7 text-xs" title="Cobro jurídico">
                              <Gavel className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de Rechazo</DialogTitle>
            <DialogDescription>Incapacidad {selected?.radicado}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Empleado</Label>
                  <p className="text-sm font-medium">{selected.empleado.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Documento</Label>
                  <p className="text-sm font-mono">{selected.empleado.document}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">EPS</Label>
                  <p className="text-sm">{selected.eps.nombre}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <div className="mt-1">
                    <Badge className={estadoColors[selected.estado] || 'bg-gray-100 text-gray-700 border-0'}>
                      {estadoLabels[selected.estado] || selected.estado}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha Inicio</Label>
                  <p className="text-sm">{formatDate(selected.fechaInicio)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Días</Label>
                  <p className="text-sm">{selected.diasIncapacidad}</p>
                </div>
              </div>

              {selected.rechazosEPS?.map(rechazo => (
                <Card key={rechazo.id} className="border-red-200 bg-red-50/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="font-medium text-sm">Rechazo EPS</span>
                      <Badge className={rechazo.esSubsanable ? 'bg-green-100 text-green-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                        {rechazo.esSubsanable ? 'Subsanable' : 'No subsanable'}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Causal:</span> {rechazo.causal}</p>
                      <p><span className="text-muted-foreground">Descripción:</span> {rechazo.descripcion}</p>
                      <p><span className="text-muted-foreground">Fecha:</span> {formatDate(rechazo.fechaRechazo)}</p>
                      {rechazo.observaciones && (
                        <p><span className="text-muted-foreground">Observaciones:</span> {rechazo.observaciones}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex gap-2 pt-2">
                {selected.rechazosEPS?.[0]?.esSubsanable && (
                  <Button onClick={() => { setDetailDialogOpen(false); handleCorregir(selected); }}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Corregir y Reenviar
                  </Button>
                )}
                <Button variant="outline" onClick={() => { setDetailDialogOpen(false); handleDerivarPersuasivo(selected); }}>
                  <Scale className="w-4 h-4 mr-2" /> Cobro Persuasivo
                </Button>
                <Button variant="outline" onClick={() => { setDetailDialogOpen(false); handleDerivarJuridico(selected); }}>
                  <Gavel className="w-4 h-4 mr-2" /> Cobro Jurídico
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Corregir Dialog */}
      <Dialog open={corregirDialogOpen} onOpenChange={setCorregirDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Corregir y Reenviar</DialogTitle>
            <DialogDescription>Incapacidad {selected?.radicado}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-amber-50 text-sm border border-amber-200">
                <p className="font-medium text-amber-800">Rechazo subsanable</p>
                <p className="text-amber-700">{selected.rechazosEPS?.[0]?.causal}: {selected.rechazosEPS?.[0]?.descripcion}</p>
              </div>
              <div className="space-y-2">
                <Label>Observaciones de la Corrección</Label>
                <Textarea
                  placeholder="Describa las correcciones realizadas..."
                  value={correccionObs}
                  onChange={e => setCorreccionObs(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCorregirDialogOpen(false)}>Cancelar</Button>
                <Button onClick={submitCorreccion} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Corregir y Reenviar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
