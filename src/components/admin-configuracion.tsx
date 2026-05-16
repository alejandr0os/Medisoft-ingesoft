'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import {
  Wrench,
  Loader2,
  Save,
  Bell,
  Shield,
  Clock,
  Database,
  Activity,
  Settings,
} from 'lucide-react'

interface NotificationSetting {
  key: string
  label: string
  description: string
  enabled: boolean
}

interface SystemStats {
  totalIncapacidades: number
  totalEmpleados: number
  totalEPS: number
  totalARL: number
  totalLotesCobro: number
  totalReintegros: number
  totalCobrosJuridicos: number
  totalDerechosPeticion: number
  lastActivity: string | null
  dbSize: string | null
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

interface Props {
  user: any
}

export default function AdminConfiguracion({ user }: Props) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState<SystemStats | null>(null)

  // Settings state
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    { key: 'notif_nueva_incapacidad', label: 'Nueva Incapacidad', description: 'Notificar cuando se registra una nueva incapacidad', enabled: true },
    { key: 'notif_validacion', label: 'Validación Pendiente', description: 'Notificar cuando hay incapacidades pendientes de validación', enabled: true },
    { key: 'notif_subsanacion', label: 'Subsanación Requerida', description: 'Notificar cuando se requiere subsanación', enabled: true },
    { key: 'notif_rechazo', label: 'Rechazo EPS', description: 'Notificar cuando una EPS rechaza una incapacidad', enabled: true },
    { key: 'notif_pago', label: 'Pago Recibido', description: 'Notificar cuando se recibe un pago de EPS', enabled: true },
    { key: 'notif_glosa', label: 'Glosa', description: 'Notificar cuando se registra una glosa', enabled: true },
    { key: 'notif_vencimiento', label: 'Vencimiento de Plazos', description: 'Notificar cuando se acerca un vencimiento de plazo', enabled: true },
    { key: 'notif_180_dias', label: 'Alerta 180 Días', description: 'Notificar cuando un empleado acumula 180 días de incapacidad', enabled: true },
    { key: 'notif_reintegro', label: 'Reintegro Pendiente', description: 'Notificar cuando hay un reintegro pendiente', enabled: true },
    { key: 'notif_dp_vencido', label: 'Derecho de Petición Vencido', description: 'Notificar cuando un derecho de petición supera 15 días sin respuesta', enabled: true },
  ])

  const [sessionTimeout, setSessionTimeout] = useState('30')
  const [passwordMinLength, setPasswordMinLength] = useState('8')
  const [passwordRequireUppercase, setPasswordRequireUppercase] = useState(true)
  const [passwordRequireNumber, setPasswordRequireNumber] = useState(true)
  const [passwordRequireSpecial, setPasswordRequireSpecial] = useState(false)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      const [dashRes, paramRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/parametros'),
      ])
      if (dashRes.ok) {
        const data = await dashRes.json()
        setStats({
          totalIncapacidades: data.stats?.totalIncapacidades || 0,
          totalEmpleados: data.epsStats?.reduce((s: number, e: any) => s + (e.empleados || 0), 0) || 0,
          totalEPS: data.epsStats?.length || 0,
          totalARL: 0,
          totalLotesCobro: 0,
          totalReintegros: data.stats?.reintegros || 0,
          totalCobrosJuridicos: 0,
          totalDerechosPeticion: 0,
          lastActivity: null,
          dbSize: null,
        })
      }
      if (paramRes.ok) {
        const paramData = await paramRes.json()
        const params: Array<{ categoria: string; nombre: string; valor: string }> = paramData.parametros || []
        const configParams = params.filter((p: any) => p.categoria === 'CONFIG')
        const notifParams = params.filter((p: any) => p.categoria === 'NOTIFICACIONES')

        configParams.forEach((p: any) => {
          if (p.nombre === 'sessionTimeout') setSessionTimeout(p.valor)
          if (p.nombre === 'passwordMinLength') setPasswordMinLength(p.valor)
          if (p.nombre === 'passwordRequireUppercase') setPasswordRequireUppercase(p.valor === 'true')
          if (p.nombre === 'passwordRequireNumber') setPasswordRequireNumber(p.valor === 'true')
          if (p.nombre === 'passwordRequireSpecial') setPasswordRequireSpecial(p.valor === 'true')
        })

        if (notifParams.length > 0) {
          setNotifications(prev => prev.map(n => {
            const saved = notifParams.find((p: any) => p.nombre === n.key)
            return saved ? { ...n, enabled: saved.valor === 'true' } : n
          }))
        }
      }
    } catch {
      toast({ title: 'Error de carga', description: 'No se pudieron cargar los parámetros de configuración.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const toggleNotification = (key: string) => {
    setNotifications(prev => prev.map(n => n.key === key ? { ...n, enabled: !n.enabled } : n))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates: Array<{ categoria: string; nombre: string; valor: string }> = []
      updates.push({ categoria: 'CONFIG', nombre: 'sessionTimeout', valor: String(sessionTimeout) })
      updates.push({ categoria: 'CONFIG', nombre: 'passwordMinLength', valor: String(passwordMinLength) })
      updates.push({ categoria: 'CONFIG', nombre: 'passwordRequireUppercase', valor: String(passwordRequireUppercase) })
      updates.push({ categoria: 'CONFIG', nombre: 'passwordRequireNumber', valor: String(passwordRequireNumber) })
      updates.push({ categoria: 'CONFIG', nombre: 'passwordRequireSpecial', valor: String(passwordRequireSpecial) })
      notifications.forEach(n => {
        updates.push({ categoria: 'NOTIFICACIONES', nombre: n.key, valor: String(n.enabled) })
      })

      let allOk = true
      for (const u of updates) {
        const res = await fetch('/api/parametros', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(u),
        })
        if (!res.ok) { allOk = false }
      }

      if (allOk) {
        toast({ title: '✅ Configuración guardada', description: 'Todos los parámetros del sistema han sido actualizados correctamente.' })
      } else {
        toast({ title: '⚠️ Configuración parcialmente guardada', description: 'Algunos parámetros no pudieron guardarse. Intente de nuevo.', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexion al guardar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="w-6 h-6 text-primary" />
            Configuración General
          </h2>
          <p className="text-muted-foreground mt-1">Configuración del sistema Medisoft</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar Cambios
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Email Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                Notificaciones por Email
              </CardTitle>
              <CardDescription>Configurar qué notificaciones se envían por correo electrónico</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {notifications.map((notif, idx) => (
                <div key={notif.key}>
                  <div className="flex items-center justify-between py-2.5">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">{notif.label}</Label>
                      <p className="text-xs text-muted-foreground">{notif.description}</p>
                    </div>
                    <Switch
                      checked={notif.enabled}
                      onCheckedChange={() => toggleNotification(notif.key)}
                    />
                  </div>
                  {idx < notifications.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Session and Password Settings */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Sesión
                </CardTitle>
                <CardDescription>Configuración de tiempo de sesión</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Tiempo de inactividad antes de cerrar sesión (minutos)</Label>
                  <Input
                    type="number"
                    value={sessionTimeout}
                    onChange={e => setSessionTimeout(e.target.value)}
                    min="5"
                    max="120"
                  />
                  <p className="text-xs text-muted-foreground">Entre 5 y 120 minutos. Valor predeterminado: 30 minutos.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Política de Contraseñas
                </CardTitle>
                <CardDescription>Requisitos para las contraseñas de usuario</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Longitud mínima</Label>
                  <Input
                    type="number"
                    value={passwordMinLength}
                    onChange={e => setPasswordMinLength(e.target.value)}
                    min="6"
                    max="32"
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Requerir mayúsculas</Label>
                    <p className="text-xs text-muted-foreground">Al menos una letra mayúscula</p>
                  </div>
                  <Switch checked={passwordRequireUppercase} onCheckedChange={setPasswordRequireUppercase} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Requerir números</Label>
                    <p className="text-xs text-muted-foreground">Al menos un dígito</p>
                  </div>
                  <Switch checked={passwordRequireNumber} onCheckedChange={setPasswordRequireNumber} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Requerir caracteres especiales</Label>
                    <p className="text-xs text-muted-foreground">Al menos un carácter especial (!@#$%)</p>
                  </div>
                  <Switch checked={passwordRequireSpecial} onCheckedChange={setPasswordRequireSpecial} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Health - Full Width */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                Salud del Sistema
              </CardTitle>
              <CardDescription>Estado actual de la base de datos y registros</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <Activity className="w-6 h-6 text-primary mx-auto mb-1" />
                    <p className="text-2xl font-bold">{stats?.totalIncapacidades || 0}</p>
                    <p className="text-xs text-muted-foreground">Incapacidades</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <Settings className="w-6 h-6 text-primary mx-auto mb-1" />
                    <p className="text-2xl font-bold">{stats?.totalEmpleados || 0}</p>
                    <p className="text-xs text-muted-foreground">Empleados</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <Shield className="w-6 h-6 text-primary mx-auto mb-1" />
                    <p className="text-2xl font-bold">{stats?.totalEPS || 0}</p>
                    <p className="text-xs text-muted-foreground">EPS</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="p-4 text-center">
                    <Wrench className="w-6 h-6 text-primary mx-auto mb-1" />
                    <p className="text-2xl font-bold">{stats?.totalReintegros || 0}</p>
                    <p className="text-xs text-muted-foreground">Reintegros</p>
                  </CardContent>
                </Card>
              </div>

              {stats && (
                <div className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tabla</TableHead>
                        <TableHead className="text-right">Registros</TableHead>
                        <TableHead>Última Actividad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-sm">Incapacidades</TableCell>
                        <TableCell className="text-right font-mono">{stats.totalIncapacidades}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(stats.lastActivity)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-sm">Empleados</TableCell>
                        <TableCell className="text-right font-mono">{stats.totalEmpleados}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">-</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-sm">EPS</TableCell>
                        <TableCell className="text-right font-mono">{stats.totalEPS}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">-</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-sm">Reintegros</TableCell>
                        <TableCell className="text-right font-mono">{stats.totalReintegros}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">-</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-sm">Lotes de Cobro</TableCell>
                        <TableCell className="text-right font-mono">{stats.totalLotesCobro}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">-</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-sm">Cobros Jurídicos</TableCell>
                        <TableCell className="text-right font-mono">{stats.totalCobrosJuridicos}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">-</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-sm">Derechos de Petición</TableCell>
                        <TableCell className="text-right font-mono">{stats.totalDerechosPeticion}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">-</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}

              {stats?.dbSize && (
                <div className="mt-4 p-3 rounded-lg bg-muted/30 text-sm">
                  <span className="text-muted-foreground">Tamaño de la base de datos: </span>
                  <span className="font-medium">{stats.dbSize}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
