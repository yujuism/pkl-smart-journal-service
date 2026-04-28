import { eq, ilike, or, sql } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { users, students } from '../db/schema/index.ts'
import type { PaginationQuery, PaginatedResult } from '../utils/pagination.ts'

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
  async listAll(role?: string, pg?: PaginationQuery, search = ''): Promise<PaginatedResult<typeof USER_COLS extends Record<string, any> ? any : any> | any[]> {
    if (!pg) {
      // backward compat — no pagination, return plain array
      const rows = await db.select(USER_COLS).from(users).orderBy(users.createdAt)
      return role ? rows.filter(r => r.role === role) : rows
    }

    const conditions: any[] = []
    if (role) conditions.push(eq(users.role, role as any))
    if (search) conditions.push(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`)))

    const where = conditions.length > 0
      ? conditions.reduce((a, b) => ({ ...a, ...b })) // drizzle and()
      : undefined

    // Use drizzle and() properly
    const { and: drizzleAnd } = await import('drizzle-orm')
    const whereClause = conditions.length > 1 ? drizzleAnd(...conditions) : conditions[0]

    const [countRow] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(whereClause)
    const total = countRow?.count ?? 0
    const offset = (pg.page - 1) * pg.perPage

    const data = await db.select(USER_COLS).from(users)
      .where(whereClause)
      .orderBy(users.createdAt)
      .limit(pg.perPage)
      .offset(offset)

    return { data, total, page: pg.page, perPage: pg.perPage, totalPages: Math.ceil(total / pg.perPage) || 1 }
  },

  async listPending(pg?: PaginationQuery, search = '') {
    if (!pg) {
      return db.select(USER_COLS).from(users).where(eq(users.status, 'pending')).orderBy(users.createdAt)
    }
    const { and: drizzleAnd, ilike: drizzleIlike, or: drizzleOr } = await import('drizzle-orm')
    const searchFilter = search ? drizzleOr(drizzleIlike(users.name, `%${search}%`), drizzleIlike(users.email, `%${search}%`)) : undefined
    const whereClause = searchFilter ? drizzleAnd(eq(users.status, 'pending'), searchFilter) : eq(users.status, 'pending')

    const [countRow] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(whereClause)
    const total = countRow?.count ?? 0
    const offset = (pg.page - 1) * pg.perPage
    const data = await db.select(USER_COLS).from(users).where(whereClause).orderBy(users.createdAt).limit(pg.perPage).offset(offset)
    return { data, total, page: pg.page, perPage: pg.perPage, totalPages: Math.ceil(total / pg.perPage) || 1 }
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

  async update(id: string, dto: { name?: string; email?: string; phone?: string; password?: string }) {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1)
    if (!existing) throw new Error('User tidak ditemukan')
    const updates: Record<string, unknown> = {}
    if (dto.name) updates.name = dto.name
    if (dto.email) updates.email = dto.email
    if (dto.phone !== undefined) updates.phone = dto.phone || null
    if (dto.password) updates.password = await hashPassword(dto.password)
    const [row] = await db.update(users).set(updates).where(eq(users.id, id)).returning({
      id: users.id, name: users.name, email: users.email,
      role: users.role, status: users.status, phone: users.phone,
      schoolId: users.schoolId, createdAt: users.createdAt,
    })
    return row
  },

  async delete(id: string) {
    await db.delete(users).where(eq(users.id, id))
  },
}
