import { eq, ilike, or, sql } from 'drizzle-orm'
import { db } from '../db/index.ts'
import {
  pklPlacements,
  students,
  users,
  companies,
} from '../db/schema/index.ts'
import type { PaginationQuery, PaginatedResult } from '../utils/pagination.ts'

export type CreatePlacementDto = {
  studentId: string
  teacherId?: string
  industrySupervisorId?: string
  parentId?: string
  companyId: string
  startDate?: string
  endDate?: string
}

export type PlacementWithDetails = {
  id: string
  companyName: string
  companyAddress: string | null
  startDate: string | null
  endDate: string | null
  status: string
  studentId: string
  studentName: string
  nis: string
  teacherId: string | null
  teacherName: string | null
  industrySupervisorId: string | null
  industrySupervisorName: string | null
  parentId: string | null
  parentName: string | null
}

export const PlacementService = {
  async listAll(pg?: PaginationQuery, search = ''): Promise<PlacementWithDetails[] | PaginatedResult<PlacementWithDetails>> {
    const searchFilter = search
      ? or(ilike(users.name, `%${search}%`), ilike(companies.name, `%${search}%`), ilike(students.nis, `%${search}%`))
      : undefined

    const buildRows = async (limit?: number, offset?: number) => {
      const q = db.select({
        id: pklPlacements.id,
        companyName: companies.name,
        companyAddress: companies.address,
        startDate: pklPlacements.startDate,
        endDate: pklPlacements.endDate,
        status: pklPlacements.status,
        studentId: pklPlacements.studentId,
        nis: students.nis,
        studentUserId: students.userId,
        teacherId: pklPlacements.teacherId,
        industrySupervisorId: pklPlacements.industrySupervisorId,
        parentId: pklPlacements.parentId,
      }).from(pklPlacements)
        .innerJoin(students, eq(pklPlacements.studentId, students.id))
        .innerJoin(companies, eq(pklPlacements.companyId, companies.id))
        .innerJoin(users, eq(students.userId, users.id))
        .where(searchFilter)
        .orderBy(pklPlacements.id)
      if (limit !== undefined) q.limit(limit)
      if (offset !== undefined) q.offset(offset)
      return q
    }

    const mapRow = (r: any, nameMap: Map<string, string>): PlacementWithDetails => ({
      id: r.id, companyName: r.companyName, companyAddress: r.companyAddress,
      startDate: r.startDate, endDate: r.endDate, status: r.status,
      studentId: r.studentId, studentName: nameMap.get(r.studentUserId) ?? '-', nis: r.nis,
      teacherId: r.teacherId, teacherName: r.teacherId ? (nameMap.get(r.teacherId) ?? null) : null,
      industrySupervisorId: r.industrySupervisorId,
      industrySupervisorName: r.industrySupervisorId ? (nameMap.get(r.industrySupervisorId) ?? null) : null,
      parentId: r.parentId, parentName: r.parentId ? (nameMap.get(r.parentId) ?? null) : null,
    })

    if (!pg) {
      const placements = await buildRows()
      const allUsers = await db.select({ id: users.id, name: users.name }).from(users)
      const nameMap = new Map(allUsers.map(u => [u.id, u.name]))
      return placements.map(r => mapRow(r, nameMap))
    }

    const [countRow] = await db.select({ count: sql<number>`count(*)::int` })
      .from(pklPlacements)
      .innerJoin(students, eq(pklPlacements.studentId, students.id))
      .innerJoin(companies, eq(pklPlacements.companyId, companies.id))
      .innerJoin(users, eq(students.userId, users.id))
      .where(searchFilter)

    const total = countRow?.count ?? 0
    const offset = (pg.page - 1) * pg.perPage
    const placements = await buildRows(pg.perPage, offset)
    const allUsers = await db.select({ id: users.id, name: users.name }).from(users)
    const nameMap = new Map(allUsers.map(u => [u.id, u.name]))
    const data = placements.map(r => mapRow(r, nameMap))

    return { data, total, page: pg.page, perPage: pg.perPage, totalPages: Math.ceil(total / pg.perPage) || 1 }
  },

  async listByStudent(studentId: string) {
    return db
      .select({
        id: pklPlacements.id,
        studentId: pklPlacements.studentId,
        teacherId: pklPlacements.teacherId,
        industrySupervisorId: pklPlacements.industrySupervisorId,
        parentId: pklPlacements.parentId,
        companyId: pklPlacements.companyId,
        companyName: companies.name,
        companyAddress: companies.address,
        startDate: pklPlacements.startDate,
        endDate: pklPlacements.endDate,
        status: pklPlacements.status,
      })
      .from(pklPlacements)
      .innerJoin(companies, eq(pklPlacements.companyId, companies.id))
      .where(eq(pklPlacements.studentId, studentId))
  },

  async create(dto: CreatePlacementDto) {
    const [row] = await db.insert(pklPlacements).values(dto).returning()
    return row
  },

  async update(id: string, dto: Partial<CreatePlacementDto>) {
    const [row] = await db
      .update(pklPlacements)
      .set(dto)
      .where(eq(pklPlacements.id, id))
      .returning()
    return row
  },

  async remove(id: string) {
    await db.delete(pklPlacements).where(eq(pklPlacements.id, id))
  },
}
