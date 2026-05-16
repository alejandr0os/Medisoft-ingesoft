// Layout principal con navegacion lateral por rol

'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  LayoutDashboard,
  LogOut,
  FileText,
  Bell,
  ClipboardCheck,
  PenTool,
  AlertTriangle,
  DollarSign,
  Clock,
  BarChart3,
  Search,
  Settings,
  Users,
  Building2,
  UserCog,
  Wrench,
  Scale,
  Gavel,
  FileCheck,
  XCircle,
  Menu,
  Activity,
  ChevronDown,
  Receipt,
  RotateCcw,
} from 'lucide-react'
import type { LoginUser } from './login-form'

export interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  badge?: string
  children?: NavItem[]
}

function getNavItems(role: string, unreadCount: number): NavItem[] {
  const notificationBadge = unreadCount > 0 ? String(unreadCount) : undefined

  const items: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'mis-incapacidades',
      label: 'Mis Incapacidades',
      icon: <FileText className="w-4 h-4" />,
      children: [
        { id: 'registrar-incapacidad', label: 'Registrar Incapacidad', icon: <PenTool className="w-4 h-4" /> },
        { id: 'consultar-incapacidades', label: 'Consultar Incapacidades', icon: <Search className="w-4 h-4" /> },
        { id: 'subsanar-incapacidad', label: 'Subsanar Documentos', icon: <FileCheck className="w-4 h-4" /> },
        { id: 'prorrogas-empleado', label: 'Prorrogas', icon: <Clock className="w-4 h-4" /> },
      ],
    },
  ]

  if (role === 'EMPLEADO') {
    // EMPLEADO doesn't have extra items besides the common ones
  }

  if (role === 'AUXILIAR_GH') {
    items.push(
      {
        id: 'incapacidades-pendientes',
        label: 'Incapacidades Pendientes',
        icon: <ClipboardCheck className="w-4 h-4" />,
        children: [
          { id: 'validar-incapacidad', label: 'Validar Incapacidad', icon: <FileCheck className="w-4 h-4" /> },
          { id: 'gestionar-subsanacion', label: 'Gestionar Subsanacion', icon: <Clock className="w-4 h-4" /> },
        ],
      },
      {
        id: 'transcripcion-eps',
        label: 'Transcripcion EPS',
        icon: <PenTool className="w-4 h-4" />,
      },
      {
        id: 'seguimiento-alertas',
        label: 'Seguimiento y Alertas',
        icon: <AlertTriangle className="w-4 h-4" />,
      },
      {
        id: 'gestion-cobros',
        label: 'Gestion de Cobros',
        icon: <DollarSign className="w-4 h-4" />,
      },
      {
        id: 'prorrogas',
        label: 'Prorrogas',
        icon: <Clock className="w-4 h-4" />,
      },
      {
        id: 'casos-largo-plazo',
        label: 'Casos Largo Plazo',
        icon: <BarChart3 className="w-4 h-4" />,
      }
    )
  }

  if (role === 'GERENCIA') {
    items.push(
      {
        id: 'reportes',
        label: 'Dashboard Reportes',
        icon: <BarChart3 className="w-4 h-4" />,
      },
      {
        id: 'consultas',
        label: 'Consultas',
        icon: <Search className="w-4 h-4" />,
        children: [
          { id: 'consulta-incapacidades', label: 'Consulta Incapacidades', icon: <FileText className="w-4 h-4" /> },
          { id: 'consulta-empleados', label: 'Consulta Empleados', icon: <Users className="w-4 h-4" /> },
          { id: 'consulta-entidades', label: 'Consulta Entidades', icon: <Building2 className="w-4 h-4" /> },
        ],
      }
    )
  }

  if (role === 'CONTABILIDAD') {
    items.push(
      {
        id: 'conciliacion-bancaria',
        label: 'Conciliacion Bancaria',
        icon: <Receipt className="w-4 h-4" />,
      },
      {
        id: 'reintegros',
        label: 'Reintegros >180 dias',
        icon: <RotateCcw className="w-4 h-4" />,
      }
    )
  }

  if (role === 'ABOGADO') {
    items.push(
      {
        id: 'rechazos-eps',
        label: 'Rechazos EPS',
        icon: <XCircle className="w-4 h-4" />,
      },
      {
        id: 'cobro-persuasivo',
        label: 'Cobro Persuasivo',
        icon: <Scale className="w-4 h-4" />,
      },
      {
        id: 'cobro-juridico',
        label: 'Cobro Juridico',
        icon: <Gavel className="w-4 h-4" />,
      },
      {
        id: 'derecho-peticion',
        label: 'Derecho de Peticion',
        icon: <FileText className="w-4 h-4" />,
      }
    )
  }

  if (role === 'ADMIN') {
    items.push(
      {
        id: 'parametros',
        label: 'Parametros del Sistema',
        icon: <Settings className="w-4 h-4" />,
      },
      {
        id: 'usuarios-roles',
        label: 'Usuarios y Roles',
        icon: <UserCog className="w-4 h-4" />,
      },
      {
        id: 'entidades',
        label: 'Entidades EPS/ARL',
        icon: <Building2 className="w-4 h-4" />,
      },
      {
        id: 'gestion-empleados',
        label: 'Gestion Empleados',
        icon: <Users className="w-4 h-4" />,
      },
      {
        id: 'configuracion',
        label: 'Configuracion General',
        icon: <Wrench className="w-4 h-4" />,
      }
    )
  }

  items.push({
    id: 'notificaciones',
    label: 'Notificaciones',
    icon: <Bell className="w-4 h-4" />,
    badge: notificationBadge,
  })

  items.push({
    id: 'logout',
    label: 'Cerrar Sesion',
    icon: <LogOut className="w-4 h-4" />,
  })

  return items
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
  EMPLEADO: 'bg-sky-50 text-sky-700 border-sky-200/60',
  AUXILIAR_GH: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  GERENCIA: 'bg-violet-50 text-violet-700 border-violet-200/60',
  CONTABILIDAD: 'bg-amber-50 text-amber-700 border-amber-200/60',
  ABOGADO: 'bg-cyan-50 text-cyan-700 border-cyan-200/60',
  ADMIN: 'bg-rose-50 text-rose-700 border-rose-200/60',
}

interface AppShellProps {
  user: LoginUser
  onLogout: () => void
  activeSection: string
  onSectionChange: (section: string) => void
  unreadNotifications: number
  children: React.ReactNode
}

export default function AppShell({
  user,
  onLogout,
  activeSection,
  onSectionChange,
  unreadNotifications,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['mis-incapacidades', 'incapacidades-pendientes', 'consultas']))

  const navItems = getNavItems(user.role, unreadNotifications)

  const handleNavClick = useCallback(
    (item: NavItem) => {
      if (item.id === 'logout') {
        onLogout()
        return
      }

      if (item.children) {
        setExpandedItems((prev) => {
          const next = new Set(prev)
          if (next.has(item.id)) {
            next.delete(item.id)
          } else {
            next.add(item.id)
          }
          return next
        })
        onSectionChange(item.id)
        setMobileOpen(false)
        return
      }

      onSectionChange(item.id)
      setMobileOpen(false)
    },
    [onLogout, onSectionChange]
  )

  const renderNavItem = (item: NavItem, depth = 0) => {
    const isActive = activeSection === item.id
    const isExpanded = expandedItems.has(item.id)
    const hasChildren = item.children && item.children.length > 0

    return (
      <div key={item.id}>
        <button
          onClick={() => handleNavClick(item)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden
            ${depth > 0 ? 'pl-9' : ''}
            ${isActive
              ? 'bg-gradient-to-r from-sidebar-primary/20 to-sidebar-primary/10 text-sidebar-primary shadow-sm shadow-sidebar-primary/10'
              : item.id === 'logout'
                ? 'text-sidebar-foreground/40 hover:text-red-400 hover:bg-red-500/10 mt-2'
                : 'text-sidebar-foreground/70 hover:bg-white/5 hover:text-sidebar-foreground'
            }`}
        >
          <span className={`shrink-0 transition-colors duration-200 ${isActive ? 'text-sidebar-primary' : ''}`}>{item.icon}</span>
          <span className="flex-1 text-left truncate">{item.label}</span>
          {item.badge && (
            <Badge className="h-5 px-1.5 text-[10px] bg-rose-500 text-white border-0 rounded-full shadow-sm shadow-rose-500/30 shrink-0">
              {item.badge}
            </Badge>
          )}
          {hasChildren && (
            <ChevronDown
              className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          )}
        </button>
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-0.5">
            {item.children!.map((child) => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-6 flex items-center gap-3 flex-shrink-0">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-sidebar-primary/10 flex-shrink-0 overflow-hidden p-1">
          <img src="/logo.png" alt="Medisoft Logo" className="w-full h-full object-contain mix-blend-multiply" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-sidebar-foreground tracking-tight truncate">Medisoft</h2>
          <p className="text-[10px] text-sidebar-foreground/40 uppercase tracking-[0.2em] truncate">Gestion de Incapacidades</p>
        </div>
      </div>

      <Separator className="bg-sidebar-border/30 mx-5 flex-shrink-0" />

      <ScrollArea className="flex-1 px-3 py-4 custom-scrollbar overflow-hidden">
        <div className="space-y-1 pr-4">
          {navItems.map((item) => renderNavItem(item))}
        </div>
      </ScrollArea>

      <Separator className="bg-sidebar-border/30 mx-5 flex-shrink-0" />
      <div className="px-4 py-4 flex-shrink-0">
        <div className="flex items-center gap-3 px-2 min-w-0">
          <Avatar className="h-9 w-9 border-2 border-sidebar-border/50 shadow-sm flex-shrink-0">
            <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-xs font-bold">
              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">{user.name}</p>
            <p className="text-[11px] text-sidebar-foreground/40 truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-[272px] lg:flex lg:flex-col lg:z-40 bg-sidebar border-r border-sidebar-border">
        {sidebarContent}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
          <SheetTitle className="sr-only">Menu de navegacion</SheetTitle>
          {sidebarContent}
        </SheetContent>
      </Sheet>

      <div className="lg:ml-[272px] flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 glass border-b border-border/50 w-full">
          <div className="flex items-center justify-between h-14 px-5 lg:px-8 min-w-0">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="w-5 h-5" />
                <span className="sr-only">Abrir menu</span>
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-foreground tracking-tight">
                  {navItems.find(i => i.id === activeSection)?.label || 'Dashboard'}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${roleColors[user.role] || 'bg-gray-50 text-gray-700 border-gray-200/60'} border text-xs font-semibold px-2.5 py-0.5 rounded-lg`}>
                {roleLabels[user.role] || user.role}
              </Badge>
              <div className="hidden sm:flex items-center gap-2.5">
                <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                  <AvatarFallback className="text-[11px] font-bold bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
                    {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-5 lg:p-8 max-w-[1600px] w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}