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
  Scale,
  Loader2,
  Gavel,
  MessageSquare,
  Clock,
  FileText,
  Eye,
  Send,
  AlertTriangle,
} from 'lucide-react'

interface SeguimientoItem {
  id: string
  accion: string
  observaciones: string
  createdAt: string
  usuario: { name: string }
}

interface IncapacidadPersuasivo {
  id: string
  radicado: string
  tipoNovedad: string
  estado: string
  fechaInicio: string
  diasIncapacidad: number
  valorEsperado: number
  empleado: { id: string; name: string; document: string }
  eps: { id: string; nombre: string }
  seguimientos: SeguimientoItem[]
  diasEnCobroPersuasivo: number
}

const tipoNovedadLabels: Record<string, string> = {
  ENFERMEDAD_COMUN: 'Enfermedad Común',
  ACCIDENTE_TRANSITO: 'Accidente Tránsito',
  ACCIDENTE_TRABAJO: 'Accidente Trabajo',
  LICENCIA_MATERNIDAD: 'Licencia Maternidad',
  LICENCIA_PATERNIDAD: 'Licencia Paternidad',
  PRORROGA: 'Prórroga',
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

export default function AbogadoCobroPersuasivo({ user }: Props) {
  const { toast } = useToast()
  const [casos, setCasos] = useState<IncapacidadPersuasivo[]>([])
  const [loading, setLoading] = useState(true)
  const [detailOpen, setDetailOpen] = useState(false)
  const [requerimientoOpen, setRequerimientoOpen] = useState(false)
  const [selected, setSelected] = useState<IncapacidadPersuasivo | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [requerimientoTipo, setRequerimientoTipo] = useState<'primero' | 'segundo'>('primero')
  const [requerimientoNota, setRequerimientoNota] = useState('')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/incapacidades?estado=COBRO_PERSUASIVO')
      if (res.ok) {
        const data = await res.json()
        setCasos(data.incapacidades || [])
      } else {
        setCasos([])
        toast({ title: 'Error', description: 'No se pudieron cargar los casos de cobro persuasivo', variant: 'destructive' })
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

  const handleViewDetail = (c: IncapacidadPersuasivo) => {
    setSelected(c)
    setDetailOpen(true)
  }

  const handleRequerimiento = (c: IncapacidadPersuasivo, tipo: 'primero' | 'segundo') => {
    setSelected(c)
    setRequerimientoTipo(tipo)
    setRequerimientoNota('')
    setRequerimientoOpen(true)
  }

  const submitRequerimiento = async () => {
    if (!selected) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/incapacidades/${selected.id}/seguimiento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: requerimientoTipo === 'primero' ? 'PRIMER_REQUERIMIENTO' : 'SEGUNDO_REQUERIMIENTO',
          observaciones: requerimientoNota,
        }),
      })
      if (res.ok) {
        toast({
          title: requerimientoTipo === 'primero' ? '📨 Primer requerimiento enviado' : '⚠️ Segundo requerimiento enviado',
          description: `Requerimiento de pago registrado para ${selected.radicado} contra ${selected.eps.nombre}.`
        })
        setRequerimientoOpen(false)
        fetchData()
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

  const handleDerivarJuridico = async (c: IncapacidadPersuasivo) => {
    try {
      const res = await fetch('/api/cobro-persuasivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incapacidadId: c.id, accion: 'derivar_juridico' }),
      })
      if (res.ok) {
        toast({ title: '⚖️ Derivado a Cobro Jurídico', description: `El caso ${c.radicado} ha sido derivado a cobro jurídico contra ${c.eps.nombre}.` })
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al derivar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    }
  }

  const totalValor = casos.reduce((s, c) => s + (c.valorEsperado || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Scale className="w-6 h-6 text-primary" />
          Cobro Persuasivo
        </h2>
        <p className="text-muted-foreground mt-1">Gestión de cobros persuasivos a EPS mediante requerimientos</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Casos Activos</p>
                <p className="text-2xl font-bold">{casos.length}</p>
              </div>
              <Scale className="w-5 h-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Valor Total en Cobro</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalValor)}</p>
              </div>
              <FileText className="w-5 h-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Sin Requerimiento</p>
                <p className="text-2xl font-bold text-red-600">
                  {casos.filter(c => !c.seguimientos?.some(s => s.accion === 'PRIMER_REQUERIMIENTO' || s.accion === 'SEGUNDO_REQUERIMIENTO')).length}
                </p>
              </div>
              <AlertTriangle className="w-5 h-5 text-red-500" />
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
            <Scale className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay casos en cobro persuasivo</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Casos en Cobro Persuasivo</CardTitle>
            <CardDescription>Incapacidades en proceso de cobro persuasivo</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Radicado</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>EPS</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Días en Cobro</TableHead>
                    <TableHead>Requerimientos</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {casos.map(c => {
                    const hasPrimer = c.seguimientos?.some(s => s.accion === 'PRIMER_REQUERIMIENTO')
                    const hasSegundo = c.seguimientos?.some(s => s.accion === 'SEGUNDO_REQUERIMIENTO')
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-sm">{c.radicado}</TableCell>
                        <TableCell className="text-sm">{c.empleado.name}</TableCell>
                        <TableCell className="text-sm">{c.eps.nombre}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatCurrency(c.valorEsperado || 0)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono">{c.diasEnCobroPersuasivo || 0}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge className={hasPrimer ? 'bg-green-100 text-green-700 border-0 text-[10px]' : 'bg-gray-100 text-gray-500 border-0 text-[10px]'}>
                              1er
                            </Badge>
                            <Badge className={hasSegundo ? 'bg-green-100 text-green-700 border-0 text-[10px]' : 'bg-gray-100 text-gray-500 border-0 text-[10px]'}>
                              2do
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleViewDetail(c)} title="Ver detalle">
                              <Eye className="w-4 h-4" />
                            </Button>
                            {!hasPrimer && (
                              <Button size="sm" variant="outline" onClick={() => handleRequerimiento(c, 'primero')} className="h-7 text-xs">
                                <Send className="w-3 h-3 mr-1" /> 1er Req.
                              </Button>
                            )}
                            {hasPrimer && !hasSegundo && (
                              <Button size="sm" variant="outline" onClick={() => handleRequerimiento(c, 'segundo')} className="h-7 text-xs">
                                <Send className="w-3 h-3 mr-1" /> 2do Req.
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => handleDerivarJuridico(c)} className="h-7 text-xs" title="Derivar a cobro jurídico">
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
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Cobro Persuasivo</DialogTitle>
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
                  <Label className="text-xs text-muted-foreground">EPS</Label>
                  <p className="text-sm">{selected.eps.nombre}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Valor</Label>
                  <p className="text-sm font-bold">{formatCurrency(selected.valorEsperado || 0)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Días en Cobro Persuasivo</Label>
                  <p className="text-sm">{selected.diasEnCobroPersuasivo || 0} días</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha Inicio</Label>
                  <p className="text-sm">{formatDate(selected.fechaInicio)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <p className="text-sm">{tipoNovedadLabels[selected.tipoNovedad] || selected.tipoNovedad}</p>
                </div>
              </div>

              {/* Seguimiento History */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Historial de Seguimiento</Label>
                {selected.seguimientos?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay seguimientos registrados</p>
                ) : (
                  <div className="space-y-2">
                    {selected.seguimientos?.map(seg => (
                      <div key={seg.id} className="flex gap-3 p-2 bg-muted/30 rounded-lg text-sm">
                        <div className="shrink-0">
                          <Badge className={
                            seg.accion.includes('REQUERIMIENTO') ? 'bg-blue-100 text-blue-700 border-0 text-[10px]'
                              : 'bg-gray-100 text-gray-700 border-0 text-[10px]'
                          }>
                            {seg.accion.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="flex-1">
                          <p>{seg.observaciones || '-'}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(seg.createdAt)} | {seg.usuario?.name || 'Sistema'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => { setDetailOpen(false); handleRequerimiento(selected, 'primero'); }}>
                  <Send className="w-4 h-4 mr-2" /> Primer Requerimiento
                </Button>
                <Button variant="outline" onClick={() => { setDetailOpen(false); handleRequerimiento(selected, 'segundo'); }}>
                  <MessageSquare className="w-4 h-4 mr-2" /> Segundo Requerimiento
                </Button>
                <Button variant="outline" onClick={() => { setDetailOpen(false); handleDerivarJuridico(selected); }}>
                  <Gavel className="w-4 h-4 mr-2" /> Derivar a Jurídico
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Requerimiento Dialog */}
      <Dialog open={requerimientoOpen} onOpenChange={setRequerimientoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{requerimientoTipo === 'primero' ? 'Primer Requerimiento' : 'Segundo Requerimiento'}</DialogTitle>
            <DialogDescription>
              Incapacidad {selected?.radicado} - {selected?.eps.nombre}
              {requerimientoTipo === 'segundo' && ' - Con advertencia legal'}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {requerimientoTipo === 'segundo' && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-500 inline mr-1" />
                  <span className="font-medium text-amber-800">Segundo requerimiento con advertencia legal:</span>
                  <p className="text-amber-700 mt-1">Se advierte que de no proceder al pago, se iniciará proceso jurídico conforme a la ley.</p>
                </div>
              )}
              <div className="p-3 rounded-lg bg-muted text-sm">
                <p><span className="font-medium">Empleado:</span> {selected.empleado.name}</p>
                <p><span className="font-medium">EPS:</span> {selected.eps.nombre}</p>
                <p><span className="font-medium">Valor:</span> {formatCurrency(selected.valorEsperado || 0)}</p>
                <p><span className="font-medium">Días en cobro:</span> {selected.diasEnCobroPersuasivo || 0}</p>
              </div>
              <div className="space-y-2">
                <Label>Nota del Requerimiento *</Label>
                <Textarea
                  placeholder={requerimientoTipo === 'primero'
                    ? 'Describa el primer requerimiento de pago...'
                    : 'Describa el segundo requerimiento con advertencia legal...'
                  }
                  value={requerimientoNota}
                  onChange={e => setRequerimientoNota(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRequerimientoOpen(false)}>Cancelar</Button>
                <Button onClick={submitRequerimiento} disabled={submitting || !requerimientoNota}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Registrar Requerimiento
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
