// Autenticacion y gestion de sesiones

import { hash, compare } from 'bcryptjs'
import { cookies } from 'next/headers'

const SALT_ROUNDS = 12
const SESSION_COOKIE_NAME = 'medisoft_session'
const SESSION_SECRET = process.env.SESSION_SECRET || 'medisoft-secret-key-2024'

export async function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword)
}

export interface SessionData {
  userId: string
  email: string
  role: string
  name: string
}

function encodeSession(data: SessionData): string {
  const payload = JSON.stringify({
    ...data,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  })
  // Simple base64 encoding with a signature
  const encoded = Buffer.from(payload).toString('base64')
  const signature = Buffer.from(encoded + SESSION_SECRET).toString('base64').slice(0, 16)
  return `${encoded}.${signature}`
}

function decodeSession(token: string): SessionData | null {
  try {
    const [encoded, signature] = token.split('.')
    if (!encoded || !signature) return null

    // Verify signature
    const expectedSignature = Buffer.from(encoded + SESSION_SECRET).toString('base64').slice(0, 16)
    if (signature !== expectedSignature) return null

    const payload = JSON.parse(Buffer.from(encoded, 'base64').toString())

    // Check expiration
    if (payload.exp && payload.exp < Date.now()) return null

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    }
  } catch {
    return null
  }
}

export async function createSession(data: SessionData): Promise<string> {
  return encodeSession(data)
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null
  return decodeSession(token)
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME
}
