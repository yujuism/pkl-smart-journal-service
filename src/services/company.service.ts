import { eq, and, ilike, sql } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { companies, pklPlacements, students, users, majors } from '../db/schema/index.ts'
import type { JwtPayload } from '../middleware/auth.ts'
import type { PaginationQuery, PaginatedResult } from '../utils/pagination.ts'

export const CompanyService = {
  async list(pg?: PaginationQuery, search = '') {
    const searchFilter = search ? ilike(companies.name, `%${search}%`) : undefined

    if (!pg) {
      return db.select().from(companies).where(searchFilter).orderBy(companies.name)
    }

    const [countRow] = await db.select({ count: sql<number>`count(*)::int` })
      .from(companies).where(searchFilter)
    const total = countRow?.count ?? 0
    const offset = (pg.page - 1) * pg.perPage
    const data = await db.select().from(companies).where(searchFilter).orderBy(companies.name).limit(pg.perPage).offset(offset)
    return { data, total, page: pg.page, perPage: pg.perPage, totalPages: Math.ceil(total / pg.perPage) || 1 } as PaginatedResult<typeof data[number]>
  },
  async create(dto: { name: string; address?: string; phone?: string; contactPerson?: string }) {
    const [row] = await db.insert(companies).values(dto).returning()
    return row
  },
  async update(id: string, dto: { name: string; address?: string; phone?: string; contactPerson?: string }) {
    const [row] = await db.update(companies).set(dto).where(eq(companies.id, id)).returning()
    return row
  },
  async remove(id: string) {
    await db.delete(companies).where(eq(companies.id, id))
  },

  async listWithStudents(caller: JwtPayload) {
    const placementConditions = [eq(pklPlacements.status, 'active')]
    if (caller.role === 'teacher') placementConditions.push(eq(pklPlacements.teacherId, caller.id))
    else if (caller.role === 'industry') placementConditions.push(eq(pklPlacements.industrySupervisorId, caller.id))

    const rows = await db.select({
      companyId: companies.id,
      companyName: companies.name,
      companyAddress: companies.address,
      companyPhone: companies.phone,
      companyContact: companies.contactPerson,
      studentId: students.id,
      studentName: users.name,
      nis: students.nis,
      class: students.class,
      major: majors.name,
    })
      .from(pklPlacements)
      .innerJoin(companies, eq(pklPlacements.companyId, companies.id))
      .innerJoin(students, eq(pklPlacements.studentId, students.id))
      .innerJoin(users, eq(students.userId, users.id))
      .innerJoin(majors, eq(students.majorId, majors.id))
      .where(and(...placementConditions))

    // Group by company
    const map = new Map<string, { id: string; name: string; address: string | null; phone: string | null; contactPerson: string | null; students: any[] }>()
    for (const r of rows) {
      if (!map.has(r.companyId)) {
        map.set(r.companyId, { id: r.companyId, name: r.companyName, address: r.companyAddress, phone: r.companyPhone, contactPerson: r.companyContact, students: [] })
      }
      map.get(r.companyId)!.students.push({ id: r.studentId, name: r.studentName, nis: r.nis, class: r.class, major: r.major })
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  },
}
