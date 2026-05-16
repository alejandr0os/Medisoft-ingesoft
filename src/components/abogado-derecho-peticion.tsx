'use client'

import { useState, useEffect, useCallback } from 'react'
import type { LoginUser } from '@/components/login-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  FileText,
  Loader2,
  Plus,
  Eye,
  Save,
  Send,
  AlertTriangle,
  Clock,
  Pencil,
} from 'lucide-react'

interface DerechoPeticion {
  id: string
  incapacidadId: string
  tipo: string
  estado: string
  radicadoDP: string | null
  contenido: string | null
  respuesta: string | null
  fechaRadicacion: string | null
  fechaCreacion: string
  fechaRespuesta: string | null
  incapacidad: {
    id: string
    radicado: string
    empleado: { name: string; document: string }
    eps: { nombre: string }
  }
}

const dpTipoLabels: Record<string, string> = {
  FALTA_PAGO: 'Falta de Pago',
  GLOSA_INJUSTIFICADA: 'Glosa Injustificada',
  FALTA_RESPUESTA: 'Falta de Respuesta',
}

const dpTipoColors: Record<string, string> = {
  FALTA_PAGO: 'bg-red-100 text-red-700 border-0',
  GLOSA_INJUSTIFICADA: 'bg-orange-100 text-orange-700 border-0',
  FALTA_RESPUESTA: 'bg-amber-100 text-amber-700 border-0',
}

const dpEstadoLabels: Record<string, string> = {
  BORRADOR: 'Borrador',
  RADICADO: 'Radicado',
  RESPONDIDO: 'Respondido',
  SIN_RESPUESTA: 'Sin Respuesta',
  VENCIDO: 'Vencido',
}

const dpEstadoColors: Record<string, string> = {
  BORRADOR: 'bg-gray-100 text-gray-700 border-0',
  RADICADO: 'bg-blue-100 text-blue-700 border-0',
  RESPONDIDO: 'bg-green-100 text-green-700 border-0',
  SIN_RESPUESTA: 'bg-amber-100 text-amber-700 border-0',
  VENCIDO: 'bg-red-100 text-red-700 border-0',
}

const dpTemplates: Record<string, string> = {
  FALTA_PAGO: `Señores EPS,\n\nMediante la presente, me permito solicitar el pago de la incapacidad radicada bajo el número [RADICADO], correspondiente al empleado [EMPLEADO], la cual se encuentra pendiente de pago pese a haber cumplido con todos los requisitos legales.\n\nSolicitamos el pago inmediato de conformidad con la normativa vigente.`,
  GLOSA_INJUSTIFICADA: `Señores EPS,\n\nNos dirigimos a ustedes para solicitar la revisión de la glosa aplicada a la incapacidad radicada bajo el número [RADICADO], del empleado [EMPLEADO], considerando que dicha glosa carece de fundamento legal.\n\nSolicitamos el levantamiento de la glosa y el pago correspondiente.`,
  FALTA_RESPUESTA: `Señores EPS,\n\nMediante la presente, solicitamos respuesta oportuna a la solicitud relacionada con la incapacidad radicada bajo el número [RADICADO], del empleado [EMPLEADO], la cual no ha recibido respuesta dentro del término legal establecido.\n\nExigimos respuesta en los términos de ley.`,
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}

function getDiasDesdeRadicacion(fechaRadicacion: string | null): number {
  if (!fechaRadicacion) return 0
  const diff = Date.now() - new Date(fechaRadicacion).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

interface Props {
  user: LoginUser
}

export default function AbogadoDerechoPeticion({ user }: Props) {
  const { toast } = useToast()
  const [derechos, setDerechos] = useState<DerechoPeticion[]>([])
  const [loading, setLoading] = useState(true)
  const [newOpen, setNewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selected, setSelected] = useState<DerechoPeticion | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // New form state
  const [newIncapacidadId, setNewIncapacidadId] = useState('')
  const [newTipo, setNewTipo] = useState('FALTA_PAGO')
  const [newContenido, setNewContenido] = useState('')
  const [incapacidadesDisponibles, setIncapacidadesDisponibles] = useState<Array<{ id: string; radicado: string; empleado: string; eps: string }>>([])

  // Edit form state
  const [editRadicadoDP, setEditRadicadoDP] = useState('')
  const [editRespuesta, setEditRespuesta] = useState('')
  const [editEstado, setEditEstado] = useState('')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/derecho-peticion')
      if (res.ok) {
        const data = await res.json()
        setDerechos(data.derechosPeticion || [])
      } else {
        setDerechos([])
        toast({ title: 'Error', description: 'No se pudieron cargar los derechos de petición', variant: 'destructive' })
      }
    } catch {
      setDerechos([])
      toast({ title: 'Error de conexión', description: 'No se pudo contactar con el servidor', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const loadDisponibles = async () => {
    try {
      const [persRes, jurRes] = await Promise.all([
        fetch('/api/incapacidades?estado=COBRO_PERSUASIVO'),
        fetch('/api/incapacidades?estado=COBRO_JURIDICO'),
      ])
      const items: Array<{ id: string; radicado: string; empleado: string; eps: string }> = []
      if (persRes.ok) {
        const data = await persRes.json()
        ;(data.incapacidades || []).forEach((inc: any) => {
          items.push({ id: inc.id, radicado: inc.radicado, empleado: inc.empleado?.name || '', eps: inc.eps?.nombre || '' })
        })
      }
      if (jurRes.ok) {
        const data = await jurRes.json()
        ;(data.incapacidades || []).forEach((inc: any) => {
          if (!items.find(i => i.id === inc.id)) {
            items.push({ id: inc.id, radicado: inc.radicado, empleado: inc.empleado?.name || '', eps: inc.eps?.nombre || '' })
          }
        })
      }
      setIncapacidadesDisponibles(items)
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar las incapacidades disponibles.', variant: 'destructive' })
    }
  }

  const handleNew = () => {
    setNewIncapacidadId('')
    setNewTipo('FALTA_PAGO')
    setNewContenido(dpTemplates['FALTA_PAGO'])
    loadDisponibles()
    setNewOpen(true)
  }

  const handleNewTipoChange = (tipo: string) => {
    setNewTipo(tipo)
    setNewContenido(dpTemplates[tipo] || '')
  }

  const handleEdit = (dp: DerechoPeticion) => {
    setSelected(dp)
    setEditRadicadoDP(dp.radicadoDP || '')
    setEditRespuesta(dp.respuesta || '')
    setEditEstado(dp.estado)
    setEditOpen(true)
  }

  const handleSaveNew = async (radicar: boolean) => {
    if (!newIncapacidadId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/derecho-peticion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incapacidadId: newIncapacidadId,
          tipo: newTipo,
          contenido: newContenido,
          estado: radicar ? 'RADICADO' : 'BORRADOR',
        }),
      })
      if (res.ok) {
        toast({
          title: radicar ? '📨 Derecho de Petición radicado' : '💾 Borrador guardado',
          description: radicar ? `Se ha radicado el derecho de petición por ${dpTipoLabels[newTipo] || newTipo}.` : 'El borrador ha sido guardado exitosamente.'
        })
        setNewOpen(false)
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al crear', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!selected) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/derecho-peticion/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          radicadoDP: editRadicadoDP,
          respuesta: editRespuesta,
          estado: editEstado,
        }),
      })
      if (res.ok) {
        toast({ title: '✅ Derecho de Petición actualizado', description: `Los cambios del DP para ${selected.incapacidad?.radicado} han sido guardados. Estado: ${dpEstadoLabels[editEstado] || editEstado}.` })
        setEditOpen(false)
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al guardar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const alertas15Dias = derechos.filter(dp => {
    if (dp.estado !== 'RADICADO') return false
    const dias = getDiasDesdeRadicacion(dp.fechaRadicacion)
    return dias >= 15
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Derecho de Petición
          </h2>
          <p className="text-muted-foreground mt-1">Redacción y radicación de derechos de petición a EPS</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="w-4 h-4 mr-2" /> Nuevo Derecho de Petición
        </Button>
      </div>

      {/* Alert for 15 days without response */}
      {alertas15Dias.length > 0 && (
        <Card className="border-red-200 bg-red-50/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Alerta: {alertas15Dias.length} derecho(s) de petición sin respuesta después de 15 días</p>
                <p className="text-xs text-red-600 mt-1">
                  {alertas15Dias.map(dp => dp.incapacidad?.radicado).join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{derechos.length}</p>
              </div>
              <FileText className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Borradores</p>
                <p className="text-2xl font-bold text-gray-600">{derechos.filter(d => d.estado === 'BORRADOR').length}</p>
              </div>
              <Pencil className="w-5 h-5 text-gray-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Radicados</p>
                <p className="text-2xl font-bold text-blue-600">{derechos.filter(d => d.estado === 'RADICADO').length}</p>
              </div>
              <Send className="w-5 h-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Sin Respuesta +15d</p>
                <p className="text-2xl font-bold text-red-600">{alertas15Dias.length}</p>
              </div>
              <Clock className="w-5 h-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : derechos.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay derechos de petición registrados</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Derechos de Petición</CardTitle>
            <CardDescription>Listado de todos los derechos de petición</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Incapacidad</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Radicado DP</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Días sin Resp.</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {derechos.map(dp => {
                    const diasSinResp = dp.estado === 'RADICADO' ? getDiasDesdeRadicacion(dp.fechaRadicacion) : 0
                    return (
                      <TableRow key={dp.id}>
                        <TableCell className="font-mono text-sm">{dp.incapacidad?.radicado}</TableCell>
                        <TableCell>
                          <Badge className={dpTipoColors[dp.tipo] || 'bg-gray-100 text-gray-700 border-0'}>
                            {dpTipoLabels[dp.tipo] || dp.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={dpEstadoColors[dp.estado] || 'bg-gray-100 text-gray-700 border-0'}>
                            {dpEstadoLabels[dp.estado] || dp.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono">{dp.radicadoDP || '-'}</TableCell>
                        <TableCell className="text-sm">{formatDate(dp.fechaCreacion)}</TableCell>
                        <TableCell>
                          {dp.estado === 'RADICADO' ? (
                            <span className={diasSinResp >= 15 ? 'text-red-600 font-bold' : diasSinResp >= 10 ? 'text-amber-600' : 'text-sm'}>
                              {diasSinResp}d
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(dp)} title="Editar">
                            <Eye className="w-4 h-4" />
                          </Button>
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

      {/* New Derecho de Petición Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Derecho de Petición</DialogTitle>
            <DialogDescription>Redacte y radique un nuevo derecho de petición</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Incapacidad *</Label>
                <Select value={newIncapacidadId} onValueChange={setNewIncapacidadId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {incapacidadesDisponibles.map(inc => (
                      <SelectItem key={inc.id} value={inc.id}>
                        {inc.radicado} - {inc.empleado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={newTipo} onValueChange={handleNewTipoChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(dpTipoLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Contenido *</Label>
                <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setNewContenido(dpTemplates[newTipo] || '')}>
                  Usar plantilla
                </Button>
              </div>
              <Textarea
                placeholder="Redacte el contenido del derecho de petición..."
                value={newContenido}
                onChange={e => setNewContenido(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button>
              <Button variant="outline" onClick={() => handleSaveNew(false)} disabled={submitting || !newIncapacidadId || !newContenido}>
                Guardar Borrador
              </Button>
              <Button onClick={() => handleSaveNew(true)} disabled={submitting || !newIncapacidadId || !newContenido}>
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Radicar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Derecho de Petición Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Derecho de Petición</DialogTitle>
            <DialogDescription>
              {selected?.incapacidad?.radicado} - {selected?.incapacidad?.empleado?.name} vs {selected?.incapacidad?.eps?.nombre}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <div className="mt-1">
                    <Badge className={dpTipoColors[selected.tipo] || 'bg-gray-100 text-gray-700 border-0'}>
                      {dpTipoLabels[selected.tipo] || selected.tipo}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Creado</Label>
                  <p className="text-sm">{formatDate(selected.fechaCreacion)}</p>
                </div>
              </div>

              {selected.contenido && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Contenido</Label>
                  <div className="p-3 bg-muted/30 rounded-lg text-sm whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                    {selected.contenido}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={editEstado} onValueChange={setEditEstado}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(dpEstadoLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Radicado DP</Label>
                  <Input
                    placeholder="Número de radicado"
                    value={editRadicadoDP}
                    onChange={e => setEditRadicadoDP(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Respuesta de la EPS</Label>
                <Textarea
                  placeholder="Respuesta recibida de la EPS..."
                  value={editRespuesta}
                  onChange={e => setEditRespuesta(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveEdit} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Guardar Cambios
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
