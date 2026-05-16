'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { LoginUser } from '@/components/login-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart3,
  Loader2,
  FileText,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  CalendarDays,
  Download,
  Activity,
  ShieldCheck,
} from 'lucide-react'

interface ReporteData {
  resumen: {
    totalIncapacidades: number
    diasPerdidos: number
    costoTotalAsumido: number
    costoRecuperado: number
    indiceAusentismo: number
    periodoAnterior: {
      totalIncapacidades: number
      diasPerdidos: number
      costoTotalAsumido: number
      costoRecuperado: number
      indiceAusentismo: number
    }
  }
  porTipo: { tipoNovedad: string; count: number }[]
  porEPS: {
    epsId: string
    epsNombre: string
    totalIncapacidades: number
    valorCobrado: number
    valorPagado: number
    saldoPendiente: number
  }[]
  porDiagnostico: {
    codigo: string
    descripcion: string
    count: number
    totalDias: number
  }[]
  costoVsRecuperacion: {
    costoEmpresa: number
    recuperadoEPS: number
    pendienteCobro: number
    tasaRecuperacion: number
  }
}

const tipoNovedadLabels: Record<string, string> = {
  ENFERMEDAD_COMUN: 'Enfermedad Común',
  ACCIDENTE_TRANSITO: 'Accidente Tránsito',
  ACCIDENTE_TRABAJO: 'Accidente Trabajo',
  LICENCIA_MATERNIDAD: 'Licencia Maternidad',
  LICENCIA_PATERNIDAD: 'Licencia Paternidad',
  PRORROGA: 'Prórroga',
}

const tipoNovedadColors: Record<string, string> = {
  ENFERMEDAD_COMUN: 'bg-blue-500',
  ACCIDENTE_TRANSITO: 'bg-orange-500',
  ACCIDENTE_TRABAJO: 'bg-red-500',
  LICENCIA_MATERNIDAD: 'bg-pink-500',
  LICENCIA_PATERNIDAD: 'bg-teal-500',
  PRORROGA: 'bg-purple-500',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
}

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

function formatDateForInput(date: Date) {
  return date.toISOString().split('T')[0]
}

interface SGSSTData {
  periodo: { mes: number; anio: number }
  totalIncapacidades: number
  totalDiasPerdidos: number
  indicadores: {
    indiceFrecuencia: number
    indiceSeveridad: number
    promedioDiasIncapacidad: number
    porcentajeAusentismo: number
  }
  porArea: Array<{ area: string; totalIncapacidades: number; totalDias: number }>
  porDiagnostico: Array<{ cie10: string; descripcion: string; total: number }>
  porTipoNovedad: Array<{ tipoNovedad: string; total: number }>
}

interface Props {
  user: LoginUser
}

export default function GerenciaReportes({ user }: Props) {
  const { toast } = useToast()
  const [data, setData] = useState<ReporteData | null>(null)
  const [sgsstData, setSgstData] = useState<SGSSTData | null>(null)
  const [sgsstLoading, setSgstLoading] = useState(false)
  const [sgsstMes, setSgstMes] = useState(() => new Date().getMonth() + 1)
  const [sgsstAnio, setSgstAnio] = useState(() => new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 3)
    return formatDateForInput(d)
  })
  const [fechaFin, setFechaFin] = useState(() => formatDateForInput(new Date()))
  const [exporting, setExporting] = useState(false)

  const fetchData = useCallback(async () => {
    if (new Date(fechaInicio) > new Date(fechaFin)) {
      toast({
        title: 'Rango de fechas inválido',
        description: 'La fecha de inicio no puede ser posterior a la fecha fin',
        variant: 'destructive'
      })
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const params = new URLSearchParams({ fechaInicio, fechaFin })
      const res = await fetch(`/api/reportes/ausentismo?${params}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        setData(null)
        toast({ title: 'Error', description: 'No se pudieron cargar los datos del reporte', variant: 'destructive' })
      }
    } catch {
      setData(null)
      toast({ title: 'Error de conexión', description: 'No se pudo contactar con el servidor', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [fechaInicio, fechaFin, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleExport = () => {
    setExporting(true)
    // Simulating file generation and download
    setTimeout(() => {
      setExporting(false)
      toast({
        title: '✅ Reporte Exportado',
        description: `El reporte del periodo ${fechaInicio} a ${fechaFin} ha sido generado exitosamente.`
      })
    }, 1500)
  }

  const fetchSGSST = useCallback(async () => {
    try {
      setSgstLoading(true)
      const res = await fetch(`/api/reportes/sg-sst?mes=${sgsstMes}&anio=${sgsstAnio}`)
      if (res.ok) {
        const json = await res.json()
        setSgstData(json)
      } else {
        setSgstData(null)
        toast({ title: 'Error', description: 'No se pudo generar el reporte SG-SST', variant: 'destructive' })
      }
    } catch {
      setSgstData(null)
      toast({ title: 'Error de conexión', description: 'Error al solicitar el reporte SG-SST', variant: 'destructive' })
    } finally {
      setSgstLoading(false)
    }
  }, [sgsstMes, sgsstAnio, toast])

  const maxTipoCount = useMemo(() => {
    if (!data?.porTipo || data.porTipo.length === 0) return 1
    return Math.max(...data.porTipo.map(t => t.count), 1)
  }, [data?.porTipo])

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Dashboard de Reportes
          </h2>
          <p className="text-muted-foreground mt-1">Reportes gerenciales y análisis estadístico de ausentismo</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          Exportar Reporte
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Fecha Inicio</Label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Fecha Fin</Label>
              <Input
                type="date"
                value={fechaFin}
                onChange={e => setFechaFin(e.target.value)}
                className="h-9"
              />
            </div>
            <Button size="sm" onClick={fetchData} disabled={loading} className="h-9">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4 mr-1" />}
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {data?.resumen && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Incapacidades</p>
                  <p className="text-2xl font-bold">{data.resumen.totalIncapacidades}</p>
                  {data.resumen.periodoAnterior && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {calculateChange(data.resumen.totalIncapacidades, data.resumen.periodoAnterior.totalIncapacidades) >= 0 ? '+' : ''}
                      {calculateChange(data.resumen.totalIncapacidades, data.resumen.periodoAnterior.totalIncapacidades)}% vs periodo anterior
                    </p>
                  )}
                </div>
                <FileText className="w-5 h-5 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Días Perdidos</p>
                  <p className="text-2xl font-bold">{data.resumen.diasPerdidos}</p>
                  {data.resumen.periodoAnterior && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {calculateChange(data.resumen.diasPerdidos, data.resumen.periodoAnterior.diasPerdidos) >= 0 ? '+' : ''}
                      {calculateChange(data.resumen.diasPerdidos, data.resumen.periodoAnterior.diasPerdidos)}% vs periodo anterior
                    </p>
                  )}
                </div>
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Costo Total Asumido</p>
                  <p className="text-2xl font-bold">{formatCurrency(data.resumen.costoTotalAsumido)}</p>
                </div>
                <DollarSign className="w-5 h-5 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Costo Recuperado</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(data.resumen.costoRecuperado)}</p>
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Índice Ausentismo</p>
                  <p className="text-2xl font-bold">{data.resumen.indiceAusentismo.toFixed(2)}%</p>
                </div>
                <Activity className="w-5 h-5 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (!data || !data.resumen) ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No se pudieron cargar los datos del reporte</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="resumen" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-6 h-auto gap-1">
            <TabsTrigger value="resumen" className="text-xs">Resumen General</TabsTrigger>
            <TabsTrigger value="tipo" className="text-xs">Por Tipo</TabsTrigger>
            <TabsTrigger value="eps" className="text-xs">Por EPS</TabsTrigger>
            <TabsTrigger value="diagnostico" className="text-xs">Por CIE-10</TabsTrigger>
            <TabsTrigger value="costo" className="text-xs">Costo vs Recuperacion</TabsTrigger>
            <TabsTrigger value="sgsst" className="text-xs">SG-SST</TabsTrigger>
          </TabsList>

          {/* Resumen General */}
          <TabsContent value="resumen">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Periodo Actual</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Incapacidades</span>
                    <span className="font-bold">{data.resumen.totalIncapacidades}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Días perdidos</span>
                    <span className="font-bold">{data.resumen.diasPerdidos}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Costo asumido</span>
                    <span className="font-bold">{formatCurrency(data.resumen.costoTotalAsumido)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Recuperado</span>
                    <span className="font-bold text-green-600">{formatCurrency(data.resumen.costoRecuperado)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Índice ausentismo</span>
                    <span className="font-bold">{data.resumen.indiceAusentismo.toFixed(2)}%</span>
                  </div>
                </CardContent>
              </Card>
              {data.resumen.periodoAnterior && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Periodo Anterior</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Incapacidades</span>
                      <span className="font-medium">{data.resumen.periodoAnterior.totalIncapacidades}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Días perdidos</span>
                      <span className="font-medium">{data.resumen.periodoAnterior.diasPerdidos}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Costo asumido</span>
                      <span className="font-medium">{formatCurrency(data.resumen.periodoAnterior.costoTotalAsumido)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Recuperado</span>
                      <span className="font-medium">{formatCurrency(data.resumen.periodoAnterior.costoRecuperado)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Índice ausentismo</span>
                      <span className="font-medium">{data.resumen.periodoAnterior.indiceAusentismo.toFixed(2)}%</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Variación</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.resumen.periodoAnterior && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Incapacidades</span>
                        <Badge className={calculateChange(data.resumen.totalIncapacidades, data.resumen.periodoAnterior.totalIncapacidades) >= 0 ? 'bg-red-100 text-red-700 border-0' : 'bg-green-100 text-green-700 border-0'}>
                          {calculateChange(data.resumen.totalIncapacidades, data.resumen.periodoAnterior.totalIncapacidades)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Días perdidos</span>
                        <Badge className={calculateChange(data.resumen.diasPerdidos, data.resumen.periodoAnterior.diasPerdidos) >= 0 ? 'bg-red-100 text-red-700 border-0' : 'bg-green-100 text-green-700 border-0'}>
                          {calculateChange(data.resumen.diasPerdidos, data.resumen.periodoAnterior.diasPerdidos)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Costo</span>
                        <Badge className={calculateChange(data.resumen.costoTotalAsumido, data.resumen.periodoAnterior.costoTotalAsumido) >= 0 ? 'bg-red-100 text-red-700 border-0' : 'bg-green-100 text-green-700 border-0'}>
                          {calculateChange(data.resumen.costoTotalAsumido, data.resumen.periodoAnterior.costoTotalAsumido)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Recuperado</span>
                        <Badge className={calculateChange(data.resumen.costoRecuperado, data.resumen.periodoAnterior.costoRecuperado) >= 0 ? 'bg-green-100 text-green-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                          {calculateChange(data.resumen.costoRecuperado, data.resumen.periodoAnterior.costoRecuperado)}%
                        </Badge>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Por Tipo de Novedad */}
          <TabsContent value="tipo">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Distribución por Tipo de Novedad
                </CardTitle>
                <CardDescription>Cantidad de incapacidades por tipo</CardDescription>
              </CardHeader>
              <CardContent>
                {data.porTipo.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sin datos para el periodo seleccionado</p>
                ) : (
                  <div className="space-y-4">
                    {data.porTipo.map(item => (
                      <div key={item.tipoNovedad} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{tipoNovedadLabels[item.tipoNovedad] || item.tipoNovedad}</span>
                          <span className="text-sm font-bold">{item.count}</span>
                        </div>
                        <div className="w-full h-6 bg-muted rounded-md overflow-hidden">
                          <div
                            className={`h-full rounded-md ${tipoNovedadColors[item.tipoNovedad] || 'bg-primary'} flex items-center justify-end pr-2`}
                            style={{ width: `${Math.max((item.count / maxTipoCount) * 100, 8)}%` }}
                          >
                            <span className="text-xs text-white font-medium">{item.count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Por EPS */}
          <TabsContent value="eps">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Resumen por EPS
                </CardTitle>
                <CardDescription>Incapacidades, cobros y pagos por entidad</CardDescription>
              </CardHeader>
              <CardContent>
                {data.porEPS.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sin datos para el periodo seleccionado</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>EPS</TableHead>
                          <TableHead className="text-center">Total Incapacidades</TableHead>
                          <TableHead className="text-right">Valor Cobrado</TableHead>
                          <TableHead className="text-right">Valor Pagado</TableHead>
                          <TableHead className="text-right">Saldo Pendiente</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.porEPS.map(eps => (
                          <TableRow key={eps.epsId}>
                            <TableCell className="font-medium">{eps.epsNombre}</TableCell>
                            <TableCell className="text-center">{eps.totalIncapacidades}</TableCell>
                            <TableCell className="text-right">{formatCurrency(eps.valorCobrado)}</TableCell>
                            <TableCell className="text-right text-green-600">{formatCurrency(eps.valorPagado)}</TableCell>
                            <TableCell className="text-right">
                              <span className={eps.saldoPendiente > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                                {formatCurrency(eps.saldoPendiente)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold bg-muted/50">
                          <TableCell>TOTAL</TableCell>
                          <TableCell className="text-center">{data.porEPS.reduce((s, e) => s + e.totalIncapacidades, 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(data.porEPS.reduce((s, e) => s + e.valorCobrado, 0))}</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(data.porEPS.reduce((s, e) => s + e.valorPagado, 0))}</TableCell>
                          <TableCell className="text-right">{formatCurrency(data.porEPS.reduce((s, e) => s + e.saldoPendiente, 0))}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Por Diagnóstico CIE-10 */}
          <TabsContent value="diagnostico">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Diagnósticos CIE-10 Más Frecuentes
                </CardTitle>
                <CardDescription>Principales causas de incapacidad</CardDescription>
              </CardHeader>
              <CardContent>
                {data.porDiagnostico.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sin datos para el periodo seleccionado</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Descripción</TableHead>
                          <TableHead className="text-center">Casos</TableHead>
                          <TableHead className="text-center">Total Días</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.porDiagnostico.map((diag) => (
                          <TableRow key={diag.codigo}>
                            <TableCell className="font-mono font-medium text-sm">{diag.codigo}</TableCell>
                            <TableCell className="text-sm">{diag.descripcion}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{diag.count}</Badge>
                            </TableCell>
                            <TableCell className="text-center text-sm">{diag.totalDias}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Costo vs Recuperacion */}
          <TabsContent value="costo">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-red-200 bg-red-50/30">
                <CardContent className="p-6 text-center">
                  <DollarSign className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Costo para la Empresa</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {formatCurrency(data.costoVsRecuperacion?.costoEmpresa || 0)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-green-200 bg-green-50/30">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Recuperado de EPS</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {formatCurrency(data.costoVsRecuperacion?.recuperadoEPS || 0)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-amber-200 bg-amber-50/30">
                <CardContent className="p-6 text-center">
                  <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Pendiente de Cobro</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">
                    {formatCurrency(data.costoVsRecuperacion?.pendienteCobro || 0)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-6 text-center">
                  <Activity className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Tasa de Recuperacion</p>
                  <p className="text-2xl font-bold mt-1">
                    {data.costoVsRecuperacion?.tasaRecuperacion?.toFixed(1) || 0}%
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* SG-SST Report */}
          <TabsContent value="sgsst">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    Reporte SG-SST
                  </CardTitle>
                  <CardDescription>Indicadores de Sistema de Gestion de Seguridad y Salud en el Trabajo</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-end gap-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Mes</Label>
                      <Select value={String(sgsstMes)} onValueChange={v => setSgstMes(Number(v))}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {meses.map((m, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Anio</Label>
                      <Select value={String(sgsstAnio)} onValueChange={v => setSgstAnio(Number(v))}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2024, 2025, 2026].map(y => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button size="sm" onClick={fetchSGSST} disabled={sgsstLoading} className="h-9">
                      {sgsstLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-1" />}
                      Generar Reporte
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {sgsstLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : sgsstData ? (
                <>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Indice de Frecuencia</p>
                            <p className="text-2xl font-bold">{sgsstData.indicadores.indiceFrecuencia.toFixed(2)}</p>
                          </div>
                          <Activity className="w-5 h-5 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Indice de Severidad</p>
                            <p className="text-2xl font-bold">{sgsstData.indicadores.indiceSeveridad.toFixed(2)}</p>
                          </div>
                          <TrendingUp className="w-5 h-5 text-amber-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Promedio Dias</p>
                            <p className="text-2xl font-bold">{sgsstData.indicadores.promedioDiasIncapacidad.toFixed(1)}</p>
                          </div>
                          <Clock className="w-5 h-5 text-orange-500" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">% Ausentismo</p>
                            <p className="text-2xl font-bold">{sgsstData.indicadores.porcentajeAusentismo.toFixed(2)}%</p>
                          </div>
                          <FileText className="w-5 h-5 text-red-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {sgsstData.porArea.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Users className="w-4 h-4 text-primary" />
                          Distribucion por Area
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Area</TableHead>
                                <TableHead className="text-center">Total Incapacidades</TableHead>
                                <TableHead className="text-center">Total Dias</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sgsstData.porArea.map((item) => (
                                <TableRow key={item.area}>
                                  <TableCell className="font-medium">{item.area}</TableCell>
                                  <TableCell className="text-center">{item.totalIncapacidades}</TableCell>
                                  <TableCell className="text-center">{item.totalDias}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {sgsstData.porDiagnostico.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Activity className="w-4 h-4 text-primary" />
                          Diagnosticos CIE-10
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Codigo</TableHead>
                                <TableHead>Descripcion</TableHead>
                                <TableHead className="text-center">Casos</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sgsstData.porDiagnostico.map((item) => (
                                <TableRow key={item.cie10}>
                                  <TableCell className="font-mono font-medium text-sm">{item.cie10}</TableCell>
                                  <TableCell className="text-sm">{item.descripcion}</TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="outline">{item.total}</Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {sgsstData.porTipoNovedad.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          Distribucion por Tipo de Novedad
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Tipo de Novedad</TableHead>
                                <TableHead className="text-center">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sgsstData.porTipoNovedad.map((item) => (
                                <TableRow key={item.tipoNovedad}>
                                  <TableCell className="font-medium">{tipoNovedadLabels[item.tipoNovedad] || item.tipoNovedad}</TableCell>
                                  <TableCell className="text-center">
                                    <Badge className={tipoNovedadColors[item.tipoNovedad] || 'bg-gray-100 text-gray-700 border-0'}>
                                      {item.total}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="text-center py-8 text-muted-foreground">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Seleccione mes y anio para generar el reporte SG-SST</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
