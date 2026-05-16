'use client'

import React, { useState, useEffect, useCallback } from 'react'
import type { LoginUser } from '@/components/login-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Search,
  Loader2,
  FileText,
  Users,
  Building2,
  ChevronDown,
  ChevronRight,
  Printer,
  Filter,
  Clock,
} from 'lucide-react'

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
  eps: { id: string; nombre: string }
  seguimientos: Array<{ id: string; accion: string; observaciones: string; createdAt: string; usuario: { name: string } }>
}

interface EPSSaldo {
  epsId: string
  epsNombre: string
  totalCobrado: number
  totalPagado: number
  saldoPendiente: number
  incapacidades: Incapacidad[]
}

interface TrazabilidadEvent {
  id: string
  accion: string
  estadoAnterior: string | null
  estadoNuevo: string | null
  observaciones: string | null
  createdAt: string
  usuario: { name: string }
}

interface Props {
  user: LoginUser
  section: string
  onSectionChange: (s: string) => void
}

export default function GerenciaConsultas({ user, section, onSectionChange }: Props) {
  const activeTab = section === 'consultas' ? 'incapacidades' : section.replace('consulta-', '')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Search className="w-6 h-6 text-primary" />
          Consultas
        </h2>
        <p className="text-muted-foreground mt-1">Consultas de incapacidades, empleados y entidades</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => onSectionChange(`consulta-${v}`)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="incapacidades" className="text-xs">Incapacidades</TabsTrigger>
          <TabsTrigger value="empleados" className="text-xs">Saldo Deudor</TabsTrigger>
          <TabsTrigger value="entidades" className="text-xs">Trazabilidad</TabsTrigger>
        </TabsList>

        <TabsContent value="incapacidades">
          <ConsultaIncapacidades />
        </TabsContent>
        <TabsContent value="empleados">
          <ConsultaEmpleados />
        </TabsContent>
        <TabsContent value="entidades">
          <ConsultaEntidades />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ===== CU-26: Consulta Incapacidades =====
function ConsultaIncapacidades() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('TODOS')
  const [filtroTipo, setFiltroTipo] = useState('TODOS')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [results, setResults] = useState<Incapacidad[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (fechaDesde && fechaHasta && new Date(fechaDesde) > new Date(fechaHasta)) {
      toast({
        title: 'Rango de fechas inválido',
        description: 'La fecha desde no puede ser posterior a la fecha hasta',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (filtroEstado !== 'TODOS') params.set('estado', filtroEstado)
      if (filtroTipo !== 'TODOS') params.set('tipoNovedad', filtroTipo)
      if (fechaDesde) params.set('fechaDesde', fechaDesde)
      if (fechaHasta) params.set('fechaHasta', fechaHasta)

      const res = await fetch(`/api/incapacidades?${params}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.incapacidades || [])
      } else {
        setResults([])
        toast({ title: 'Error', description: 'No se pudieron obtener los resultados', variant: 'destructive' })
      }
    } catch {
      setResults([])
      toast({ title: 'Error de conexión', description: 'No se pudo contactar con el servidor', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label className="text-xs">Documento o Nombre</Label>
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-9"
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Estado</Label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {Object.entries(estadoLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo Novedad</Label>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos</SelectItem>
                  {Object.entries(tipoNovedadLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fecha Desde</Label>
              <Input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="h-9" />
            </div>
            <div className="flex items-end gap-2">
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Fecha Hasta</Label>
                <Input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="h-9" />
              </div>
              <Button size="sm" onClick={handleSearch} disabled={loading} className="h-9">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : searched && results.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No se encontraron resultados</p>
          </CardContent>
        </Card>
      ) : results.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Resultados</CardTitle>
                <CardDescription>{results.length} incapacidades encontradas</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1" /> Imprimir
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Radicado</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>EPS</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Inicio</TableHead>
                    <TableHead>Días</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map(inc => (
                    <React.Fragment key={inc.id}>
                      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(inc.id)}>
                        <TableCell>
                          {expanded.has(inc.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{inc.radicado}</TableCell>
                        <TableCell className="text-sm">{inc.empleado.name}</TableCell>
                        <TableCell className="text-sm">{inc.eps.nombre}</TableCell>
                        <TableCell className="text-sm">{tipoNovedadLabels[inc.tipoNovedad] || inc.tipoNovedad}</TableCell>
                        <TableCell>
                          <Badge className={estadoColors[inc.estado] || 'bg-gray-100 text-gray-700 border-0 text-xs'}>
                            {estadoLabels[inc.estado] || inc.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(inc.fechaInicio)}</TableCell>
                        <TableCell className="text-sm">{inc.diasIncapacidad}</TableCell>
                      </TableRow>
                      {expanded.has(inc.id) && (
                        <TableRow key={`${inc.id}-detail`}>
                          <TableCell colSpan={8} className="bg-muted/30 p-4">
                            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                              <div>
                                <Label className="text-xs text-muted-foreground">Documento</Label>
                                <p className="text-sm font-mono">{inc.empleado.document}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Área / Cargo</Label>
                                <p className="text-sm">{inc.empleado.area} - {inc.empleado.cargo}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Fecha Fin</Label>
                                <p className="text-sm">{formatDate(inc.fechaFin)}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Diagnóstico CIE-10</Label>
                                <p className="text-sm">{inc.diagnosticoCIE10 || '-'}</p>
                              </div>
                            </div>
                            {inc.seguimientos && inc.seguimientos.length > 0 && (
                              <div className="mt-4">
                                <Label className="text-xs text-muted-foreground mb-2 block">Historial de Seguimiento</Label>
                                <div className="space-y-2">
                                  {inc.seguimientos.map(seg => (
                                    <div key={seg.id} className="flex gap-3 text-xs">
                                      <span className="text-muted-foreground shrink-0 w-24">{formatDate(seg.createdAt)}</span>
                                      <span className="font-medium shrink-0 w-32">{seg.accion}</span>
                                      <span className="text-muted-foreground">{seg.observaciones || '-'}</span>
                                      <span className="text-muted-foreground ml-auto shrink-0">por {seg.usuario.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

// ===== CU-27: Consulta Empleados - Saldo Deudor =====
function ConsultaEmpleados() {
  const { toast } = useToast()
  const [data, setData] = useState<EPSSaldo[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedEPS, setExpandedEPS] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/incapacidades?groupBy=eps')
      .then(r => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then(d => setData(d.epsSaldos || []))
      .catch(() => {
        setData([])
        toast({ title: 'Error', description: 'No se pudieron cargar los saldos por EPS', variant: 'destructive' })
      })
      .finally(() => setLoading(false))
  }, [toast])

  const toggleEPS = (id: string) => {
    setExpandedEPS(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalCobrado = data.reduce((s, e) => s + e.totalCobrado, 0)
  const totalPagado = data.reduce((s, e) => s + e.totalPagado, 0)
  const totalPendiente = data.reduce((s, e) => s + e.saldoPendiente, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Saldo Deudor por EPS
        </CardTitle>
        <CardDescription>Resumen de cobros y pagos agrupados por entidad EPS</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay datos de saldos deudores</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>EPS</TableHead>
                  <TableHead className="text-right">Total Cobrado</TableHead>
                  <TableHead className="text-right">Total Pagado</TableHead>
                  <TableHead className="text-right">Saldo Pendiente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(eps => (
                  <React.Fragment key={eps.epsId}>
                    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleEPS(eps.epsId)}>
                      <TableCell>
                        {expandedEPS.has(eps.epsId) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </TableCell>
                      <TableCell className="font-medium">{eps.epsNombre}</TableCell>
                      <TableCell className="text-right">{formatCurrency(eps.totalCobrado)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(eps.totalPagado)}</TableCell>
                      <TableCell className="text-right">
                        <span className={eps.saldoPendiente > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                          {formatCurrency(eps.saldoPendiente)}
                        </span>
                      </TableCell>
                    </TableRow>
                    {expandedEPS.has(eps.epsId) && eps.incapacidades?.map(inc => (
                      <TableRow key={inc.id} className="bg-muted/20">
                        <TableCell></TableCell>
                        <TableCell className="text-xs font-mono">{inc.radicado}</TableCell>
                        <TableCell className="text-xs">{inc.empleado?.name}</TableCell>
                        <TableCell className="text-xs">{inc.diasIncapacidad}d</TableCell>
                        <TableCell>
                          <Badge className={estadoColors[inc.estado] || 'bg-gray-100 text-gray-700 border-0 text-xs'}>
                            {estadoLabels[inc.estado] || inc.estado}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell></TableCell>
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalCobrado)}</TableCell>
                  <TableCell className="text-right text-green-600">{formatCurrency(totalPagado)}</TableCell>
                  <TableCell className="text-right">
                    <span className={totalPendiente > 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(totalPendiente)}
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ===== CU-31: Consulta Entidades - Trazabilidad =====
function ConsultaEntidades() {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [trazabilidad, setTrazabilidad] = useState<TrazabilidadEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [incapacidadInfo, setIncapacidadInfo] = useState<{ radicado: string; empleado: string; eps: string } | null>(null)

  const handleSearch = async () => {
    if (!search.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/incapacidades/trazabilidad?q=${encodeURIComponent(search)}`)
      if (res.ok) {
        const data = await res.json()
        setTrazabilidad(data.eventos || [])
        setIncapacidadInfo(data.incapacidad || null)
      } else {
        setTrazabilidad([])
        setIncapacidadInfo(null)
        toast({ title: 'Error', description: 'No se encontró la trazabilidad', variant: 'destructive' })
      }
    } catch {
      setTrazabilidad([])
      setIncapacidadInfo(null)
      toast({ title: 'Error de conexión', description: 'No se pudo obtener la trazabilidad', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Trazabilidad de Incapacidades
          </CardTitle>
          <CardDescription>Consulta el historial completo de cambios de estado por radicado o documento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Buscar por radicado o documento..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-9"
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button size="sm" onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : searched && trazabilidad.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No se encontraron registros de trazabilidad</p>
          </CardContent>
        </Card>
      ) : trazabilidad.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Línea de Tiempo</CardTitle>
                {incapacidadInfo && (
                  <CardDescription>
                    {incapacidadInfo.radicado} - {incapacidadInfo.empleado} - {incapacidadInfo.eps}
                  </CardDescription>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-1" /> Imprimir
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />
              <div className="space-y-0">
                {trazabilidad.map((event, idx) => (
                  <div key={event.id} className="relative pl-12 pb-6">
                    <div className={`absolute left-2.5 top-1 w-3 h-3 rounded-full border-2 ${
                      idx === 0 ? 'bg-primary border-primary' : 'bg-background border-muted-foreground/30'
                    }`} />
                    <div className="bg-muted/30 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{event.accion}</span>
                            {event.estadoNuevo && (
                              <Badge className={estadoColors[event.estadoNuevo] || 'bg-gray-100 text-gray-700 border-0 text-xs'}>
                                {estadoLabels[event.estadoNuevo] || event.estadoNuevo}
                              </Badge>
                            )}
                          </div>
                          {event.observaciones && (
                            <p className="text-xs text-muted-foreground mt-1">{event.observaciones}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</p>
                          <p className="text-xs text-muted-foreground">{event.usuario?.name || 'Sistema'}</p>
                        </div>
                      </div>
                      {event.estadoAnterior && event.estadoNuevo && (
                        <div className="mt-2 flex items-center gap-1 text-xs">
                          <Badge className={estadoColors[event.estadoAnterior] || 'bg-gray-100 text-gray-700 border-0 text-[10px]'}>
                            {estadoLabels[event.estadoAnterior] || event.estadoAnterior}
                          </Badge>
                          <span className="text-muted-foreground">a</span>
                          <Badge className={estadoColors[event.estadoNuevo] || 'bg-gray-100 text-gray-700 border-0 text-[10px]'}>
                            {estadoLabels[event.estadoNuevo] || event.estadoNuevo}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
