'use client'

import { useState, useEffect, useCallback } from 'react'
import type { LoginUser } from '@/components/login-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
  DollarSign,
  Loader2,
  FileText,
  Package,
  CheckCircle2,
} from 'lucide-react'

interface Incapacidad {
  id: string
  radicado: string
  tipoNovedad: string
  estado: string
  fechaInicio: string
  fechaFin: string
  diasIncapacidad: number
  diagnosticoCIE10: string | null
  empleado: { id: string; name: string; document: string; area: string; cargo: string; salary: number }
  eps: { id: string; nombre: string; nit: string }
}

interface DetalleCobro {
  id: string
  incapacidadId: string
  valorEsperado: number
  valorPagado: number | null
  estado: string
  observaciones: string | null
  incapacidad: {
    id: string
    radicado: string
    diasIncapacidad: number
    empleado: { id: string; name: string; document: string; area: string; salary: number }
  }
}

interface LoteCobro {
  id: string
  numeroLote: string
  epsId: string
  estado: string
  valorTotal: number
  fechaGeneracion: string
  fechaEnvio: string | null
  observaciones: string | null
  eps: { id: string; nombre: string; nit: string }
  detalles: DetalleCobro[]
}

const tipoNovedadLabels: Record<string, string> = {
  ENFERMEDAD_COMUN: 'Enfermedad Común',
  ACCIDENTE_TRANSITO: 'Accidente Tránsito',
  ACCIDENTE_TRABAJO: 'Accidente Trabajo',
  LICENCIA_MATERNIDAD: 'Licencia Maternidad',
  LICENCIA_PATERNIDAD: 'Licencia Paternidad',
  PRORROGA: 'Prórroga',
}

const loteEstadoColors: Record<string, string> = {
  GENERADO: 'bg-blue-100 text-blue-700 border-0',
  ENVIADO: 'bg-yellow-100 text-yellow-700 border-0',
  PAGADO_PARCIAL: 'bg-orange-100 text-orange-700 border-0',
  PAGADO_TOTAL: 'bg-green-100 text-green-700 border-0',
  RECHAZADO: 'bg-red-100 text-red-700 border-0',
}

const loteEstadoLabels: Record<string, string> = {
  GENERADO: 'Generado',
  ENVIADO: 'Enviado',
  PAGADO_PARCIAL: 'Pago Parcial',
  PAGADO_TOTAL: 'Pago Total',
  RECHAZADO: 'Rechazado',
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
}

// Calculate expected value based on IBC (simplified)
function calcularValorEsperado(salary: number, dias: number): number {
  const ibcDiario = salary / 30
  return Math.round(ibcDiario * dias * 0.6667) // 66.67% for first 90 days
}

interface Props {
  user: LoginUser
  section: string
  onSectionChange: (s: string) => void
}

export default function GHCobros({ user, section, onSectionChange }: Props) {
  const { toast } = useToast()
  const [incapacidades, setIncapacidades] = useState<Incapacidad[]>([])
  const [lotes, setLotes] = useState<LoteCobro[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEPS, setFiltroEPS] = useState('TODAS')
  const [epsList, setEpsList] = useState<Array<{ id: string; nombre: string }>>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [generatingLote, setGeneratingLote] = useState(false)
  const [selectedLote, setSelectedLote] = useState<LoteCobro | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [incRes, lotesRes, epsRes] = await Promise.all([
        fetch('/api/incapacidades?estado=TRANSCRITA'),
        fetch('/api/cobros'),
        fetch('/api/eps'),
      ])

      if (incRes.ok) {
        const incData = await incRes.json()
        setIncapacidades(incData.incapacidades || [])
      } else {
        setIncapacidades([])
      }

      if (lotesRes.ok) {
        const lotesData = await lotesRes.json()
        setLotes(lotesData.lotes || [])
      } else {
        setLotes([])
      }

      if (epsRes.ok) {
        const epsData = await epsRes.json()
        setEpsList(epsData.eps || [])
      } else {
        setEpsList([])
      }
    } catch {
      setIncapacidades([])
      setLotes([])
      setEpsList([])
      toast({ title: 'Error', description: 'No se pudieron cargar los datos de cobros', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredIncapacidades = filtroEPS === 'TODAS'
    ? incapacidades
    : incapacidades.filter(inc => inc.eps.id === filtroEPS)

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === filteredIncapacidades.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredIncapacidades.map(inc => inc.id)))
    }
  }

  // Group selected by EPS
  const selectedByEPS = filteredIncapacidades
    .filter(inc => selectedIds.has(inc.id))
    .reduce<Record<string, Incapacidad[]>>((acc, inc) => {
      if (!acc[inc.eps.id]) acc[inc.eps.id] = []
      acc[inc.eps.id].push(inc)
      return acc
    }, {})

  const totalEsperado = filteredIncapacidades
    .filter(inc => selectedIds.has(inc.id))
    .reduce((sum, inc) => sum + calcularValorEsperado(inc.empleado.salary, inc.diasIncapacidad), 0)

  const handleGenerarLote = async (epsId: string) => {
    const incIds = selectedByEPS[epsId]?.map(inc => inc.id) || []
    if (incIds.length === 0) return

    setGeneratingLote(true)
    try {
      const res = await fetch('/api/cobros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ epsId, incapacidadIds: incIds }),
      })
      if (res.ok) {
        const epsNombre = epsList.find(e => e.id === epsId)?.nombre || 'EPS'
        toast({ title: '✅ Lote de cobro generado', description: `Se ha creado un lote con ${incIds.length} incapacidad(es) para ${epsNombre}. El lote está listo para envío.` })
        setSelectedIds(new Set())
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al generar lote', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setGeneratingLote(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-primary" />
            Gestión de Cobros
          </h2>
          <p className="text-muted-foreground mt-1">Administración de cobros a EPS y lotes de facturación</p>
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

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Incapacidades Transcritas */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Incapacidades para Cobro</CardTitle>
                  <CardDescription>{filteredIncapacidades.length} incapacidades en estado TRANSCRITA</CardDescription>
                </div>
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedIds.size} seleccionadas</Badge>
                    <Badge className="bg-primary/10 text-primary border-0">{formatCurrency(totalEsperado)}</Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {filteredIncapacidades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hay incapacidades listas para cobro</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={selectedIds.size === filteredIncapacidades.length && filteredIncapacidades.length > 0}
                            onCheckedChange={toggleAll}
                          />
                        </TableHead>
                        <TableHead>Radicado</TableHead>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>EPS</TableHead>
                        <TableHead>Días</TableHead>
                        <TableHead>IBC</TableHead>
                        <TableHead>Valor Est.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIncapacidades.map((inc) => {
                        const valorEst = calcularValorEsperado(inc.empleado.salary, inc.diasIncapacidad)
                        return (
                          <TableRow key={inc.id} className={selectedIds.has(inc.id) ? 'bg-primary/5' : ''}>
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(inc.id)}
                                onCheckedChange={() => toggleSelection(inc.id)}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-sm">{inc.radicado}</TableCell>
                            <TableCell className="text-sm">{inc.empleado.name}</TableCell>
                            <TableCell className="text-sm">{tipoNovedadLabels[inc.tipoNovedad] || inc.tipoNovedad}</TableCell>
                            <TableCell className="text-sm">{inc.eps.nombre}</TableCell>
                            <TableCell className="text-sm">{inc.diasIncapacidad}</TableCell>
                            <TableCell className="text-sm">{formatCurrency(inc.empleado.salary)}</TableCell>
                            <TableCell className="text-sm font-medium">{formatCurrency(valorEst)}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Generate Lote Buttons */}
          {Object.keys(selectedByEPS).length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Generar Lotes de Cobro</p>
                    <p className="text-xs text-muted-foreground">
                      {Object.entries(selectedByEPS).map(([epsId, incs]) =>
                        `${epsList.find(e => e.id === epsId)?.nombre || epsId}: ${incs.length} incapacidades`
                      ).join(' | ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {Object.entries(selectedByEPS).map(([epsId, incs]) => {
                      const epsNombre = epsList.find(e => e.id === epsId)?.nombre || 'EPS'
                      const total = incs.reduce((s, i) => s + calcularValorEsperado(i.empleado.salary, i.diasIncapacidad), 0)
                      return (
                        <Button
                          key={epsId}
                          size="sm"
                          onClick={() => handleGenerarLote(epsId)}
                          disabled={generatingLote}
                        >
                          {generatingLote ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Package className="w-3 h-3 mr-1" />}
                          Lote {epsNombre} ({formatCurrency(total)})
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Lotes */}
          {lotes.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Lotes de Cobro Generados</CardTitle>
                <CardDescription>{lotes.length} lotes registrados</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nro. Lote</TableHead>
                        <TableHead>EPS</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Incapacidades</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Fecha Generación</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lotes.map((lote) => (
                        <TableRow key={lote.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLote(lote)}>
                          <TableCell className="font-mono text-sm font-medium">{lote.numeroLote}</TableCell>
                          <TableCell className="text-sm">{lote.eps.nombre}</TableCell>
                          <TableCell>
                            <Badge className={loteEstadoColors[lote.estado] || 'bg-gray-100 text-gray-700 border-0'}>
                              {loteEstadoLabels[lote.estado] || lote.estado}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{lote.detalles.length}</TableCell>
                          <TableCell className="text-sm font-medium">{formatCurrency(lote.valorTotal)}</TableCell>
                          <TableCell className="text-sm">{formatDate(lote.fechaGeneracion)}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost">Ver</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lote Detail Dialog */}
          <Dialog open={!!selectedLote} onOpenChange={() => setSelectedLote(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Lote {selectedLote?.numeroLote}</DialogTitle>
                <DialogDescription>Detalle del lote de cobro</DialogDescription>
              </DialogHeader>
              {selectedLote && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">EPS</Label>
                      <p className="text-sm font-medium">{selectedLote.eps.nombre}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Estado</Label>
                      <div className="mt-1">
                        <Badge className={loteEstadoColors[selectedLote.estado] || 'bg-gray-100 text-gray-700 border-0'}>
                          {loteEstadoLabels[selectedLote.estado] || selectedLote.estado}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Valor Total</Label>
                      <p className="text-sm font-bold">{formatCurrency(selectedLote.valorTotal)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Generación</Label>
                      <p className="text-sm">{formatDate(selectedLote.fechaGeneracion)}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Radicado</TableHead>
                          <TableHead>Empleado</TableHead>
                          <TableHead>Valor Esperado</TableHead>
                          <TableHead>Valor Pagado</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedLote.detalles.map((det) => (
                          <TableRow key={det.id}>
                            <TableCell className="font-mono text-xs">{det.incapacidad.radicado}</TableCell>
                            <TableCell className="text-sm">{det.incapacidad.empleado.name}</TableCell>
                            <TableCell className="text-sm">{formatCurrency(det.valorEsperado)}</TableCell>
                            <TableCell className="text-sm">{det.valorPagado ? formatCurrency(det.valorPagado) : '-'}</TableCell>
                            <TableCell>
                              <Badge className={
                                det.estado === 'PAGADO' ? 'bg-green-100 text-green-700 border-0'
                                  : det.estado === 'GLOSA' ? 'bg-red-100 text-red-700 border-0'
                                    : det.estado === 'DIFERENCIA' ? 'bg-orange-100 text-orange-700 border-0'
                                      : 'bg-yellow-100 text-yellow-700 border-0'
                              }>
                                {det.estado}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
