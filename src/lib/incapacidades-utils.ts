// Utilidades compartidas para gestion de incapacidades

// Suma N dias habiles a una fecha omitiendo fines de semana
export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setDate(result.getDate() + 1)
    const dayOfWeek = result.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++
    }
  }
  return result
}

export function businessDaysBetween(start: Date, end: Date): number {
  let count = 0
  const current = new Date(start)
  current.setDate(current.getDate() + 1)
  while (current <= end) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  return count
}

export function isMoreThanBusinessDaysAfter(from: Date, to: Date, days: number): boolean {
  return businessDaysBetween(from, to) > days
}

export function generateRadicado(): string {
  const now = new Date()
  const dateStr = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `INC-${dateStr}-${random}`
}

export function generateLoteNumero(): string {
  const now = new Date()
  const dateStr = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `COB-${dateStr}-${random}`
}

export interface CalculoDesglose {
  diasEmpleador: number
  diasEPS: number
  diasFondoPension: number
  porcentajeEmpleador: number
  porcentajeEPS: number
  valorEmpleador: number
  valorEPS: number
  valorFondoPension: number
  valorTotal: number
  ibcDiario: number
}

export function calcularDesglose(
  salary: number,
  diasIncapacidad: number,
  tipoNovedad: string
): CalculoDesglose {
  const ibcDiario = salary / 30
  const diasEmpleador = Math.min(2, diasIncapacidad)

  if (tipoNovedad === 'ACCIDENTE_TRABAJO') {
    const valorTotal = Math.round(ibcDiario * diasIncapacidad * 1.0 * 100) / 100
    return {
      diasEmpleador: 0,
      diasEPS: diasIncapacidad,
      diasFondoPension: 0,
      porcentajeEmpleador: 0,
      porcentajeEPS: 1.0,
      valorEmpleador: 0,
      valorEPS: valorTotal,
      valorFondoPension: 0,
      valorTotal,
      ibcDiario,
    }
  }

  if (tipoNovedad === 'LICENCIA_MATERNIDAD' || tipoNovedad === 'LICENCIA_PATERNIDAD') {
    const valorTotal = Math.round(ibcDiario * diasIncapacidad * 1.0 * 100) / 100
    const valorEmpleador = Math.round(ibcDiario * diasEmpleador * 1.0 * 100) / 100
    return {
      diasEmpleador,
      diasEPS: diasIncapacidad - diasEmpleador,
      diasFondoPension: 0,
      porcentajeEmpleador: 1.0,
      porcentajeEPS: 1.0,
      valorEmpleador,
      valorEPS: Math.round((valorTotal - valorEmpleador) * 100) / 100,
      valorFondoPension: 0,
      valorTotal,
      ibcDiario,
    }
  }

  const diasRestantes = diasIncapacidad - diasEmpleador
  const diasEPSBase = Math.min(diasRestantes, 90 - diasEmpleador)
  const diasEPS91a180 = diasRestantes > diasEPSBase ? Math.min(diasRestantes - diasEPSBase, 90) : 0
  const diasFondoPension = Math.max(0, diasIncapacidad - 180)

  const valorEmpleador = Math.round(ibcDiario * diasEmpleador * 1.0 * 100) / 100
  const valorEPS = Math.round(ibcDiario * (diasEPSBase * 0.6667 + diasEPS91a180 * 0.5) * 100) / 100
  const valorFondoPension = Math.round(ibcDiario * diasFondoPension * 0.5 * 100) / 100

  return {
    diasEmpleador,
    diasEPS: diasEPSBase + diasEPS91a180,
    diasFondoPension,
    porcentajeEmpleador: 1.0,
    porcentajeEPS: 0.6667,
    valorEmpleador,
    valorEPS,
    valorFondoPension,
    valorTotal: valorEmpleador + valorEPS + valorFondoPension,
    ibcDiario,
  }
}

export function calcularValorEsperado(
  salary: number,
  diasIncapacidad: number,
  tipoNovedad: string
): number {
  const desglose = calcularDesglose(salary, diasIncapacidad, tipoNovedad)
  return desglose.valorTotal
}

export function getPorcentajeEPS(tipoNovedad: string): number {
  switch (tipoNovedad) {
    case 'ACCIDENTE_TRABAJO':
      return 1.0
    case 'LICENCIA_MATERNIDAD':
    case 'LICENCIA_PATERNIDAD':
      return 1.0
    default:
      return 0.6667
  }
}

export function canViewAll(role: string): boolean {
  return ['AUXILIAR_GH', 'GERENCIA', 'CONTABILIDAD', 'ABOGADO', 'ADMIN'].includes(role)
}

export function canManage(role: string): boolean {
  return ['AUXILIAR_GH', 'ADMIN'].includes(role)
}

export function canValidate(role: string): boolean {
  return ['AUXILIAR_GH', 'ADMIN'].includes(role)
}

export function canTranscribe(role: string): boolean {
  return ['AUXILIAR_GH', 'ADMIN'].includes(role)
}

export function canManageCobros(role: string): boolean {
  return ['CONTABILIDAD', 'GERENCIA', 'ADMIN'].includes(role)
}

export function canManageJuridico(role: string): boolean {
  return ['ABOGADO', 'ADMIN'].includes(role)
}

export function daysSince(date: Date): number {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  return Math.floor(diff / (1000 * 60 *60 * 24))
}

export function getSemaphore(daysSinceRadicacion: number): 'VERDE' | 'AMARILLO' | 'ROJO' {
  if (daysSinceRadicacion < 15) return 'VERDE'
  if (daysSinceRadicacion <= 30) return 'AMARILLO'
  return 'ROJO'
}
