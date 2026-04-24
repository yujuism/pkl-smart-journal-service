import { eq } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { users, students } from '../db/schema/index.ts'

export type CreateUserDto = {
  name: string
  email: string
  password: string
  role: 'student' | 'teacher' | 'industry' | 'parent' | 'admin'
  phone?: string
  schoolId?: string
  nis?: string
  class?: string
  majorId?: string
}

async function hashPassword(pwd: string): Promise<string> {
  const salt = process.env.JWT_SECRET ?? 'salt'
  const encoded = new TextEncoder().encode(pwd + salt)
  const buffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

const USER_COLS = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  status: users.status,
  phone: users.phone,
  schoolId: users.schoolId,
  createdAt: users.createdAt,
}

export const UserService = {
  async listAll(role?: string) {
    const rows = await db.select(USER_COLS).from(users).orderBy(users.createdAt)
    return role ? rows.filter(r => r.role === role) : rows
  },

  async listPending() {
    return db.select(USER_COLS).from(users).where(eq(users.status, 'pending')).orderBy(users.createdAt)
  },

  async getById(id: string) {
    const [row] = await db.select(USER_COLS).from(users).where(eq(users.id, id)).limit(1)
    return row ?? null
  },

  async approve(id: string) {
    const [row] = await db.update(users).set({ status: 'active' }).where(eq(users.id, id)).returning(USER_COLS)
    if (!row) throw new Error('User tidak ditemukan')
    return row
  },

  async reject(id: string) {
    await db.delete(users).where(eq(users.id, id))
  },

  async suspend(id: string) {
    const [row] = await db.update(users).set({ status: 'suspended' }).where(eq(users.id, id)).returning(USER_COLS)
    if (!row) throw new Error('User tidak ditemukan')
    return row
  },

  async create(dto: CreateUserDto) {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, dto.email)).limit(1)
    if (existing) throw new Error('Email sudah terdaftar')

    const [user] = await db.insert(users).values({
      name: dto.name,
      email: dto.email,
      passwordHash: await hashPassword(dto.password),
      role: dto.role,
      status: 'active',
      phone: dto.phone,
      schoolId: dto.schoolId,
    }).returning(USER_COLS)

    if (dto.role === 'student' && dto.nis && dto.majorId) {
      await db.insert(students).values({
        userId: user.id,
        schoolId: dto.schoolId,
        nis: dto.nis,
        class: dto.class ?? '',
        majorId: dto.majorId,
      })
    }

    return user
  },

  async updateRole(id: string, role: 'student' | 'teacher' | 'industry' | 'parent' | 'admin') {
    const [row] = await db.update(users).set({ role }).where(eq(users.id, id)).returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
    })
    if (!row) throw new Error('User tidak ditemukan')
    return row
  },

  async delete(id: string) {
    await db.delete(users).where(eq(users.id, id))
  },
}
