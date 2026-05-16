// Formulario de inicio de sesion

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Activity, Loader2, AlertCircle, Mail, Lock, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface LoginFormProps {
  onLogin: (user: LoginUser) => void
}

export interface LoginUser {
  id: string
  email: string
  name: string
  role: string
  document: string
  employee: {
    id: string
    area: string
    cargo: string
    salary: number
  } | null
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesion')
        return
      }

      onLogin(data.user)
    } catch {
      setError('Error de conexion. Intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }



  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[oklch(0.22_0.04_240)] via-[oklch(0.18_0.05_230)] to-[oklch(0.14_0.06_220)]">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-[oklch(0.40_0.12_195/0.15)] rounded-full -translate-x-1/2 -translate-y-1/2 animate-[float1_12s_ease-in-out_infinite]" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-[oklch(0.35_0.10_220/0.1)] rounded-full translate-x-1/3 translate-y-1/3 animate-[float2_15s_ease-in-out_infinite]" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-[oklch(0.45_0.14_195/0.08)] rounded-full animate-[float3_18s_ease-in-out_infinite]" />
          <div className="absolute bottom-1/4 left-1/4 w-40 h-40 bg-[oklch(0.50_0.12_200/0.06)] rounded-full animate-[float3_20s_ease-in-out_infinite_reverse]" />
          <div className="absolute top-1/4 right-1/4 w-48 h-48 bg-[oklch(0.38_0.08_240/0.08)] rounded-full animate-[float1_16s_ease-in-out_infinite]" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="animate-fade-in">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20 overflow-hidden">
                <img src="/logo.png" alt="Medisoft Logo" className="w-12 h-12 object-contain mix-blend-multiply brightness-110 contrast-125" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Medisoft</h1>
                <p className="text-white/50 text-sm font-light tracking-wide">Gestion de Incapacidades</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="animate-slide-up stagger-1">
                <h2 className="text-xl font-semibold text-white/90 mb-2">
                  Gestion integral de incapacidades
                </h2>
                <p className="text-white/50 text-sm leading-relaxed max-w-md">
                  Administra novedades de salud, seguimiento de casos, cobros a EPS/ARL y control de derechos de peticion desde una sola plataforma.
                </p>
              </div>
              <div className="animate-slide-up stagger-2 grid grid-cols-2 gap-4 mt-8">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-2xl font-bold text-white">98%</p>
                  <p className="text-xs text-white/50 mt-1">Trazabilidad</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-2xl font-bold text-white">24h</p>
                  <p className="text-xs text-white/50 mt-1">Respuesta</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Abstract background elements for the right side */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-slate-50/50">
          <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-slate-200/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-50/40 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.02] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-xl shadow-slate-200 mb-4 overflow-hidden p-2">
              <img src="/logo.png" alt="Medisoft Logo" className="w-full h-full object-contain mix-blend-multiply" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-600">Medisoft</h1>
            <p className="text-slate-500 text-sm mt-2 font-medium">Gestion de Incapacidades</p>
          </div>

          <Card className="border border-slate-200/50 shadow-[0_40px_80px_-15px_rgba(15,23,42,0.08)] bg-white/90 backdrop-blur-3xl overflow-hidden rounded-[2rem]">
            <div className="h-1.5 w-full bg-gradient-to-r from-slate-200 via-slate-400 to-slate-200" />
            <CardHeader className="pb-4 pt-10 px-10">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Bienvenido</h2>
                <p className="text-sm text-slate-500 mt-2 font-medium">Ingresa a la plataforma administrativa</p>
              </motion.div>
            </CardHeader>
            <CardContent className="px-10 pb-12">
              <form onSubmit={handleSubmit} className="space-y-6">
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[13px] font-semibold text-slate-700 ml-1">Correo Electrónico</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="usuario@medisoft.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="h-13 pl-12 rounded-2xl bg-slate-50/50 border-slate-200 shadow-sm focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 focus:bg-white transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[13px] font-semibold text-slate-700 ml-1">Contraseña</Label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="h-13 pl-12 rounded-2xl bg-slate-50/50 border-slate-200 shadow-sm focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 focus:bg-white transition-all duration-300"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-14 text-sm font-bold rounded-2xl bg-slate-900 hover:bg-slate-800 text-white shadow-2xl shadow-slate-900/20 transition-all duration-500 group overflow-hidden relative mt-4"
                  disabled={loading}
                >
                  <span className="relative z-10 flex items-center justify-center gap-3 tracking-wide">
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        ACCEDER AL PORTAL
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-900 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-12 text-center">
            <p className="text-xs text-slate-400 font-medium tracking-wide">
              © 2026 Medisoft • Cloud Healthcare Solutions
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}