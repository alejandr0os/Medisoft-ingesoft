'use client'

import { useState, useEffect, useCallback } from 'react'
import type { LoginUser } from '@/components/login-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Clock,
  Loader2,
  AlertTriangle,
  ChevronRight,
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
  incapacidadOriginal: { id: string; radicado: string; estado: string; fechaInicio: string; fechaFin: string } | null
  prorrogas: Array<{ id: string; radicado: string; estado: string; fechaInicio: string; fechaFin: string; diasIncapacidad: number }>
}

const tipoNovedadLabels: Record<string, string> = {
  ENFERMEDAD_COMUN: 'Enfermedad Común',
  ACCIDENTE_TRANSITO: 'Accidente Tránsito',
  ACCIDENTE_TRABAJO: 'Accidente Trabajo',
  LICENCIA_MATERNIDAD: 'Licencia Maternidad',
  LICENCIA_PATERNIDAD: 'Licencia Paternidad',
  PRORROGA: 'Prórroga',
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

function getDiasAcumuladosBadge(dias: number) {
  if (dias >= 180) return <Badge className="bg-red-100 text-red-700 border-0">Alerta {dias}d - 180d+</Badge>
  if (dias >= 150) return <Badge className="bg-rose-100 text-rose-700 border-0">Alerta {dias}d - 150d</Badge>
  if (dias >= 120) return <Badge className="bg-orange-100 text-orange-700 border-0">Alerta {dias}d - 120d</Badge>
  if (dias >= 90) return <Badge className="bg-amber-100 text-amber-700 border-0">Alerta {dias}d - 90d</Badge>
  return <Badge className="bg-green-100 text-green-700 border-0">{dias}d</Badge>
}

interface Props {
  user: LoginUser
  section: string
  onSectionChange: (s: string) => void
}

export default function GHProrrogas({ user, section, onSectionChange }: Props) {
  const { toast } = useToast()
  const [incapacidades, setIncapacidades] = useState<Incapacidad[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInc, setSelectedInc] = useState<Incapacidad | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      // Fetch prorrogas specifically
      const res = await fetch('/api/incapacidades?tipoNovedad=PRORROGA')
      if (res.ok) {
        const data = await res.json()
        setIncapacidades(data.incapacidades || [])
      } else {
        setIncapacidades([])
        toast({ title: 'Error', description: 'No se pudieron cargar las prórrogas', variant: 'destructive' })
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

  const handleViewDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/incapacidades/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedInc(data.incapacidad)
      }
    } catch {
      toast({ title: 'Error', description: 'Error al cargar detalle', variant: 'destructive' })
    }
  }

  // Alert counters
  const alerta90 = incapacidades.filter(i => i.diasAcumulados >= 90 && i.diasAcumulados < 120).length
  const alerta120 = incapacidades.filter(i => i.diasAcumulados >= 120 && i.diasAcumulados < 150).length
  const alerta150 = incapacidades.filter(i => i.diasAcumulados >= 150 && i.diasAcumulados < 180).length
  const alerta180 = incapacidades.filter(i => i.diasAcumulados >= 180).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary" />
          Prórrogas
        </h2>
        <p className="text-muted-foreground mt-1">Gestión de prórrogas de incapacidades</p>
      </div>

      {/* Threshold Alerts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-amber-50/50 border-amber-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{alerta90}</p>
            <p className="text-xs text-muted-foreground">90-119 días</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50/50 border-orange-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-orange-600">{alerta120}</p>
            <p className="text-xs text-muted-foreground">120-149 días</p>
          </CardContent>
        </Card>
        <Card className="bg-rose-50/50 border-rose-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-rose-600">{alerta150}</p>
            <p className="text-xs text-muted-foreground">150-179 días</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50/50 border-red-200">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{alerta180}</p>
            <p className="text-xs text-muted-foreground">180+ días</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Todas las Prórrogas</CardTitle>
          <CardDescription>{incapacidades.length} prórrogas registradas</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : incapacidades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay prórrogas registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Radicado</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>EPS</TableHead>
                    <TableHead>Original</TableHead>
                    <TableHead>Período Prórroga</TableHead>
                    <TableHead>Días Prórroga</TableHead>
                    <TableHead>Días Acum.</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incapacidades
                    .sort((a, b) => b.diasAcumulados - a.diasAcumulados)
                    .map((inc) => (
                    <TableRow
                      key={inc.id}
                      className={`cursor-pointer hover:bg-muted/50 ${inc.diasAcumulados >= 180 ? 'bg-red-50/50' : inc.diasAcumulados >= 90 ? 'bg-amber-50/30' : ''}`}
                      onClick={() => handleViewDetail(inc.id)}
                    >
                      <TableCell className="font-mono text-sm font-medium">{inc.radicado}</TableCell>
                      <TableCell className="text-sm">{inc.empleado.name}</TableCell>
                      <TableCell className="text-sm">{inc.eps.nombre}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {inc.incapacidadOriginal?.radicado || '-'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(inc.fechaInicio)} - {formatDate(inc.fechaFin)}
                      </TableCell>
                      <TableCell className="text-sm">{inc.diasIncapacidad}</TableCell>
                      <TableCell>{getDiasAcumuladosBadge(inc.diasAcumulados)}</TableCell>
                      <TableCell>
                        <Badge className={estadoColors[inc.estado] || 'bg-gray-100 text-gray-700 border-0 text-xs'}>
                          {estadoLabels[inc.estado] || inc.estado}
                        </Badge>
                      </TableCell>
                      <TableCell><ChevronRight className="w-4 h-4 text-muted-foreground" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedInc} onOpenChange={() => setSelectedInc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle Prórroga {selectedInc?.radicado}</DialogTitle>
            <DialogDescription>Información de la prórroga y la incapacidad original</DialogDescription>
          </DialogHeader>
          {selectedInc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Radicado Prórroga</Label><p className="font-mono text-sm">{selectedInc.radicado}</p></div>
                <div><Label className="text-xs text-muted-foreground">Estado</Label><div className="mt-1"><Badge className={estadoColors[selectedInc.estado] || 'bg-gray-100 text-gray-700 border-0'}>{estadoLabels[selectedInc.estado] || selectedInc.estado}</Badge></div></div>
                <div><Label className="text-xs text-muted-foreground">Empleado</Label><p className="text-sm">{selectedInc.empleado.name}</p></div>
                <div><Label className="text-xs text-muted-foreground">EPS</Label><p className="text-sm">{selectedInc.eps.nombre}</p></div>
                <div><Label className="text-xs text-muted-foreground">Período</Label><p className="text-sm">{formatDate(selectedInc.fechaInicio)} - {formatDate(selectedInc.fechaFin)}</p></div>
                <div><Label className="text-xs text-muted-foreground">Días Incapacidad</Label><p className="text-sm">{selectedInc.diasIncapacidad}</p></div>
              </div>

              {selectedInc.incapacidadOriginal && (
                <Card className="border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Incapacidad Original</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p>Radicado: <span className="font-mono">{selectedInc.incapacidadOriginal.radicado}</span></p>
                    <p>Estado: {estadoLabels[selectedInc.incapacidadOriginal.estado]}</p>
                    <p>Período: {formatDate(selectedInc.incapacidadOriginal.fechaInicio)} - {formatDate(selectedInc.incapacidadOriginal.fechaFin)}</p>
                  </CardContent>
                </Card>
              )}

              {selectedInc.diasAcumulados >= 90 && (
                <div className="p-3 rounded-lg border flex items-start gap-2"
                  style={{
                    borderColor: selectedInc.diasAcumulados >= 180 ? '#ef4444' : '#f59e0b',
                    backgroundColor: selectedInc.diasAcumulados >= 180 ? '#fef2f2' : '#fffbeb',
                  }}
                >
                  <AlertTriangle className={`w-4 h-4 mt-0.5 ${selectedInc.diasAcumulados >= 180 ? 'text-red-500' : 'text-amber-500'}`} />
                  <div>
                    <p className={`text-sm font-medium ${selectedInc.diasAcumulados >= 180 ? 'text-red-700' : 'text-amber-700'}`}>
                      {selectedInc.diasAcumulados >= 180
                        ? 'ALERTA: 180+ días acumulados - Trámite de Fondo de Pensiones requerido'
                        : `ALERTA: ${selectedInc.diasAcumulados} días acumulados - Monitoreo intensivo requerido`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Días acumulados: {selectedInc.diasAcumulados}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
