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
  Gavel,
  Loader2,
  Plus,
  Eye,
  Save,
  Scale,
  FileText,
} from 'lucide-react'

interface CobroJuridico {
  id: string
  incapacidadId: string
  analisisLegal: string | null
  estrategia: string | null
  estado: string
  radicadoDP: string | null
  resultado: string | null
  fechaAsignacion: string
  incapacidad: {
    id: string
    radicado: string
    tipoNovedad: string
    diasIncapacidad: number
    valorEsperado: number
    empleado: { id: string; name: string; document: string }
    eps: { id: string; nombre: string }
  }
}

const juridicoEstadoLabels: Record<string, string> = {
  ASIGNADO: 'Asignado',
  DERECHO_PETICION: 'Derecho de Petición',
  TUTELA: 'Tutela',
  DEMANDA: 'Demanda',
  FALLO_FAVORABLE: 'Fallo Favorable',
  FALLO_DEFAVORABLE: 'Fallo Desfavorable',
  CONCILIACION: 'Conciliación',
  CERRADO: 'Cerrado',
}

const juridicoEstadoColors: Record<string, string> = {
  ASIGNADO: 'bg-blue-100 text-blue-700 border-0',
  DERECHO_PETICION: 'bg-amber-100 text-amber-700 border-0',
  TUTELA: 'bg-purple-100 text-purple-700 border-0',
  DEMANDA: 'bg-red-100 text-red-700 border-0',
  FALLO_FAVORABLE: 'bg-green-100 text-green-700 border-0',
  FALLO_DEFAVORABLE: 'bg-rose-100 text-rose-700 border-0',
  CONCILIACION: 'bg-teal-100 text-teal-700 border-0',
  CERRADO: 'bg-gray-100 text-gray-700 border-0',
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
}

interface Props {
  user: LoginUser
}

export default function AbogadoCobroJuridico({ user }: Props) {
  const { toast } = useToast()
  const [casos, setCasos] = useState<CobroJuridico[]>([])
  const [loading, setLoading] = useState(true)
  const [detailOpen, setDetailOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [selected, setSelected] = useState<CobroJuridico | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Edit form state
  const [editAnalisis, setEditAnalisis] = useState('')
  const [editEstrategia, setEditEstrategia] = useState('')
  const [editEstado, setEditEstado] = useState('')
  const [editRadicadoDP, setEditRadicadoDP] = useState('')
  const [editResultado, setEditResultado] = useState('')

  // New cobro juridico
  const [newIncapacidadId, setNewIncapacidadId] = useState('')
  const [incapacidadesDisponibles, setIncapacidadesDisponibles] = useState<Array<{ id: string; radicado: string; empleado: string; eps: string }>>([])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/cobro-juridico')
      if (res.ok) {
        const data = await res.json()
        setCasos(data.cobrosJuridicos || [])
      } else {
        setCasos([])
        toast({ title: 'Error', description: 'No se pudieron cargar los casos de cobro jurídico', variant: 'destructive' })
      }
    } catch {
      setCasos([])
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

  const handleViewDetail = (c: CobroJuridico) => {
    setSelected(c)
    setEditAnalisis(c.analisisLegal || '')
    setEditEstrategia(c.estrategia || '')
    setEditEstado(c.estado)
    setEditRadicadoDP(c.radicadoDP || '')
    setEditResultado(c.resultado || '')
    setDetailOpen(true)
  }

  const handleNew = () => {
    setNewIncapacidadId('')
    loadDisponibles()
    setNewOpen(true)
  }

  const handleSave = async () => {
    if (!selected) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/cobro-juridico', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selected.id,
          analisisLegal: editAnalisis,
          estrategia: editEstrategia,
          estado: editEstado,
          radicadoDP: editRadicadoDP,
          resultado: editResultado,
        }),
      })
      if (res.ok) {
        toast({ title: '✅ Caso actualizado', description: `El cobro jurídico de ${selected.incapacidad?.radicado} ha sido actualizado a estado: ${juridicoEstadoLabels[editEstado] || editEstado}.` })
        setDetailOpen(false)
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

  const handleCreateNew = async () => {
    if (!newIncapacidadId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/cobro-juridico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incapacidadId: newIncapacidadId }),
      })
      if (res.ok) {
        const sel = incapacidadesDisponibles.find(i => i.id === newIncapacidadId)
        toast({ title: '⚖️ Cobro jurídico creado', description: `Se ha iniciado proceso jurídico para la incapacidad ${sel?.radicado || ''} contra ${sel?.eps || ''}.` })
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

  const totalValor = casos.reduce((s, c) => s + (c.incapacidad?.valorEsperado || 0), 0)
  const activos = casos.filter(c => c.estado !== 'CERRADO' && c.estado !== 'FALLO_FAVORABLE').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Gavel className="w-6 h-6 text-primary" />
            Cobro Jurídico
          </h2>
          <p className="text-muted-foreground mt-1">Procesos jurídicos de cobro a EPS</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="w-4 h-4 mr-2" /> Nuevo Cobro Jurídico
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Casos</p>
                <p className="text-2xl font-bold">{casos.length}</p>
              </div>
              <Gavel className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Casos Activos</p>
                <p className="text-2xl font-bold text-amber-600">{activos}</p>
              </div>
              <Scale className="w-5 h-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Valor en Litigio</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalValor)}</p>
              </div>
              <FileText className="w-5 h-5 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : casos.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <Gavel className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay casos de cobro jurídico</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Casos de Cobro Jurídico</CardTitle>
            <CardDescription>Procesos legales activos y cerrados</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Radicado</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>EPS</TableHead>
                    <TableHead>Estado Jurídico</TableHead>
                    <TableHead>Fecha Asignación</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {casos.map(c => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewDetail(c)}>
                      <TableCell className="font-mono text-sm">{c.incapacidad?.radicado}</TableCell>
                      <TableCell className="text-sm">{c.incapacidad?.empleado?.name}</TableCell>
                      <TableCell className="text-sm">{c.incapacidad?.eps?.nombre}</TableCell>
                      <TableCell>
                        <Badge className={juridicoEstadoColors[c.estado] || 'bg-gray-100 text-gray-700 border-0'}>
                          {juridicoEstadoLabels[c.estado] || c.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(c.fechaAsignacion)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost"><Eye className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail/Edit Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle Cobro Jurídico</DialogTitle>
            <DialogDescription>
              {selected?.incapacidad?.radicado} - {selected?.incapacidad?.empleado?.name} vs {selected?.incapacidad?.eps?.nombre}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Valor</Label>
                  <p className="text-sm font-bold">{formatCurrency(selected.incapacidad?.valorEsperado || 0)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Días Incapacidad</Label>
                  <p className="text-sm">{selected.incapacidad?.diasIncapacidad || 0}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha Asignación</Label>
                  <p className="text-sm">{formatDate(selected.fechaAsignacion)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Análisis Legal</Label>
                <Textarea
                  placeholder="Análisis legal del caso..."
                  value={editAnalisis}
                  onChange={e => setEditAnalisis(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Estrategia</Label>
                <Textarea
                  placeholder="Estrategia legal a seguir..."
                  value={editEstrategia}
                  onChange={e => setEditEstrategia(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={editEstado} onValueChange={setEditEstado}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(juridicoEstadoLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Radicado DP</Label>
                  <Input
                    placeholder="Radicado del derecho de petición"
                    value={editRadicadoDP}
                    onChange={e => setEditRadicadoDP(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Resultado</Label>
                <Textarea
                  placeholder="Resultado del proceso jurídico..."
                  value={editResultado}
                  onChange={e => setEditResultado(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Guardar Cambios
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Cobro Jurídico Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Cobro Jurídico</DialogTitle>
            <DialogDescription>Seleccione una incapacidad para iniciar proceso jurídico</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Incapacidad *</Label>
              <Select value={newIncapacidadId} onValueChange={setNewIncapacidadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una incapacidad..." />
                </SelectTrigger>
                <SelectContent>
                  {incapacidadesDisponibles.map(inc => (
                    <SelectItem key={inc.id} value={inc.id}>
                      {inc.radicado} - {inc.empleado} - {inc.eps}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {incapacidadesDisponibles.length === 0 && (
                <p className="text-xs text-muted-foreground">No hay incapacidades disponibles para cobro jurídico</p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateNew} disabled={submitting || !newIncapacidadId}>
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Crear Cobro Jurídico
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
