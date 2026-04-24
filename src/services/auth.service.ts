import { eq } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { users, students } from '../db/schema/index.ts'
import { signToken, type JwtPayload, type SystemRole } from '../middleware/auth.ts'
import { RbacService } from './rbac.service.ts'

async function verifyGoogleToken(credential: string): Promise<{ email: string; name: string; picture?: string; sub: string }> {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`)
  if (!res.ok) throw new Error('Token Google tidak valid')
  const info = await res.json() as { email: string; name: string; picture?: string; sub: string; aud: string; error?: string }
  if (info.error) throw new Error('Token Google tidak valid: ' + info.error)
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (clientId && info.aud !== clientId) throw new Error('Token bukan untuk aplikasi ini')
  return { email: info.email, name: info.name, picture: info.picture, sub: info.sub }
}

async function hashPassword(pwd: string): Promise<string> {
  const salt = process.env.JWT_SECRET ?? 'salt'
  const encoded = new TextEncoder().encode(pwd + salt)
  const buffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export type LoginDto = { email: string; password: string }
export type RegisterDto = {
  name: string
  email: string
  password: string
  role: SystemRole
  phone?: string
  schoolId?: string
  nis?: string
  class?: string
  majorId?: string
}

export const AuthService = {
  async login(dto: LoginDto) {
    const [user] = await db.select().from(users).where(eq(users.email, dto.email)).limit(1)
    if (!user || user.passwordHash !== await hashPassword(dto.password)) {
      throw new Error('Email atau password salah')
    }
    if (user.status === 'pending') {
      throw new Error('Akun Anda belum disetujui oleh admin. Silakan tunggu konfirmasi.')
    }
    if (user.status === 'suspended') {
      throw new Error('Akun Anda telah dinonaktifkan. Hubungi admin.')
    }

    let studentId: string | null = null
    if (user.role === 'student') {
      const [s] = await db.select({ id: students.id }).from(students).where(eq(students.userId, user.id)).limit(1)
      studentId = s?.id ?? null
    }

    // Resolve permissions from system role + custom roles
    const { permissions, customRoles } = await RbacService.resolveUserPermissions(user.id, user.role)

    const payload: JwtPayload = {
      id: user.id,
      role: user.role as SystemRole,
      name: user.name,
      schoolId: user.schoolId ?? null,
      studentId,
      permissions,
      customRoles,
    }

    const token = await signToken(payload)
    return {
      token,
      user: { id: user.id, name: user.name, role: user.role, email: user.email, studentId, permissions, customRoles },
    }
  },

  async register(dto: RegisterDto) {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, dto.email)).limit(1)
    if (existing) throw new Error('Email sudah terdaftar')

    const [user] = await db.insert(users).values({
      name: dto.name,
      email: dto.email,
      passwordHash: await hashPassword(dto.password),
      role: dto.role,
      phone: dto.phone,
      schoolId: dto.schoolId,
    }).returning()

    if (dto.role === 'student' && dto.nis && dto.majorId) {
      await db.insert(students).values({
        userId: user.id,
        schoolId: dto.schoolId,
        nis: dto.nis,
        class: dto.class ?? '',
        majorId: dto.majorId,
      })
    }
  },

  async loginWithGoogle(credential: string) {
    const google = await verifyGoogleToken(credential)

    // Check if user already exists with this email
    const [existing] = await db.select().from(users).where(eq(users.email, google.email)).limit(1)

    if (existing) {
      if (existing.status === 'pending') {
        throw new Error('Akun Anda belum disetujui oleh admin. Silakan tunggu konfirmasi.')
      }
      if (existing.status === 'suspended') {
        throw new Error('Akun Anda telah dinonaktifkan. Hubungi admin.')
      }
      // User exists (manual or previous Google login) — just log them in
      let studentId: string | null = null
      if (existing.role === 'student') {
        const [s] = await db.select({ id: students.id }).from(students).where(eq(students.userId, existing.id)).limit(1)
        studentId = s?.id ?? null
      }
      const { permissions, customRoles } = await RbacService.resolveUserPermissions(existing.id, existing.role)
      const payload: JwtPayload = {
        id: existing.id,
        role: existing.role as SystemRole,
        name: existing.name,
        schoolId: existing.schoolId ?? null,
        studentId,
        permissions,
        customRoles,
      }
      const token = await signToken(payload)
      return {
        token,
        user: { id: existing.id, name: existing.name, role: existing.role, email: existing.email, studentId, permissions, customRoles },
        needsOnboarding: false,
      }
    }

    // New user — return onboarding data, do NOT create user yet
    return {
      token: null,
      user: null,
      needsOnboarding: true,
      googleData: {
        email: google.email,
        name: google.name,
        picture: google.picture,
      },
    }
  },

  async onboardGoogle(dto: {
    email: string
    name: string
    role: SystemRole
    phone?: string
    schoolId?: string
    nis?: string
    class?: string
    majorId?: string
  }) {
    // Double-check not already registered
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, dto.email)).limit(1)
    if (existing) throw new Error('Email sudah terdaftar, silakan login biasa')

    const [user] = await db.insert(users).values({
      name: dto.name,
      email: dto.email,
      passwordHash: '', // Google users have no password
      role: dto.role,
      status: 'pending', // requires admin approval
      phone: dto.phone,
      schoolId: dto.schoolId,
    }).returning()

    let studentId: string | null = null
    if (dto.role === 'student' && dto.nis && dto.majorId) {
      const [s] = await db.insert(students).values({
        userId: user.id,
        schoolId: dto.schoolId,
        nis: dto.nis,
        class: dto.class ?? '',
        majorId: dto.majorId,
      }).returning()
      studentId = s.id
    }

    // Account created but pending approval — do NOT issue token yet
    return {
      token: null,
      user: null,
      needsOnboarding: false,
      needsApproval: true,
    }
  },
}
