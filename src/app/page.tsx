'use client'

import { useState, useCallback, useEffect } from 'react'
import LoginForm from '@/components/login-form'
import type { LoginUser } from '@/components/login-form'
import AppShell from '@/components/app-shell'
import Dashboard from '@/components/dashboard'
import NotificationPanel from '@/components/notification-panel'
import EmpleadoIncapacidades from '@/components/empleado-incapacidades'
import GHIncapacidadesPendientes from '@/components/gh-incapacidades-pendientes'
import GHTranscripcion from '@/components/gh-transcripcion'
import GHSeguimiento from '@/components/gh-seguimiento'
import GHCobros from '@/components/gh-cobros'
import GHProrrogas from '@/components/gh-prorrogas'
import GHLargoPlazo from '@/components/gh-largo-plazo'
import GerenciaReportes from '@/components/gerencia-reportes'
import GerenciaConsultas from '@/components/gerencia-consultas'
import ContabilidadConciliacion from '@/components/contabilidad-conciliacion'
import ContabilidadReintegros from '@/components/contabilidad-reintegros'
import AbogadoRechazos from '@/components/abogado-rechazos'
import AbogadoCobroPersuasivo from '@/components/abogado-cobro-persuasivo'
import AbogadoCobroJuridico from '@/components/abogado-cobro-juridico'
import AbogadoDerechoPeticion from '@/components/abogado-derecho-peticion'
import AdminEmpleados from '@/components/admin-empleados'
import AdminConfiguracion from '@/components/admin-configuracion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Settings,
  Users,
  Building2,
  UserCog,
  Loader2,
  Activity,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react'

export default function HomePage() {
  const [user, setUser] = useState<LoginUser | null>(null)
  const [activeSection, setActiveSection] = useState('dashboard')
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [initialLoading, setInitialLoading] = useState(true)

  // Check existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        }
      } catch {
        // Not authenticated
      } finally {
        setInitialLoading(false)
      }
    }
    checkSession()
  }, [])

  const handleLogin = useCallback((loggedInUser: LoginUser) => {
    setUser(loggedInUser)
    setActiveSection('dashboard')
  }, [])

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Ignore errors
    }
    setUser(null)
    setActiveSection('dashboard')
  }, [])

  const handleUnreadChange = useCallback((count: number) => {
    setUnreadNotifications(count)
  }, [])

  // Loading screen
  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-xl overflow-hidden p-2">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain mix-blend-multiply" />
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Cargando sistema...</span>
          </div>
        </div>
      </div>
    )
  }

  // Login screen
  if (!user) {
    return <LoginForm onLogin={handleLogin} />
  }

  // Render active section content
  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard user={user} onSectionChange={setActiveSection} />
      
      case 'notificaciones':
        return <NotificationPanel onUnreadChange={handleUnreadChange} />

      // ========== ADMIN SECTIONS ==========
      case 'parametros':
        return <ParametrosSection />
      case 'usuarios-roles':
        return <UsuariosRolesSection />
      case 'entidades':
        return <EntidadesSection />
      case 'gestion-empleados':
        return <AdminEmpleados user={user} />
      case 'configuracion':
        return <AdminConfiguracion user={user} />

      // ========== EMPLEADO SECTIONS ==========
      case 'mis-incapacidades':
      case 'registrar-incapacidad':
      case 'consultar-incapacidades':
      case 'subsanar-incapacidad':
      case 'prorrogas-empleado':
        return <EmpleadoIncapacidades user={user} section={activeSection} onSectionChange={setActiveSection} />

      // ========== AUXILIAR_GH SECTIONS ==========
      case 'incapacidades-pendientes':
      case 'validar-incapacidad':
      case 'gestionar-subsanacion':
        return <GHIncapacidadesPendientes user={user} section={activeSection} onSectionChange={setActiveSection} />
      case 'transcripcion-eps':
        return <GHTranscripcion user={user} section={activeSection} onSectionChange={setActiveSection} />
      case 'seguimiento-alertas':
        return <GHSeguimiento user={user} section={activeSection} onSectionChange={setActiveSection} />
      case 'gestion-cobros':
        return <GHCobros user={user} section={activeSection} onSectionChange={setActiveSection} />
      case 'prorrogas':
        return <GHProrrogas user={user} section={activeSection} onSectionChange={setActiveSection} />
      case 'casos-largo-plazo':
        return <GHLargoPlazo user={user} section={activeSection} onSectionChange={setActiveSection} />

      // ========== GERENCIA SECTIONS ==========
      case 'reportes':
        return <GerenciaReportes user={user} />
      case 'consultas':
      case 'consulta-incapacidades':
      case 'consulta-empleados':
      case 'consulta-entidades':
        return <GerenciaConsultas user={user} section={activeSection} onSectionChange={setActiveSection} />

      // ========== CONTABILIDAD SECTIONS ==========
      case 'conciliacion-bancaria':
        return <ContabilidadConciliacion user={user} />
      case 'reintegros':
        return <ContabilidadReintegros user={user} />

      // ========== ABOGADO SECTIONS ==========
      case 'rechazos-eps':
        return <AbogadoRechazos user={user} />
      case 'cobro-persuasivo':
        return <AbogadoCobroPersuasivo user={user} />
      case 'cobro-juridico':
        return <AbogadoCobroJuridico user={user} />
      case 'derecho-peticion':
        return <AbogadoDerechoPeticion user={user} />

      default:
        return <Dashboard user={user} />
    }
  }

  return (
    <AppShell
      user={user}
      onLogout={handleLogout}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      unreadNotifications={unreadNotifications}
    >
      {renderContent()}
    </AppShell>
  )
}

// ==================== ADMIN SECTIONS ====================

function ParametrosSection() {
  const [parametros, setParametros] = useState<Array<{ id: string; categoria: string; nombre: string; valor: string; descripcion: string | null; activo: boolean }>>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchParametros = useCallback(async () => {
    try {
      const res = await fetch('/api/parametros')
      if (res.ok) {
        const data = await res.json()
        setParametros(data.parametros || data || [])
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchParametros() }, [fetchParametros])

  const handleSave = async (id: string) => {
    setSaving(true)
    try {
      const res = await fetch('/api/parametros', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, valor: editValue }),
      })
      if (res.ok) {
        setEditingId(null)
        fetchParametros()
      }
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const categorias = [...new Set(parametros.map(p => p.categoria))]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          Parámetros del Sistema
        </h2>
        <p className="text-muted-foreground mt-1">Configuración de parámetros legales, tiempos y cobros</p>
      </div>
      {loading ? (
        <Card><CardContent className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {categorias.map(cat => (
            <Card key={cat}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">{cat}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parámetro</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parametros.filter(p => p.categoria === cat).map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium text-sm">{p.nombre}</TableCell>
                        <TableCell>
                          {editingId === p.id ? (
                            <div className="flex items-center gap-1">
                              <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="h-7 w-32 text-sm" />
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSave(p.id)} disabled={saving}>
                                <Check className="w-3 h-3 text-green-600" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                                <X className="w-3 h-3 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="outline" className="font-mono cursor-pointer hover:bg-muted" onClick={() => { setEditingId(p.id); setEditValue(p.valor) }}>
                              {p.valor}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.descripcion}</TableCell>
                        <TableCell>
                          <Badge className={p.activo ? 'bg-green-100 text-green-700 border-0' : 'bg-gray-100 text-gray-700 border-0'}>
                            {p.activo ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingId(p.id); setEditValue(p.valor) }}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function UsuariosRolesSection() {
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string; role: string; active: boolean; document: string }>>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', document: '', password: '', role: 'EMPLEADO' })
  const [creating, setCreating] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || data || [])
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })
      if (res.ok) {
        setCreateDialogOpen(false)
        setNewUser({ name: '', email: '', document: '', password: '', role: 'EMPLEADO' })
        fetchUsers()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al crear usuario')
      }
    } catch { /* ignore */ }
    finally { setCreating(false) }
  }

  const roleLabels: Record<string, string> = {
    EMPLEADO: 'Empleado',
    AUXILIAR_GH: 'Auxiliar GH',
    GERENCIA: 'Gerencia',
    CONTABILIDAD: 'Contabilidad',
    ABOGADO: 'Abogado',
    ADMIN: 'Administrador',
  }

  const roleColors: Record<string, string> = {
    EMPLEADO: 'bg-blue-100 text-blue-700',
    AUXILIAR_GH: 'bg-emerald-100 text-emerald-700',
    GERENCIA: 'bg-purple-100 text-purple-700',
    CONTABILIDAD: 'bg-amber-100 text-amber-700',
    ABOGADO: 'bg-rose-100 text-rose-700',
    ADMIN: 'bg-red-100 text-red-700',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="w-6 h-6 text-primary" />
            Usuarios y Roles
          </h2>
          <p className="text-muted-foreground mt-1">Gestión de usuarios del sistema y asignación de roles</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nuevo Usuario
        </Button>
      </div>
      {loading ? (
        <Card><CardContent className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></CardContent></Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usuarios Registrados</CardTitle>
            <CardDescription>{users.length} usuarios en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="font-mono text-sm">{u.document}</TableCell>
                    <TableCell>
                      <Badge className={`${roleColors[u.role] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>
                        {roleLabels[u.role] || u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={u.active ? 'bg-green-100 text-green-700 border-0' : 'bg-gray-100 text-gray-700 border-0'}>
                        {u.active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>Ingrese los datos del nuevo usuario</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre Completo *</Label>
              <Input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder="Juan Pérez" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="correo@medisoft.com" />
              </div>
              <div className="space-y-2">
                <Label>Documento *</Label>
                <Input value={newUser.document} onChange={e => setNewUser({ ...newUser, document: e.target.value })} placeholder="10000001" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contraseña *</Label>
                <Input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="******" />
              </div>
              <div className="space-y-2">
                <Label>Rol *</Label>
                <Select value={newUser.role} onValueChange={r => setNewUser({ ...newUser, role: r })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLEADO">Empleado</SelectItem>
                    <SelectItem value="AUXILIAR_GH">Auxiliar GH</SelectItem>
                    <SelectItem value="GERENCIA">Gerencia</SelectItem>
                    <SelectItem value="CONTABILIDAD">Contabilidad</SelectItem>
                    <SelectItem value="ABOGADO">Abogado</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={creating || !newUser.name || !newUser.email || !newUser.document || !newUser.password}>
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Crear Usuario
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EntidadesSection() {
  const [eps, setEps] = useState<Array<{ id: string; nombre: string; nit: string; portalDigital: boolean; tiempoRespuesta: number; activa: boolean }>>([])
  const [arl, setArl] = useState<Array<{ id: string; nombre: string; nit: string; activa: boolean }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/eps').then(r => r.ok ? r.json() : []),
      fetch('/api/arl').then(r => r.ok ? r.json() : []),
    ])
      .then(([epsData, arlData]) => {
        setEps(epsData.eps || epsData || [])
        setArl(arlData.arl || arlData || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6 text-primary" />
          Entidades EPS/ARL
        </h2>
        <p className="text-muted-foreground mt-1">Gestión de entidades de salud y riesgos laborales</p>
      </div>
      {loading ? (
        <Card><CardContent className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" /></CardContent></Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                EPS Registradas
              </CardTitle>
              <CardDescription>{eps.length} entidades activas</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>NIT</TableHead>
                    <TableHead>Portal</TableHead>
                    <TableHead>Respuesta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eps.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.nombre}</TableCell>
                      <TableCell className="font-mono text-xs">{e.nit}</TableCell>
                      <TableCell>
                        <Badge className={e.portalDigital ? 'bg-green-100 text-green-700 border-0' : 'bg-gray-100 text-gray-700 border-0'}>
                          {e.portalDigital ? 'Digital' : 'Físico'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{e.tiempoRespuesta}d</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-500" />
                ARL Registradas
              </CardTitle>
              <CardDescription>{arl.length} entidades activas</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>NIT</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arl.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.nombre}</TableCell>
                      <TableCell className="font-mono text-xs">{a.nit}</TableCell>
                      <TableCell>
                        <Badge className={a.activa ? 'bg-green-100 text-green-700 border-0' : 'bg-gray-100 text-gray-700 border-0'}>
                          {a.activa ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
