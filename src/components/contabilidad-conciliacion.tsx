'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Receipt,
  Loader2,
  CheckCircle2,
  XCircle,
  Package,
  DollarSign,
  ArrowRight,
  FileCheck,
} from 'lucide-react'

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
    diagnosticoCIE10: string | null
    empleado: { id: string; name: string; document: string }
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

interface Props {
  user: any
}

export default function ContabilidadConciliacion({ user }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Receipt className="w-6 h-6 text-primary" />
          Conciliación Bancaria
        </h2>
        <p className="text-muted-foreground mt-1">Conciliación de pagos recibidos de EPS y gestión de lotes de cobro</p>
      </div>

      <Tabs defaultValue="conciliacion" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="conciliacion">Conciliacion Bancaria</TabsTrigger>
          <TabsTrigger value="lotes">Lotes de Cobro</TabsTrigger>
        </TabsList>

        <TabsContent value="conciliacion">
          <ConciliacionBancaria />
        </TabsContent>
        <TabsContent value="lotes">
          <LotesDeCobro />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ConciliacionBancaria() {
  const { toast } = useToast()
  const [lotes, setLotes] = useState<LoteCobro[]>([])
  const [selectedLoteId, setSelectedLoteId] = useState('')
  const [selectedLote, setSelectedLote] = useState<LoteCobro | null>(null)
  const [loading, setLoading] = useState(true)
  const [conciliando, setConciliando] = useState(false)
  const [resultados, setResultados] = useState<Array<{ id: string; estado: string; valorPagado: number; diferencia: number }> | null>(null)
  const [valoresPagados, setValoresPagados] = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/cobros')
      if (res.ok) {
        const data = await res.json()
        setLotes(data.lotes || [])
      }
    } catch {
      toast({ title: 'Error de carga', description: 'No se pudieron cargar los lotes de cobro.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSelectLote = (loteId: string) => {
    setSelectedLoteId(loteId)
    setResultados(null)
    const lote = lotes.find(l => l.id === loteId)
    setSelectedLote(lote || null)
    // Initialize valores pagados
    if (lote) {
      const vals: Record<string, string> = {}
      lote.detalles.forEach(d => {
        vals[d.id] = d.valorPagado?.toString() || d.valorEsperado.toString()
      })
      setValoresPagados(vals)
    }
  }

  const handleConciliar = async () => {
    if (!selectedLote) return
    setConciliando(true)
    try {
      const detalles = Object.entries(valoresPagados).map(([detalleId, valor]) => ({
        detalleId,
        valorPagado: parseFloat(valor) || 0,
      }))

      const res = await fetch('/api/conciliacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loteId: selectedLote.id, detalles }),
      })

      if (res.ok) {
        const data = await res.json()
        setResultados(data.resultados || [])
        const pagadas = (data.resultados || []).filter((r: any) => r.estado === 'PAGADA').length
        const glosas = (data.resultados || []).filter((r: any) => r.estado === 'GLOSA').length
        const diferencias = (data.resultados || []).filter((r: any) => r.estado === 'DIFERENCIA').length
        toast({ title: '✅ Conciliación procesada', description: `Resultado: ${pagadas} pagadas, ${glosas} glosas, ${diferencias} con diferencia.` })
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al conciliar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setConciliando(false)
    }
  }

  const totalEsperado = selectedLote?.detalles.reduce((s, d) => s + d.valorEsperado, 0) || 0
  const totalPagado = Object.values(valoresPagados).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const diferencia = totalPagado - totalEsperado

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Seleccionar Lote de Cobro</CardTitle>
          <CardDescription>Seleccione un lote para iniciar la conciliación bancaria</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (
            <Select value={selectedLoteId} onValueChange={handleSelectLote}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un lote..." />
              </SelectTrigger>
              <SelectContent>
                {lotes.filter(l => l.estado === 'ENVIADO' || l.estado === 'GENERADO').map(lote => (
                  <SelectItem key={lote.id} value={lote.id}>
                    {lote.numeroLote} - {lote.eps.nombre} - {formatCurrency(lote.valorTotal)} ({loteEstadoLabels[lote.estado]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedLote && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-primary" />
                  Lote {selectedLote.numeroLote}
                </CardTitle>
                <CardDescription>
                  {selectedLote.eps.nombre} | {selectedLote.detalles.length} incapacidades | {formatDate(selectedLote.fechaGeneracion)}
                </CardDescription>
              </div>
              <Button onClick={handleConciliar} disabled={conciliando}>
                {conciliando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Conciliar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Radicado</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead className="text-right">Valor Esperado</TableHead>
                    <TableHead className="text-right">Valor Pagado</TableHead>
                    <TableHead>Resultado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedLote.detalles.map(det => {
                    const resultado = resultados?.find(r => r.id === det.id)
                    return (
                      <TableRow key={det.id}>
                        <TableCell className="font-mono text-sm">{det.incapacidad.radicado}</TableCell>
                        <TableCell className="text-sm">{det.incapacidad.empleado.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(det.valorEsperado)}</TableCell>
                        <TableCell className="text-right">
                          {resultados ? (
                            <span>{det.valorPagado ? formatCurrency(det.valorPagado) : '-'}</span>
                          ) : (
                            <Input
                              type="number"
                              value={valoresPagados[det.id] || ''}
                              onChange={e => setValoresPagados(prev => ({ ...prev, [det.id]: e.target.value }))}
                              className="h-8 w-32 text-right text-sm ml-auto"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {resultado && (
                            <Badge className={
                              resultado.estado === 'PAGADA' ? 'bg-green-100 text-green-700 border-0'
                                : resultado.estado === 'GLOSA' ? 'bg-red-100 text-red-700 border-0'
                                  : 'bg-orange-100 text-orange-700 border-0'
                            }>
                              {resultado.estado === 'PAGADA' ? 'Pagada' : resultado.estado === 'GLOSA' ? 'Glosa' : 'Diferencia'}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
            <div className="mt-4 p-4 bg-muted/30 rounded-lg">
              <div className="grid gap-2 grid-cols-3 text-center">
                <div>
                  <Label className="text-xs text-muted-foreground">Total Esperado</Label>
                  <p className="text-lg font-bold">{formatCurrency(totalEsperado)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Total Pagado</Label>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(totalPagado)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Diferencia</Label>
                  <p className={`text-lg font-bold ${diferencia < 0 ? 'text-red-600' : diferencia > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    {formatCurrency(Math.abs(diferencia))} {diferencia < 0 ? '(faltante)' : diferencia > 0 ? '(sobrante)' : '(exacto)'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function LotesDeCobro() {
  const [lotes, setLotes] = useState<LoteCobro[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLote, setSelectedLote] = useState<LoteCobro | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/cobros')
      if (res.ok) {
        const data = await res.json()
        setLotes(data.lotes || [])
      }
    } catch {
      // No toast needed since this is just viewing data
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : lotes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay lotes de cobro registrados</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Lotes de Cobro
            </CardTitle>
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
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Fecha Generación</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lotes.map(lote => (
                    <TableRow key={lote.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLote(lote)}>
                      <TableCell className="font-mono text-sm font-medium">{lote.numeroLote}</TableCell>
                      <TableCell className="text-sm">{lote.eps.nombre}</TableCell>
                      <TableCell>
                        <Badge className={loteEstadoColors[lote.estado] || 'bg-gray-100 text-gray-700 border-0'}>
                          {loteEstadoLabels[lote.estado] || lote.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{lote.detalles.length}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(lote.valorTotal)}</TableCell>
                      <TableCell className="text-sm">{formatDate(lote.fechaGeneracion)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost">
                          <ArrowRight className="w-4 h-4" />
                        </Button>
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
                      <TableHead className="text-right">Valor Esperado</TableHead>
                      <TableHead className="text-right">Valor Pagado</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedLote.detalles.map(det => (
                      <TableRow key={det.id}>
                        <TableCell className="font-mono text-xs">{det.incapacidad.radicado}</TableCell>
                        <TableCell className="text-sm">{det.incapacidad.empleado.name}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(det.valorEsperado)}</TableCell>
                        <TableCell className="text-right text-sm">{det.valorPagado ? formatCurrency(det.valorPagado) : '-'}</TableCell>
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
      </div>
    )
  }


