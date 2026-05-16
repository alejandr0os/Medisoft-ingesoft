'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bell, CheckCheck, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Notification {
  id: string
  tipo: string
  titulo: string
  mensaje: string
  leida: boolean
  enlace: string | null
  createdAt: string
}

interface NotificationPanelProps {
  onUnreadChange: (count: number) => void
}

const tipoColors: Record<string, string> = {
  ESTADO_CHANGE: 'bg-blue-100 text-blue-700',
  RECORDATORIO: 'bg-amber-100 text-amber-700',
  ALERTA: 'bg-red-100 text-red-700',
  SISTEMA: 'bg-emerald-100 text-emerald-700',
}

const tipoLabels: Record<string, string> = {
  ESTADO_CHANGE: 'Estado',
  RECORDATORIO: 'Recordatorio',
  ALERTA: 'Alerta',
  SISTEMA: 'Sistema',
}

export default function NotificationPanel({ onUnreadChange }: NotificationPanelProps) {
  const { toast } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        onUnreadChange(data.unreadCount)
      }
    } catch (error) {
      console.error('Fetch notifications error:', error)
    } finally {
      setLoading(false)
    }
  }, [onUnreadChange])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markAsRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      })
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, leida: true } : n))
      )
      onUnreadChange(notifications.filter(n => !n.leida && n.id !== id).length)
    } catch (error) {
      console.error('Mark as read error:', error)
      toast({ title: 'Error', description: 'No se pudo marcar la notificacion', variant: 'destructive' })
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, leida: true })))
      onUnreadChange(0)
      toast({ title: 'Notificaciones leidas', description: 'Todas las notificaciones marcadas como leidas' })
    } catch (error) {
      console.error('Mark all as read error:', error)
      toast({ title: 'Error', description: 'No se pudieron marcar las notificaciones', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const unreadCount = notifications.filter(n => !n.leida).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Notificaciones</h3>
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white border-0 rounded-full text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
            <CheckCheck className="w-4 h-4 mr-1" />
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No hay notificaciones</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="max-h-[calc(100vh-250px)]">
          <div className="space-y-2">
            {notifications.map(notification => (
              <Card
                key={notification.id}
                className={`transition-colors ${!notification.leida ? 'border-primary/30 bg-primary/5' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`${tipoColors[notification.tipo] || 'bg-gray-100 text-gray-700'} border-0 text-[9px]`}>
                          {tipoLabels[notification.tipo] || notification.tipo}
                        </Badge>
                        {!notification.leida && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-sm font-medium">{notification.titulo}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{notification.mensaje}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(notification.createdAt).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {!notification.leida && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <CheckCheck className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
