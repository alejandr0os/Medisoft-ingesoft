// Panel principal con estadisticas por rol

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  Building2,
  Bell,
  Scale,
  Gavel,
  Receipt,
  RotateCcw,
  User,
} from 'lucide-react'
import type { LoginUser } from './login-form'

interface DashboardData {
  stats: {
    totalIncapacidades: number
    pendientesValidacion: number
    enCobro: number
    pagadas: number
    rechazadas: number
    largoPlazo: number
    reintegros: number
    unreadNotifications: number
  }
  byTipo: { tipoNovedad: string; _count: { tipoNovedad: number } }[]
  byEstado: { estado: string; _count: { estado: number } }[]
  epsStats: { id: string; nombre: string; incapacidades: number; empleados: number }[]
  recentIncapacidades: {
    id: string
    radicado: string
    estado: string
    tipoNovedad: string
    diasIncapacidad: number
    empleado: { name: string; cargo: string }
    eps: { nombre: string }
  }[]
  roleSpecificData: Record<string, unknown>
}

interface DashboardProps {
  user: LoginUser
  onSectionChange?: (section: string) => void
}

const estadoColors: Record<string, string> = {
  RECIBIDA: 'bg-sky-50 text-sky-700 border-sky-200/60',
  PENDIENTE_VALIDACION: 'bg-amber-50 text-amber-700 border-amber-200/60',
  VALIDADA: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  PENDIENTE_SUBSANACION: 'bg-orange-50 text-orange-700 border-orange-200/60',
  SUBSANACION_VENCIDA: 'bg-red-50 text-red-700 border-red-200/60',
  TRANSCRITA: 'bg-teal-50 text-teal-700 border-teal-200/60',
  RECHAZADA_ENTIDAD: 'bg-red-50 text-red-700 border-red-200/60',
  EN_COBRO: 'bg-violet-50 text-violet-700 border-violet-200/60',
  COBRO_PERSUASIVO: 'bg-amber-50 text-amber-700 border-amber-200/60',
  COBRO_JURIDICO: 'bg-rose-50 text-rose-700 border-rose-200/60',
  GLOSA: 'bg-pink-50 text-pink-700 border-pink-200/60',
  PAGADA: 'bg-green-50 text-green-700 border-green-200/60',
  TRAMITE_PENSION: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
  ARCHIVADA: 'bg-gray-50 text-gray-700 border-gray-200/60',
}

const estadoLabels: Record<string, string> = {
  RECIBIDA: 'Recibida',
  PENDIENTE_VALIDACION: 'Pendiente Validacion',
  VALIDADA: 'Validada',
  PENDIENTE_SUBSANACION: 'Pendiente Subsanacion',
  SUBSANACION_VENCIDA: 'Subsanacion Vencida',
  TRANSCRITA: 'Transcrita',
  RECHAZADA_ENTIDAD: 'Rechazada',
  EN_COBRO: 'En Cobro',
  COBRO_PERSUASIVO: 'Cobro Persuasivo',
  COBRO_JURIDICO: 'Cobro Juridico',
  GLOSA: 'Glosa',
  PAGADA: 'Pagada',
  TRAMITE_PENSION: 'Tramite Pension',
  ARCHIVADA: 'Archivada',
}

const tipoLabels: Record<string, string> = {
  ENFERMEDAD_COMUN: 'Enfermedad Comun',
  ACCIDENTE_TRANSITO: 'Accidente Transito',
  ACCIDENTE_TRABAJO: 'Accidente Trabajo',
  LICENCIA_MATERNIDAD: 'Licencia Maternidad',
  LICENCIA_PATERNIDAD: 'Licencia Paternidad',
  PRORROGA: 'Prorroga',
}

const barColors: Record<string, string> = {
  RECIBIDA: 'bg-sky-500',
  PENDIENTE_VALIDACION: 'bg-amber-500',
  VALIDADA: 'bg-emerald-500',
  PENDIENTE_SUBSANACION: 'bg-orange-500',
  SUBSANACION_VENCIDA: 'bg-red-500',
  TRANSCRITA: 'bg-teal-500',
  RECHAZADA_ENTIDAD: 'bg-red-500',
  EN_COBRO: 'bg-violet-500',
  COBRO_PERSUASIVO: 'bg-amber-500',
  COBRO_JURIDICO: 'bg-rose-500',
  GLOSA: 'bg-pink-500',
  PAGADA: 'bg-green-500',
  TRAMITE_PENSION: 'bg-indigo-500',
  ARCHIVADA: 'bg-gray-500',
}

function StatCard({
  title,
  value,
  icon,
  description,
  color = 'text-foreground',
  delay = 0,
  onClick,
}: {
  title: string
  value: number | string
  icon: React.ReactNode
  description?: string
  color?: string
  delay?: number
  onClick?: () => void
}) {
  return (
    <Card 
      className={`border-0 shadow-lg shadow-black/[0.03] bg-white animate-slide-up ${onClick ? 'cursor-pointer hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1' : ''}`} 
      style={{ animationDelay: `${delay}ms` }}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{title}</p>
            <p className={`text-2xl font-bold mt-1.5 tracking-tight ${color}`}>{value}</p>
            {description && (
              <p className="text-[11px] text-muted-foreground/60 mt-1">{description}</p>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shrink-0">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard({ user, onSectionChange }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/dashboard')
        if (res.ok) {
          const json = await res.json()
          setData(json)
        } else {
          setData(null)
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error)
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-0 shadow-lg shadow-black/[0.03]">
              <CardContent className="p-5">
                <div className="animate-pulse">
                  <div className="h-3 bg-muted/60 rounded w-20 mb-3" />
                  <div className="h-7 bg-muted/60 rounded w-12" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <Card className="border-0 shadow-lg shadow-black/[0.03]">
        <CardContent className="p-10 text-center text-muted-foreground">
          Error al cargar datos del dashboard
        </CardContent>
      </Card>
    )
  }

  const { stats, byEstado, epsStats, recentIncapacidades } = data

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h2 className="text-2xl font-bold text-foreground tracking-tight">
          Bienvenido, {user.name.split(' ')[0]}
        </h2>
        <p className="text-muted-foreground/70 mt-1 text-sm">
          Resumen general del sistema de gestion de incapacidades
        </p>
      </div>

      {user.role === 'ADMIN' && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Incapacidades" value={stats.totalIncapacidades} icon={<FileText className="w-5 h-5 text-primary" />} delay={0} onClick={() => onSectionChange?.('gestion-empleados')} />
          <StatCard title="Pendientes Validacion" value={stats.pendientesValidacion} icon={<Clock className="w-5 h-5 text-amber-500" />} description="Requieren atencion" delay={50} onClick={() => onSectionChange?.('gestion-empleados')} />
          <StatCard title="En Cobro" value={stats.enCobro} icon={<DollarSign className="w-5 h-5 text-violet-500" />} delay={100} onClick={() => onSectionChange?.('configuracion')} />
          <StatCard title="Pagadas" value={stats.pagadas} icon={<CheckCircle2 className="w-5 h-5 text-green-500" />} delay={150} />
          <StatCard title="Rechazadas" value={stats.rechazadas} icon={<XCircle className="w-5 h-5 text-red-500" />} delay={200} />
          <StatCard title="Largo Plazo (+90d)" value={stats.largoPlazo} icon={<AlertTriangle className="w-5 h-5 text-orange-500" />} delay={250} />
          <StatCard title="Reintegros Pendientes" value={stats.reintegros} icon={<RotateCcw className="w-5 h-5 text-rose-500" />} delay={300} />
          <StatCard title="EPS Activas" value={epsStats.length} icon={<Building2 className="w-5 h-5 text-teal-500" />} delay={350} onClick={() => onSectionChange?.('entidades')} />
        </div>
      )}

      {user.role === 'EMPLEADO' && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Mis Incapacidades" value={(data.roleSpecificData as { misIncapacidades: number })?.misIncapacidades ?? 0} icon={<FileText className="w-5 h-5 text-primary" />} delay={0} onClick={() => onSectionChange?.('mis-incapacidades')} />
          <StatCard title="Pendientes" value={(data.roleSpecificData as { misPendientes: number })?.misPendientes ?? 0} icon={<Clock className="w-5 h-5 text-amber-500" />} description="En proceso de validacion" delay={50} onClick={() => onSectionChange?.('consultar-incapacidades')} />
          <StatCard title="Notificaciones" value={stats.unreadNotifications} icon={<Bell className="w-5 h-5 text-blue-500" />} description="Sin leer" delay={100} onClick={() => onSectionChange?.('notificaciones')} />
        </div>
      )}

      {user.role === 'AUXILIAR_GH' && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Incapacidades" value={stats.totalIncapacidades} icon={<FileText className="w-5 h-5 text-primary" />} delay={0} />
          <StatCard title="Pendientes Validacion" value={stats.pendientesValidacion} icon={<Clock className="w-5 h-5 text-amber-500" />} description="Requieren revision" delay={50} onClick={() => onSectionChange?.('incapacidades-pendientes')} />
          <StatCard title="En Cobro" value={stats.enCobro} icon={<DollarSign className="w-5 h-5 text-violet-500" />} delay={100} onClick={() => onSectionChange?.('gestion-cobros')} />
          <StatCard title="Largo Plazo (+90d)" value={stats.largoPlazo} icon={<AlertTriangle className="w-5 h-5 text-orange-500" />} delay={150} onClick={() => onSectionChange?.('casos-largo-plazo')} />
        </div>
      )}

      {user.role === 'GERENCIA' && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Incapacidades" value={stats.totalIncapacidades} icon={<FileText className="w-5 h-5 text-primary" />} delay={0} onClick={() => onSectionChange?.('consulta-incapacidades')} />
          <StatCard title="Pagadas" value={stats.pagadas} icon={<CheckCircle2 className="w-5 h-5 text-green-500" />} delay={50} onClick={() => onSectionChange?.('reportes')} />
          <StatCard title="En Cobro" value={stats.enCobro} icon={<DollarSign className="w-5 h-5 text-violet-500" />} delay={100} onClick={() => onSectionChange?.('reportes')} />
          <StatCard title="Rechazadas" value={stats.rechazadas} icon={<XCircle className="w-5 h-5 text-red-500" />} delay={150} onClick={() => onSectionChange?.('consulta-incapacidades')} />
        </div>
      )}

      {user.role === 'CONTABILIDAD' && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Reintegros Pendientes" value={(data.roleSpecificData as { reintegrosPendientes: number })?.reintegrosPendientes ?? 0} icon={<RotateCcw className="w-5 h-5 text-rose-500" />} description="Mayor a 180 dias" delay={0} onClick={() => onSectionChange?.('reintegros')} />
          <StatCard title="Lotes Pendientes" value={(data.roleSpecificData as { lotesPendientes: number })?.lotesPendientes ?? 0} icon={<Receipt className="w-5 h-5 text-amber-500" />} description="Generados o enviados" delay={50} onClick={() => onSectionChange?.('conciliacion-bancaria')} />
          <StatCard title="En Cobro" value={stats.enCobro} icon={<DollarSign className="w-5 h-5 text-violet-500" />} delay={100} onClick={() => onSectionChange?.('conciliacion-bancaria')} />
          <StatCard title="Pagadas" value={stats.pagadas} icon={<CheckCircle2 className="w-5 h-5 text-green-500" />} delay={150} />
        </div>
      )}

      {user.role === 'ABOGADO' && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Rechazadas EPS" value={stats.rechazadas} icon={<XCircle className="w-5 h-5 text-red-500" />} delay={0} onClick={() => onSectionChange?.('rechazos-eps')} />
          <StatCard title="Cobros Juridicos" value={(data.roleSpecificData as { cobrosJuridicos: number })?.cobrosJuridicos ?? 0} icon={<Gavel className="w-5 h-5 text-rose-500" />} description="Activos" delay={50} onClick={() => onSectionChange?.('cobro-juridico')} />
          <StatCard title="Derechos de Peticion" value={(data.roleSpecificData as { derechosPeticion: number })?.derechosPeticion ?? 0} icon={<Scale className="w-5 h-5 text-amber-500" />} description="Pendientes" delay={100} onClick={() => onSectionChange?.('derecho-peticion')} />
          <StatCard title="En Cobro" value={stats.enCobro} icon={<DollarSign className="w-5 h-5 text-violet-500" />} delay={150} onClick={() => onSectionChange?.('cobro-persuasivo')} />
        </div>
      )}

      {user.role !== 'EMPLEADO' && (
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center gap-2 border-b border-border/50 pb-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <User className="w-4 h-4 text-sky-600" />
            </div>
            <h3 className="text-sm font-bold text-foreground/80 uppercase tracking-wider">Mis Incapacidades Personales</h3>
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard 
              title="Mis Incapacidades" 
              value={(data.roleSpecificData as { misIncapacidades: number })?.misIncapacidades ?? 0} 
              icon={<FileText className="w-5 h-5 text-primary" />} 
              delay={450} 
              onClick={() => onSectionChange?.('mis-incapacidades')} 
            />
            <StatCard 
              title="Mis Pendientes" 
              value={(data.roleSpecificData as { misPendientes: number })?.misPendientes ?? 0} 
              icon={<Clock className="w-5 h-5 text-amber-500" />} 
              description="En proceso de validacion" 
              delay={500} 
              onClick={() => onSectionChange?.('consultar-incapacidades')} 
            />
            <StatCard 
              title="Mis Notificaciones" 
              value={stats.unreadNotifications} 
              icon={<Bell className="w-5 h-5 text-blue-500" />} 
              description="Sin leer" 
              delay={550} 
              onClick={() => onSectionChange?.('notificaciones')} 
            />
          </div>
        </div>
      )}

      {user.role !== 'EMPLEADO' && (
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="card-hover border-0 shadow-lg shadow-black/[0.03] animate-slide-up" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
              </div>
              Distribucion por Estado
            </CardTitle>
            <CardDescription>Estado actual de las incapacidades</CardDescription>
          </CardHeader>
          <CardContent>
            {byEstado.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay incapacidades registradas
              </p>
            ) : (
              <div className="space-y-2.5">
                {byEstado
                  .sort((a, b) => b._count.estado - a._count.estado)
                  .map((item) => (
                    <div key={item.estado} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Badge className={`${estadoColors[item.estado] || 'bg-gray-50 text-gray-700 border-gray-200/60'} border text-[11px] font-medium px-2 py-0.5 rounded-md`}>
                          {estadoLabels[item.estado] || item.estado}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-28 h-2 bg-muted/50 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${barColors[item.estado] || 'bg-primary'}`}
                            style={{
                              width: `${Math.min(100, (item._count.estado / Math.max(stats.totalIncapacidades, 1)) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-semibold w-6 text-right tabular-nums">{item._count.estado}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-hover border-0 shadow-lg shadow-black/[0.03] animate-slide-up" style={{ animationDelay: '300ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5 text-primary" />
              </div>
              Entidades EPS
            </CardTitle>
            <CardDescription>Incapacidades por EPS</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              {epsStats.map((eps) => (
                <div key={eps.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <span className="text-sm font-medium">{eps.nombre}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {eps.empleados}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {eps.incapacidades}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {user.role !== 'EMPLEADO' && (
      <Card className="card-hover border-0 shadow-lg shadow-black/[0.03] animate-slide-up" style={{ animationDelay: '400ms' }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-primary" />
            </div>
            Actividad Reciente
          </CardTitle>
          <CardDescription>Ultimas incapacidades registradas</CardDescription>
        </CardHeader>
        <CardContent>
          {recentIncapacidades.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay incapacidades registradas aun
            </p>
          ) : (
            <div className="space-y-2">
              {recentIncapacidades.map((inc) => (
                <div
                  key={inc.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {inc.empleado.name}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {inc.radicado} | {tipoLabels[inc.tipoNovedad] || inc.tipoNovedad} | {inc.diasIncapacidad} dias | {inc.eps.nombre}
                    </p>
                  </div>
                  <Badge className={`${estadoColors[inc.estado] || 'bg-gray-50 text-gray-700 border-gray-200/60'} border text-[10px] ml-2 shrink-0 px-2 py-0.5 rounded-md font-medium`}>
                    {estadoLabels[inc.estado] || inc.estado}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  )
}