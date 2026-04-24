import { SignJWT, jwtVerify } from 'jose'
import { eq } from 'drizzle-orm'
import type { Context, Next } from 'hono'
import type { AppEnv } from '../types.ts'
import { db } from '../db/index.ts'
import { users } from '../db/schema/index.ts'

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-key-min-32-chars-long!')

export type SystemRole = 'student' | 'teacher' | 'industry' | 'parent' | 'admin'

export type JwtPayload = {
  id: string
  role: SystemRole              // legacy system role kept for quick checks
  name: string
  schoolId: string | null
  studentId: string | null
  permissions: string[]         // e.g. ['journals:read', 'feedback:write', ...]
  customRoles: string[]         // slugs of assigned custom roles
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(secret)
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload as unknown as JwtPayload
}

async function checkUserStatus(id: string): Promise<'active' | 'pending' | 'suspended' | null> {
  const [row] = await db.select({ status: users.status }).from(users).where(eq(users.id, id)).limit(1)
  return (row?.status ?? null) as 'active' | 'pending' | 'suspended' | null
}

// requireAuth: checks system role AND/OR custom permissions
export function requireAuth(...allowedRoles: SystemRole[]) {
  return async (c: Context<AppEnv>, next: Next) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    try {
      const token = authHeader.slice(7)
      const payload = await verifyToken(token)
      const status = await checkUserStatus(payload.id)
      if (status !== 'active') {
        return c.json({ error: 'Akun Anda belum disetujui atau telah dinonaktifkan.' }, 401)
      }
      if (allowedRoles.length && !allowedRoles.includes(payload.role)) {
        return c.json({ error: 'Forbidden' }, 403)
      }
      c.set('user', payload)
      await next()
    } catch {
      return c.json({ error: 'Invalid token' }, 401)
    }
  }
}

// requirePermission: checks custom permission key in JWT payload
export function requirePermission(permission: string) {
  return async (c: Context<AppEnv>, next: Next) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    try {
      const token = authHeader.slice(7)
      const payload = await verifyToken(token)
      const status = await checkUserStatus(payload.id)
      if (status !== 'active') {
        return c.json({ error: 'Akun Anda belum disetujui atau telah dinonaktifkan.' }, 401)
      }
      if (payload.role !== 'admin' && !payload.permissions?.includes(permission)) {
        return c.json({ error: 'Forbidden — permission required: ' + permission }, 403)
      }
      c.set('user', payload)
      await next()
    } catch {
      return c.json({ error: 'Invalid token' }, 401)
    }
  }
}

// ABAC helper — used inside route handlers, not as middleware
export function hasPermission(user: JwtPayload, permission: string): boolean {
  if (user.role === 'admin') return true
  return user.permissions?.includes(permission) ?? false
}
