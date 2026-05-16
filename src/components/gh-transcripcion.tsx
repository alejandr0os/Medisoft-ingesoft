'use client'

import { useState, useEffect, useCallback } from 'react'
import type { LoginUser } from '@/components/login-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  PenTool,
  Loader2,
  ExternalLink,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  DollarSign,
  AlertTriangle,
  Upload,
  FileCheck,
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
  descripcionCIE10: string | null
  fechaRegistro: string
  fechaValidacion: string | null
  valorCobro: number | null
  valorEmpleador: number | null
  valorEPS: number | null
  diasEmpleador: number | null
  empleado: { id: string; name: string; document: string; area: string; cargo: string; salary: number }
  eps: { id: string; nombre: string; nit: string; portalWeb?: string; contacto?: string; email?: string }
}

const tipoNovedadLabels: Record<string, string> = {
  ENFERMEDAD_COMUN: 'Enfermedad Comun',
  ACCIDENTE_TRANSITO: 'Accidente Transito',
  ACCIDENTE_TRABAJO: 'Accidente Trabajo',
  LICENCIA_MATERNIDAD: 'Licencia Maternidad',
  LICENCIA_PATERNIDAD: 'Licencia Paternidad',
  PRORROGA: 'Prorroga',
}

const estadoColors: Record<string, string> = {
  RECIBIDA: 'bg-sky-50 text-sky-700 border-sky-200/60',
  VALIDADA: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  TRANSCRITA: 'bg-teal-50 text-teal-700 border-teal-200/60',
  EN_COBRO: 'bg-violet-50 text-violet-700 border-violet-200/60',
  RECHAZADA_ENTIDAD: 'bg-red-50 text-red-700 border-red-200/60',
  PAGADA: 'bg-green-50 text-green-700 border-green-200/60',
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
}

export default function GHTranscripcion({ user }: { user: LoginUser; section: string; onSectionChange: (s: string) => void }) {
  const { toast } = useToast()
  const [incapacidades, setIncapacidades] = useState<Incapacidad[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInc, setSelectedInc] = useState<Incapacidad | null>(null)
  const [numeroRadicado, setNumeroRadicado] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [simDialogOpen, setSimDialogOpen] = useState(false)
  const [simType, setSimType] = useState<'ACEPTAR' | 'RECHAZAR' | 'PAGAR' | 'GLOSAR'>('ACEPTAR')
  const [simObs, setSimObs] = useState('')
  const [rechazoCausal, setRechazoCausal] = useState('')
  const [rechazoDesc, setRechazoDesc] = useState('')
  const [rechazoSubsanable, setRechazoSubsanable] = useState(false)
  const [valorPagado, setValorPagado] = useState('')
  const [referenciaPago, setReferenciaPago] = useState('')
  const [calculoDesglose, setCalculoDesglose] = useState<{
    valorEmpleador: number; valorEPS: number; valorTotal: number; diasEmpleador: number; diasEPS: number; diasFondoPension: number; porcentajeEPS: number; ibcDiario: number
  } | null>(null)

  const [evidenciaDialogOpen, setEvidenciaDialogOpen] = useState(false)
  const [evidenciaInc, setEvidenciaInc] = useState<Incapacidad | null>(null)
  const [evidenciaMetodo, setEvidenciaMetodo] = useState('PORTAL_WEB')
  const [evidenciaRadicado, setEvidenciaRadicado] = useState('')
  const [evidenciaSoporte, setEvidenciaSoporte] = useState('')
  const [evidenciaPortal, setEvidenciaPortal] = useState('')
  const [evidenciaObs, setEvidenciaObs] = useState('')
  const [evidencias, setEvidencias] = useState<Record<string, Array<{ metodoRadicacion: string; numeroRadicadoEPS: string | null; soporteUrl: string | null; createdAt: string }>>>({})
  const [evidenciaSubmitting, setEvidenciaSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [resTranscritas, resCobro] = await Promise.all([
        fetch('/api/incapacidades?estado=TRANSCRITA'),
        fetch('/api/incapacidades?estado=EN_COBRO'),
      ])
      const transcritas = resTranscritas.ok ? (await resTranscritas.json()).incapacidades || [] : []
      const enCobro = resCobro.ok ? (await resCobro.json()).incapacidades || [] : []
      setIncapacidades([...transcritas, ...enCobro])
    } catch {
      setIncapacidades([])
      toast({ title: 'Error', description: 'No se pudieron cargar las incapacidades transcritas', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const fetchEvidencias = async (incId: string) => {
    try {
      const res = await fetch(`/api/incapacidades/${incId}/evidencia-radicacion`)
      if (res.ok) {
        const data = await res.json()
        setEvidencias(prev => ({ ...prev, [incId]: data.evidencias || [] }))
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar las evidencias de radicación', variant: 'destructive' })
    }
  }

  const handleOpenEvidencia = (inc: Incapacidad) => {
    setEvidenciaInc(inc)
    setEvidenciaMetodo('PORTAL_WEB')
    setEvidenciaRadicado('')
    setEvidenciaSoporte('')
    setEvidenciaPortal('')
    setEvidenciaObs('')
    setEvidenciaDialogOpen(true)
    fetchEvidencias(inc.id)
  }

  const handleEvidenciaSubmit = async () => {
    if (!evidenciaInc) return
    setEvidenciaSubmitting(true)
    try {
      const res = await fetch(`/api/incapacidades/${evidenciaInc.id}/evidencia-radicacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metodoRadicacion: evidenciaMetodo,
          numeroRadicadoEPS: evidenciaRadicado || undefined,
          soporteUrl: evidenciaSoporte || undefined,
          portalUrl: evidenciaPortal || undefined,
          observaciones: evidenciaObs || undefined,
        }),
      })
      if (res.ok) {
        toast({ title: '✅ Evidencia registrada', description: `Se registró la evidencia de radicación para ${evidenciaInc.radicado} exitosamente.` })
        fetchEvidencias(evidenciaInc.id)
        fetchData()
        setEvidenciaRadicado('')
        setEvidenciaSoporte('')
        setEvidenciaPortal('')
        setEvidenciaObs('')
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al registrar evidencia', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' })
    } finally {
      setEvidenciaSubmitting(false)
    }
  }

  const handleTranscribir = async () => {
    if (!selectedInc || !numeroRadicado) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/incapacidades/${selectedInc.id}/transcribir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeroRadicado }),
      })
      if (res.ok) {
        toast({ title: '✅ Transcripción exitosa', description: `Incapacidad ${selectedInc.radicado} transcrita a ${selectedInc.eps.nombre} con radicado EPS: ${numeroRadicado}` })
        setSelectedInc(null)
        setNumeroRadicado('')
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al transcribir', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const openSimDialog = (inc: Incapacidad, type: 'ACEPTAR' | 'RECHAZAR' | 'PAGAR' | 'GLOSAR') => {
    setSelectedInc(inc)
    setSimType(type)
    setSimObs('')
    setRechazoCausal('')
    setRechazoDesc('')
    setRechazoSubsanable(false)
    setValorPagado('')
    setReferenciaPago('')
    setSimDialogOpen(true)

    if (type === 'ACEPTAR' || type === 'PAGAR') {
      fetchCalculo(inc)
    } else {
      setCalculoDesglose(null)
    }
  }

  const fetchCalculo = async (inc: Incapacidad) => {
    const res = await fetch(`/api/incapacidades/${inc.id}`)
    if (res.ok) {
      const data = await res.json()
      if (data.incapacidad?.valorEmpleador !== null && data.incapacidad?.valorEmpleador !== undefined) {
        setCalculoDesglose({
          valorEmpleador: data.incapacidad.valorEmpleador,
          valorEPS: data.incapacidad.valorEPS,
          valorTotal: data.incapacidad.valorCobro,
          diasEmpleador: data.incapacidad.diasEmpleador,
          diasEPS: data.incapacidad.diasIncapacidad - data.incapacidad.diasEmpleador,
          diasFondoPension: data.incapacidad.diasAcumulados > 180 ? data.incapacidad.diasAcumulados - 180 : 0,
          porcentajeEPS: inc.tipoNovedad === 'ACCIDENTE_TRABAJO' ? 1.0 : 0.6667,
          ibcDiario: inc.empleado.salary / 30,
        })
      } else {
        const ibcDiario = inc.empleado.salary / 30
        const diasEmpleador = Math.min(2, inc.diasIncapacidad)
        const diasEPS = Math.max(0, inc.diasIncapacidad - diasEmpleador)
        const porcentajeEPS = inc.tipoNovedad === 'ACCIDENTE_TRABAJO' ? 1.0 : 0.6667
        const valorEmpleador = Math.round(ibcDiario * diasEmpleador * 100) / 100
        const valorEPS = inc.tipoNovedad === 'ACCIDENTE_TRABAJO'
          ? Math.round(ibcDiario * diasEPS * 100) / 100
          : Math.round(ibcDiario * (Math.min(diasEPS, 88) * 0.6667 + Math.max(0, diasEPS - 88) * 0.5) * 100) / 100
        setCalculoDesglose({
          valorEmpleador, valorEPS, valorTotal: valorEmpleador + valorEPS,
          diasEmpleador, diasEPS, diasFondoPension: 0, porcentajeEPS, ibcDiario,
        })
      }
    }
  }

  const handleSimResponse = async () => {
    if (!selectedInc) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = { tipoRespuesta: simType, observaciones: simObs }
      if (simType === 'RECHAZAR') {
        body.causalRechazo = rechazoCausal
        body.descripcionRechazo = rechazoDesc
        body.esSubsanable = rechazoSubsanable
      }
      if (simType === 'PAGAR') {
        body.valorPagado = valorPagado
        body.referenciaPago = referenciaPago
      }
      const res = await fetch(`/api/incapacidades/${selectedInc.id}/eps-respuesta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        const messages: Record<string, string> = {
          'ACEPTAR': `✅ La EPS ${selectedInc.eps.nombre} ha aceptado la incapacidad ${selectedInc.radicado}. Se ha iniciado el proceso de cobro.`,
          'RECHAZAR': `⚠️ La EPS ${selectedInc.eps.nombre} ha rechazado la incapacidad ${selectedInc.radicado}. Revise la causal para determinar los siguientes pasos.`,
          'PAGAR': `✅ Se ha registrado el pago de la EPS ${selectedInc.eps.nombre} para la incapacidad ${selectedInc.radicado}.`,
          'GLOSAR': `⚠️ Se ha registrado una glosa para la incapacidad ${selectedInc.radicado}.`,
        }
        toast({ title: simType === 'RECHAZAR' ? '⚠️ Rechazo registrado' : '✅ Operación exitosa', description: messages[simType] || data.message })
        setSimDialogOpen(false)
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al procesar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexion', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <PenTool className="w-6 h-6 text-primary" />
          Transcripcion EPS y Respuestas
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">Transcribir incapacidades y simular respuestas de EPS</p>
      </div>

      <Card className="border-0 shadow-lg shadow-black/[0.03]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Incapacidades Transcritas</CardTitle>
          <CardDescription>{incapacidades.length} incapacidades transcritas esperando respuesta de EPS</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : incapacidades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <PenTool className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay incapacidades transcritas pendientes</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Radicado</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>EPS</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Valor Cobro</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incapacidades.map((inc) => (
                    <TableRow key={inc.id}>
                      <TableCell className="font-mono font-medium text-sm">{inc.radicado}</TableCell>
                      <TableCell className="text-sm">{inc.empleado.name}</TableCell>
                      <TableCell className="text-sm">{tipoNovedadLabels[inc.tipoNovedad] || inc.tipoNovedad}</TableCell>
                      <TableCell className="text-sm">{inc.diasIncapacidad}</TableCell>
                      <TableCell className="text-sm">{inc.eps.nombre}</TableCell>
                      <TableCell><Badge className={`${estadoColors[inc.estado] || 'bg-gray-50 text-gray-700'} border text-[10px]`}>{inc.estado}</Badge></TableCell>
                      <TableCell className="text-sm font-semibold">{inc.valorCobro ? formatCurrency(inc.valorCobro) : '-'}</TableCell>
                      <TableCell>
<div className="flex gap-1">
                           <Button size="sm" variant="outline" onClick={() => openSimDialog(inc, 'ACEPTAR')} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-7 text-xs">
                             <CheckCircle2 className="w-3 h-3 mr-1" /> Aceptar
                           </Button>
                           <Button size="sm" variant="outline" onClick={() => openSimDialog(inc, 'RECHAZAR')} className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 text-xs">
                             <XCircle className="w-3 h-3 mr-1" /> Rechazar
                           </Button>
                           {inc.estado === 'EN_COBRO' && (
                             <Button size="sm" variant="outline" onClick={() => openSimDialog(inc, 'PAGAR')} className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 h-7 text-xs">
                               <DollarSign className="w-3 h-3 mr-1" /> Pagar
                             </Button>
                           )}
                           <Button size="sm" variant="outline" onClick={() => handleOpenEvidencia(inc)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7 text-xs">
                             <FileCheck className="w-3 h-3 mr-1" /> Evidencia
                           </Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={simDialogOpen} onOpenChange={setSimDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {simType === 'ACEPTAR' && 'Simular Aceptacion EPS'}
              {simType === 'RECHAZAR' && 'Simular Rechazo EPS'}
              {simType === 'PAGAR' && 'Registrar Pago EPS'}
              {simType === 'GLOSAR' && 'Registrar Glosa'}
            </DialogTitle>
            <DialogDescription>
              {simType === 'ACEPTAR' && 'La EPS acepta la incapacidad y se inicia cobro'}
              {simType === 'RECHAZAR' && 'La EPS rechaza la incapacidad con causal'}
              {simType === 'PAGAR' && 'La EPS realiza el pago de la incapacidad'}
            </DialogDescription>
          </DialogHeader>
          {selectedInc && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-muted/50 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Radicado:</span> <span className="font-mono font-medium">{selectedInc.radicado}</span></div>
                  <div><span className="text-muted-foreground">Empleado:</span> {selectedInc.empleado.name}</div>
                  <div><span className="text-muted-foreground">EPS:</span> {selectedInc.eps.nombre}</div>
                  <div><span className="text-muted-foreground">Tipo:</span> {tipoNovedadLabels[selectedInc.tipoNovedad]}</div>
                </div>
              </div>

              {calculoDesglose && (simType === 'ACEPTAR' || simType === 'PAGAR') && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
                  <h4 className="text-sm font-semibold mb-2">Desglose Economico (IBC)</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">IBC Diario (Salario / 30):</span> <span className="font-mono">{formatCurrency(calculoDesglose.ibcDiario)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Dias empleador (100%):</span> <span>{calculoDesglose.diasEmpleador} dias - {formatCurrency(calculoDesglose.valorEmpleador)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Dias EPS ({calculoDesglose.porcentajeEPS * 100}%):</span> <span>{calculoDesglose.diasEPS} dias - {formatCurrency(calculoDesglose.valorEPS)}</span></div>
                    <div className="flex justify-between pt-2 border-t font-semibold"><span>Valor Total a Cobrar:</span> <span className="text-primary">{formatCurrency(calculoDesglose.valorTotal)}</span></div>
                  </div>
                </div>
              )}

              {simType === 'RECHAZAR' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Causal de Rechazo</Label>
                    <Select value={rechazoCausal} onValueChange={setRechazoCausal}>
                      <SelectTrigger><SelectValue placeholder="Seleccione causal" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DOCUMENTAL">Documental</SelectItem>
                        <SelectItem value="DE_FORMA">De Forma</SelectItem>
                        <SelectItem value="DE_FONDO">De Fondo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Descripcion del Rechazo</Label>
                    <Textarea value={rechazoDesc} onChange={e => setRechazoDesc(e.target.value)} placeholder="Descripcion de la causal de rechazo..." />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="subsanable" checked={rechazoSubsanable} onChange={e => setRechazoSubsanable(e.target.checked)} className="rounded" />
                    <Label htmlFor="subsanable" className="text-sm font-normal">Es subsanable</Label>
                  </div>
                </div>
              )}

              {simType === 'PAGAR' && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Valor Pagado por la EPS</Label>
                    <Input type="number" value={valorPagado} onChange={e => setValorPagado(e.target.value)} placeholder="Ej: 1200000" />
                    {calculoDesglose && <p className="text-xs text-muted-foreground">Valor esperado: {formatCurrency(calculoDesglose.valorTotal)}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Referencia de Pago (opcional)</Label>
                    <Input value={referenciaPago} onChange={e => setReferenciaPago(e.target.value)} placeholder="Numero de referencia o comprobante" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Observaciones (opcional)</Label>
                <Textarea value={simObs} onChange={e => setSimObs(e.target.value)} placeholder="Observaciones adicionales..." />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSimDialogOpen(false)}>Cancelar</Button>
                <Button
                  onClick={handleSimResponse}
                  disabled={submitting || (simType === 'RECHAZAR' && (!rechazoCausal || !rechazoDesc)) || (simType === 'PAGAR' && !valorPagado)}
                  className={simType === 'RECHAZAR' ? 'bg-red-600 hover:bg-red-700' : simType === 'PAGAR' ? 'bg-violet-600 hover:bg-violet-700' : ''}
                >
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {simType === 'ACEPTAR' && 'Confirmar Aceptacion'}
                  {simType === 'RECHAZAR' && 'Confirmar Rechazo'}
                  {simType === 'PAGAR' && 'Registrar Pago'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedInc && !simDialogOpen} onOpenChange={() => { setSelectedInc(null); setNumeroRadicado('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transcribir Incapacidad</DialogTitle>
            <DialogDescription>Registrar la transcripcion en el portal de la EPS</DialogDescription>
          </DialogHeader>
          {selectedInc && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-muted/50">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Radicado:</span> <span className="font-mono font-medium">{selectedInc.radicado}</span></div>
                  <div><span className="text-muted-foreground">Empleado:</span> {selectedInc.empleado.name}</div>
                  <div><span className="text-muted-foreground">EPS:</span> {selectedInc.eps.nombre}</div>
                  <div><span className="text-muted-foreground">Dias:</span> {selectedInc.diasIncapacidad}</div>
                </div>
              </div>

              {selectedInc.eps.portalWeb && (
                <Card className="border-dashed">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Informacion de Contacto EPS</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {selectedInc.eps.portalWeb && (
                      <div className="flex items-center gap-2 text-sm">
                        <ExternalLink className="w-4 h-4 text-primary" />
                        <a href={selectedInc.eps.portalWeb} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Portal Web EPS</a>
                      </div>
                    )}
                    {selectedInc.eps.email && (
                      <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-muted-foreground" /><span>{selectedInc.eps.email}</span></div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label>Numero de Radicado EPS</Label>
                <Input placeholder="Ej: RAD-2024-001234" value={numeroRadicado} onChange={e => setNumeroRadicado(e.target.value)} />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setSelectedInc(null); setNumeroRadicado('') }}>Cancelar</Button>
                <Button onClick={handleTranscribir} disabled={submitting || !numeroRadicado}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Confirmar Transcripcion
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Evidencia Radicacion Dialog */}
      <Dialog open={evidenciaDialogOpen} onOpenChange={setEvidenciaDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Evidencia de Radicacion
            </DialogTitle>
            <DialogDescription>
              Registrar la evidencia de radicacion ante la EPS para la incapacidad {evidenciaInc?.radicado}
            </DialogDescription>
          </DialogHeader>
          {evidenciaInc && (
            <div className="space-y-4">
              {/* Existing evidences */}
              {evidencias[evidenciaInc.id] && evidencias[evidenciaInc.id].length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Evidencias Registradas</Label>
                  <div className="space-y-2">
                    {evidencias[evidenciaInc.id].map((ev: any, idx: number) => (
                      <div key={idx} className="p-2 rounded-lg bg-muted/50 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">{ev.metodoRadicacion}</Badge>
                            <span className="font-mono text-xs">{ev.numeroRadicadoEPS || 'Sin radicado'}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDate(ev.createdAt)}</span>
                        </div>
                        {ev.soporteUrl && (
                          <a href={ev.soporteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 block">
                            Ver soporte
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 p-4 rounded-xl border border-dashed border-primary/20 bg-primary/5">
                <h4 className="text-sm font-semibold">Registrar Nueva Evidencia</h4>
                <div className="space-y-2">
                  <Label className="text-xs">Metodo de Radicacion</Label>
                  <Select value={evidenciaMetodo} onValueChange={setEvidenciaMetodo}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PORTAL_WEB">Portal Web</SelectItem>
                      <SelectItem value="CORREO">Correo Electronico</SelectItem>
                      <SelectItem value="FISICO">Fisico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Numero Radicado EPS</Label>
                  <Input placeholder="Ej: RAD-EPS-2024-001234" value={evidenciaRadicado} onChange={e => setEvidenciaRadicado(e.target.value)} />
                </div>
                {evidenciaMetodo === 'PORTAL_WEB' && (
                  <div className="space-y-2">
                    <Label className="text-xs">URL del Portal (comprobante)</Label>
                    <Input placeholder="https://portal.eps.com.co/radicado/..." value={evidenciaPortal} onChange={e => setEvidenciaPortal(e.target.value)} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs">URL Soporte (opcional)</Label>
                  <Input placeholder="Enlace al documento soporte" value={evidenciaSoporte} onChange={e => setEvidenciaSoporte(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Observaciones (opcional)</Label>
                  <Textarea value={evidenciaObs} onChange={e => setEvidenciaObs(e.target.value)} placeholder="Observaciones sobre la radicacion..." rows={2} />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEvidenciaDialogOpen(false)}>Cerrar</Button>
                <Button onClick={handleEvidenciaSubmit} disabled={evidenciaSubmitting}>
                  {evidenciaSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Registrar Evidencia
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}