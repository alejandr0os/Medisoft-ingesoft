'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
  RotateCcw,
  Loader2,
  AlertTriangle,
  DollarSign,
  Send,
  CheckCircle2,
  Clock,
} from 'lucide-react'

interface ReintegroCase {
  id: string
  radicado: string
  empleado: { id: string; name: string; document: string; area: string; cargo: string }
  eps: { id: string; nombre: string }
  totalDias: number
  valorPagadoEPS: number
  montoPost180: number
  estadoReintegro: string | null
  montoRecibido: number | null
  montoReintegro: number | null
  observaciones: string | null
  fechaRegistro: string
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
}

const reintegroEstadoLabels: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  NOTIFICADO: 'Notificado',
  RECIBIDO: 'Recibido',
  CERRADO: 'Cerrado',
}

const reintegroEstadoColors: Record<string, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-700 border-0',
  NOTIFICADO: 'bg-blue-100 text-blue-700 border-0',
  RECIBIDO: 'bg-green-100 text-green-700 border-0',
  CERRADO: 'bg-gray-100 text-gray-700 border-0',
}

interface Props {
  user: any
}

export default function ContabilidadReintegros({ user }: Props) {
  const { toast } = useToast()
  const [cases, setCases] = useState<ReintegroCase[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [selectedCase, setSelectedCase] = useState<ReintegroCase | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formMontoRecibido, setFormMontoRecibido] = useState('')
  const [formMontoReintegro, setFormMontoReintegro] = useState('')
  const [formObservaciones, setFormObservaciones] = useState('')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/reintegros')
      if (res.ok) {
        const data = await res.json()
        setCases(data.reintegros || [])
      }
    } catch {
      toast({ title: 'Error de carga', description: 'No se pudieron cargar los casos de reintegro. Intente de nuevo.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const openReintegroDialog = (c: ReintegroCase) => {
    setSelectedCase(c)
    setFormMontoRecibido('')
    setFormMontoReintegro('')
    setFormObservaciones('')
    setDialogOpen(true)
  }

  const openNotifyDialog = (c: ReintegroCase) => {
    setSelectedCase(c)
    setNotifyOpen(true)
  }

  const handleRegistrarReintegro = async () => {
    if (!selectedCase) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/reintegros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incapacidadId: selectedCase.id,
          montoRecibido: parseFloat(formMontoRecibido) || 0,
          montoReintegro: parseFloat(formMontoReintegro) || 0,
          observaciones: formObservaciones,
        }),
      })
      if (res.ok) {
        toast({ title: '✅ Reintegro registrado', description: `El reintegro para ${selectedCase.empleado.name} ha sido registrado por ${formatCurrency(parseFloat(formMontoReintegro) || 0)}.` })
        setDialogOpen(false)
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al registrar reintegro', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleNotificar = async () => {
    if (!selectedCase) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/reintegros/${selectedCase.id}/notificar`, {
        method: 'POST',
      })
      if (res.ok) {
        toast({ title: '📨 Notificación enviada', description: `Se ha notificado a ${selectedCase.empleado.name} sobre el reintegro pendiente de ${formatCurrency(selectedCase.montoPost180)}.` })
        setNotifyOpen(false)
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al notificar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCerrar = async (c: ReintegroCase) => {
    try {
      const res = await fetch(`/api/reintegros/${c.id}/cerrar`, {
        method: 'POST',
      })
      if (res.ok) {
        toast({ title: '✅ Caso cerrado', description: `El reintegro de ${c.empleado.name} (${c.radicado}) ha sido cerrado exitosamente.` })
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al cerrar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    }
  }

  const totalMontoPost180 = cases.reduce((s, c) => s + c.montoPost180, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <RotateCcw className="w-6 h-6 text-primary" />
          Reintegros &gt;180 Días
        </h2>
        <p className="text-muted-foreground mt-1">Gestión de reintegros por incapacidades mayores a 180 días</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Casos de Reintegro</p>
                <p className="text-2xl font-bold">{cases.length}</p>
              </div>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-amber-600">{cases.filter(c => c.estadoReintegro === 'PENDIENTE' || !c.estadoReintegro).length}</p>
              </div>
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Monto Total Post-180</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalMontoPost180)}</p>
              </div>
              <DollarSign className="w-5 h-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : cases.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay casos de reintegro pendientes</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Casos de Reintegro</CardTitle>
            <CardDescription>Incapacidades con más de 180 días acumulados que han recibido pagos de EPS</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Radicado</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>EPS</TableHead>
                    <TableHead className="text-center">Total Días</TableHead>
                    <TableHead className="text-right">Valor Pagado EPS</TableHead>
                    <TableHead className="text-right">Monto Post-180</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-sm">{c.radicado}</TableCell>
                      <TableCell className="text-sm">{c.empleado.name}</TableCell>
                      <TableCell className="text-sm">{c.eps.nombre}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono">{c.totalDias}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(c.valorPagadoEPS)}</TableCell>
                      <TableCell className="text-right text-sm font-medium text-red-600">{formatCurrency(c.montoPost180)}</TableCell>
                      <TableCell>
                        <Badge className={reintegroEstadoColors[c.estadoReintegro || 'PENDIENTE']}>
                          {reintegroEstadoLabels[c.estadoReintegro || 'PENDIENTE']}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {(!c.estadoReintegro || c.estadoReintegro === 'PENDIENTE') && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => openReintegroDialog(c)} className="h-7 text-xs">
                                <DollarSign className="w-3 h-3 mr-1" /> Registrar
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => openNotifyDialog(c)} className="h-7 text-xs">
                                <Send className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          {c.estadoReintegro === 'RECIBIDO' && (
                            <Button size="sm" variant="outline" onClick={() => handleCerrar(c)} className="h-7 text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Cerrar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Registrar Reintegro Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Reintegro</DialogTitle>
            <DialogDescription>
              Incapacidad {selectedCase?.radicado} - {selectedCase?.empleado.name}
            </DialogDescription>
          </DialogHeader>
          {selectedCase && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted text-sm">
                <p><span className="font-medium">EPS:</span> {selectedCase.eps.nombre}</p>
                <p><span className="font-medium">Total días:</span> {selectedCase.totalDias}</p>
                <p><span className="font-medium">Valor pagado EPS:</span> {formatCurrency(selectedCase.valorPagadoEPS)}</p>
                <p><span className="font-medium">Monto post-180:</span> <span className="text-red-600 font-bold">{formatCurrency(selectedCase.montoPost180)}</span></p>
              </div>
              <div className="space-y-2">
                <Label>Monto Recibido *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formMontoRecibido}
                  onChange={e => setFormMontoRecibido(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Monto a Reintegrar *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={formMontoReintegro}
                  onChange={e => setFormMontoReintegro(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Textarea
                  placeholder="Notas sobre el reintegro..."
                  value={formObservaciones}
                  onChange={e => setFormObservaciones(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleRegistrarReintegro} disabled={submitting || !formMontoRecibido || !formMontoReintegro}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Registrar Reintegro
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Notificar Dialog */}
      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notificar Empleado</DialogTitle>
            <DialogDescription>
              Se enviará una notificación al empleado sobre el reintegro pendiente
            </DialogDescription>
          </DialogHeader>
          {selectedCase && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-amber-50 text-sm border border-amber-200">
                <p className="font-medium text-amber-800">Se notificará a:</p>
                <p>{selectedCase.empleado.name} - {selectedCase.empleado.document}</p>
                <p className="mt-1">Monto a reintegrar: <span className="font-bold text-red-600">{formatCurrency(selectedCase.montoPost180)}</span></p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setNotifyOpen(false)}>Cancelar</Button>
                <Button onClick={handleNotificar} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Notificar Empleado
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
