'use client'

import { useState, useEffect, useCallback } from 'react'
import type { LoginUser } from '@/components/login-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import {
  Users,
  Loader2,
  Plus,
  Search,
  Pencil,
  UserX,
  UserCheck,
  Mail,
} from 'lucide-react'

interface Employee {
  id: string
  name: string
  email: string
  document: string
  phone: string | null
  area: string
  cargo: string
  salary: number
  active: boolean
  user: { id: string; role: string; active: boolean } | null
  eps: { id: string; nombre: string } | null
  arl: { id: string; nombre: string } | null
}

interface EPSItem {
  id: string
  nombre: string
}

interface ARLItem {
  id: string
  nombre: string
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
}

interface Props {
  user: LoginUser
}

export default function AdminEmpleados({ user }: Props) {
  const { toast } = useToast()
  const [empleados, setEmpleados] = useState<Employee[]>([])
  const [epsList, setEpsList] = useState<EPSItem[]>([])
  const [arlList, setArlList] = useState<ARLItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroArea, setFiltroArea] = useState('TODAS')
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selected, setSelected] = useState<Employee | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Create form
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formDocument, setFormDocument] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formArea, setFormArea] = useState('')
  const [formCargo, setFormCargo] = useState('')
  const [formSalary, setFormSalary] = useState('')
  const [formEPS, setFormEPS] = useState('')
  const [formARL, setFormARL] = useState('')

  // Edit form
  const [editEPS, setEditEPS] = useState('')
  const [editSalary, setEditSalary] = useState('')
  const [editCargo, setEditCargo] = useState('')
  const [editArea, setEditArea] = useState('')
  const [editActive, setEditActive] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [empRes, epsRes, arlRes] = await Promise.all([
        fetch('/api/empleados'),
        fetch('/api/eps'),
        fetch('/api/arl'),
      ])

      if (empRes.ok) {
        const data = await empRes.json()
        setEmpleados(data.empleados || [])
      }
      if (epsRes.ok) {
        const data = await epsRes.json()
        setEpsList(data.eps || [])
      }
      if (arlRes.ok) {
        const data = await arlRes.json()
        setArlList(data.arl || [])
      }
    } catch {
      toast({ title: 'Error de carga', description: 'No se pudieron cargar los datos. Intente de nuevo.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const areas = [...new Set(empleados.map(e => e.area).filter(Boolean))]

  const filteredEmpleados = empleados.filter(emp => {
    const matchesSearch = !searchTerm ||
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.document.includes(searchTerm) ||
      emp.area.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesArea = filtroArea === 'TODAS' || emp.area === filtroArea
    return matchesSearch && matchesArea
  })

  const handleCreate = () => {
    setFormName('')
    setFormEmail('')
    setFormDocument('')
    setFormPhone('')
    setFormArea('')
    setFormCargo('')
    setFormSalary('')
    setFormEPS(epsList[0]?.id || '')
    setFormARL(arlList[0]?.id || '')
    setCreateOpen(true)
  }

  const handleEdit = (emp: Employee) => {
    setSelected(emp)
    setEditEPS(emp.eps?.id || '')
    setEditSalary(emp.salary.toString())
    setEditCargo(emp.cargo)
    setEditArea(emp.area)
    setEditActive(emp.active)
    setEditOpen(true)
  }

  const submitCreate = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/empleados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          document: formDocument,
          phone: formPhone,
          area: formArea,
          cargo: formCargo,
          salary: parseFloat(formSalary) || 0,
          epsId: formEPS,
          arlId: formARL,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        toast({ title: '✅ Empleado creado exitosamente', description: `${formName} ha sido registrado. Las credenciales de acceso serán enviadas a ${formEmail}` })
        setCreateOpen(false)
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al crear empleado', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const submitEdit = async () => {
    if (!selected) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/empleados/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epsId: editEPS,
          salary: parseFloat(editSalary) || 0,
          cargo: editCargo,
          area: editArea,
          active: editActive,
        }),
      })
      if (res.ok) {
        toast({ title: '✅ Cambios guardados', description: `Los datos de ${selected.name} han sido actualizados correctamente.` })
        setEditOpen(false)
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al actualizar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeactivate = async (emp: Employee) => {
    try {
      const res = await fetch(`/api/empleados/${emp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      })
      if (res.ok) {
        toast({ title: '⚠️ Empleado desactivado', description: `${emp.name} ha sido desactivado y no podrá iniciar sesión.` })
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al desactivar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    }
  }

  const handleActivate = async (emp: Employee) => {
    try {
      const res = await fetch(`/api/empleados/${emp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: true }),
      })
      if (res.ok) {
        toast({ title: '✅ Empleado reactivado', description: `${emp.name} ahora puede acceder al sistema nuevamente.` })
        fetchData()
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al activar', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    }
  }

  const handleResendCredentials = async (emp: Employee) => {
    try {
      const res = await fetch(`/api/empleados/${emp.id}/resend-credentials`, {
        method: 'POST',
      })
      if (res.ok) {
        toast({ title: '📧 Credenciales reenviadas', description: `Se han reenviado las credenciales de acceso a ${emp.email}.` })
      } else {
        const data = await res.json()
        toast({ title: 'Error', description: data.error || 'Error al reenviar credenciales', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Error de conexión', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Gestión de Empleados
          </h2>
          <p className="text-muted-foreground mt-1">Administración de empleados, áreas y cargos</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" /> Crear Empleado
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, documento o área..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={filtroArea} onValueChange={setFiltroArea}>
              <SelectTrigger className="w-48 h-9 text-xs">
                <SelectValue placeholder="Todas las áreas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas las áreas</SelectItem>
                {areas.map(area => (
                  <SelectItem key={area} value={area}>{area}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Empleados</CardTitle>
            <CardDescription>
              {filteredEmpleados.length} de {empleados.length} empleados
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>EPS</TableHead>
                    <TableHead className="text-right">Salario</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmpleados.map(emp => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono text-sm">{emp.document}</TableCell>
                      <TableCell className="font-medium text-sm">{emp.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{emp.email}</TableCell>
                      <TableCell className="text-sm">{emp.area}</TableCell>
                      <TableCell className="text-sm">{emp.cargo}</TableCell>
                      <TableCell className="text-sm">{emp.eps?.nombre || '-'}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(emp.salary)}</TableCell>
                      <TableCell>
                        <Badge className={emp.active ? 'bg-green-100 text-green-700 border-0' : 'bg-gray-100 text-gray-700 border-0'}>
                          {emp.active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(emp)} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {emp.active ? (
                            <Button size="sm" variant="ghost" onClick={() => handleDeactivate(emp)} title="Desactivar" className="text-red-500 hover:text-red-600">
                              <UserX className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => handleActivate(emp)} title="Activar" className="text-green-500 hover:text-green-600">
                              <UserCheck className="w-4 h-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleResendCredentials(emp)} title="Reenviar credenciales">
                            <Mail className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Empleado</DialogTitle>
            <DialogDescription>Registrar un nuevo empleado en el sistema</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre Completo *</Label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Juan Pérez" />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="juan@empresa.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Documento *</Label>
                <Input value={formDocument} onChange={e => setFormDocument(e.target.value)} placeholder="12345678" />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="3001234567" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Área *</Label>
                <Input value={formArea} onChange={e => setFormArea(e.target.value)} placeholder="Administración" />
              </div>
              <div className="space-y-2">
                <Label>Cargo *</Label>
                <Input value={formCargo} onChange={e => setFormCargo(e.target.value)} placeholder="Analista" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Salario *</Label>
                <Input type="number" value={formSalary} onChange={e => setFormSalary(e.target.value)} placeholder="2500000" />
              </div>
              <div className="space-y-2">
                <Label>EPS *</Label>
                <Select value={formEPS} onValueChange={setFormEPS}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione EPS" />
                  </SelectTrigger>
                  <SelectContent>
                    {epsList.map(eps => (
                      <SelectItem key={eps.id} value={eps.id}>{eps.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ARL *</Label>
                <Select value={formARL} onValueChange={setFormARL}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione ARL" />
                  </SelectTrigger>
                  <SelectContent>
                    {arlList.map(arl => (
                      <SelectItem key={arl.id} value={arl.id}>{arl.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground">
              <Mail className="w-4 h-4 inline mr-1" />
              Se crearán credenciales de acceso y se enviarán al correo del empleado.
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={submitCreate} disabled={submitting || !formName || !formEmail || !formDocument || !formArea || !formCargo || !formSalary}>
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Crear Empleado
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Empleado</DialogTitle>
            <DialogDescription>{selected?.name} - {selected?.document}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted text-sm">
                <p><span className="font-medium">Nombre:</span> {selected.name}</p>
                <p><span className="font-medium">Email:</span> {selected.email}</p>
                <p><span className="font-medium">Documento:</span> {selected.document}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>EPS</Label>
                  <Select value={editEPS} onValueChange={setEditEPS}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {epsList.map(eps => (
                        <SelectItem key={eps.id} value={eps.id}>{eps.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Salario</Label>
                  <Input type="number" value={editSalary} onChange={e => setEditSalary(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input value={editCargo} onChange={e => setEditCargo(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Área</Label>
                  <Input value={editArea} onChange={e => setEditArea(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={editActive} onCheckedChange={setEditActive} />
                <Label>{editActive ? 'Activo' : 'Inactivo'}</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
                <Button onClick={submitEdit} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Pencil className="w-4 h-4 mr-2" />}
                  Guardar Cambios
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
