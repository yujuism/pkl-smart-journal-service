import { eq, and, desc, inArray } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { journals, students, pklPlacements, users, feedbacks, majors } from '../db/schema/index.ts'
import { compileJournalEntry } from './ai.ts'
import { notifyJournalSaved } from './whatsapp.ts'

export type CreateJournalDto = {
  date: string
  title: string
  activityRaw: string
  placementId?: string
  photoUrl?: string
}

export type UpdateJournalDto = {
  title?: string
  activityCompiled?: string
  newThings?: string
  obstacle?: string
  solution?: string
  rtl?: string
  photoUrl?: string
}

export const JournalService = {
  async list(params: { userId: string; role: string; studentId?: string; page: number; limit: number }) {
    const { page, limit, userId, role } = params
    const offset = (page - 1) * limit

    let allowedStudentIds: string[] | null = null

    if (role === 'teacher') {
      const rows = await db.select({ studentId: pklPlacements.studentId })
        .from(pklPlacements).where(eq(pklPlacements.teacherId, userId))
      allowedStudentIds = rows.map(r => r.studentId)
    } else if (role === 'industry') {
      const rows = await db.select({ studentId: pklPlacements.studentId })
        .from(pklPlacements).where(eq(pklPlacements.industrySupervisorId, userId))
      allowedStudentIds = rows.map(r => r.studentId)
    } else if (role === 'parent') {
      const rows = await db.select({ studentId: pklPlacements.studentId })
        .from(pklPlacements).where(eq(pklPlacements.parentId, userId))
      allowedStudentIds = rows.map(r => r.studentId)
    }

    // Build WHERE clause
    const conditions = []
    if (params.studentId) {
      // Explicit studentId filter (admin or teacher drilling into one student)
      if (allowedStudentIds !== null && !allowedStudentIds.includes(params.studentId)) {
        return { data: [], page }
      }
      conditions.push(eq(journals.studentId, params.studentId))
    } else if (allowedStudentIds !== null) {
      if (allowedStudentIds.length === 0) return { data: [], page }
      conditions.push(inArray(journals.studentId, allowedStudentIds))
    }
    // admin with no studentId filter → no condition, sees all

    const rows = await db.select().from(journals)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(journals.date))
      .limit(limit)
      .offset(offset)
    return { data: rows, page }
  },

  async getById(id: string, accessor: { userId: string; role: string; studentId?: string | null }) {
    const [journal] = await db.select().from(journals).where(eq(journals.id, id)).limit(1)
    if (!journal) return null

    const { userId, role, studentId } = accessor
    if (role === 'student') {
      if (journal.studentId !== studentId) return null
    } else if (role === 'teacher') {
      const [p] = await db.select({ id: pklPlacements.id }).from(pklPlacements)
        .where(and(eq(pklPlacements.studentId, journal.studentId), eq(pklPlacements.teacherId, userId))).limit(1)
      if (!p) return null
    } else if (role === 'industry') {
      const [p] = await db.select({ id: pklPlacements.id }).from(pklPlacements)
        .where(and(eq(pklPlacements.studentId, journal.studentId), eq(pklPlacements.industrySupervisorId, userId))).limit(1)
      if (!p) return null
    } else if (role === 'parent') {
      const [p] = await db.select({ id: pklPlacements.id }).from(pklPlacements)
        .where(and(eq(pklPlacements.studentId, journal.studentId), eq(pklPlacements.parentId, userId))).limit(1)
      if (!p) return null
    }
    // admin: no restriction

    const journalFeedbacks = await db.select({
      id: feedbacks.id,
      content: feedbacks.content,
      reviewerRole: feedbacks.reviewerRole,
      source: feedbacks.source,
      createdAt: feedbacks.createdAt,
    }).from(feedbacks).where(eq(feedbacks.journalId, id))

    return { ...journal, feedbacks: journalFeedbacks }
  },

  async create(studentId: string, studentName: string, dto: CreateJournalDto) {
    const [student] = await db.select({ id: students.id, majorName: majors.name })
      .from(students).innerJoin(majors, eq(students.majorId, majors.id))
      .where(eq(students.id, studentId)).limit(1)
    if (!student) throw new Error('Student profile not found')

    let aiResult = { activityCompiled: '', newThings: '', obstacle: '', solution: '', rtl: '' }
    try {
      aiResult = await compileJournalEntry({ title: dto.title, activityRaw: dto.activityRaw, major: student.majorName })
    } catch (e) {
      console.error('AI compile failed:', (e as Error).message)
    }

    const [journal] = await db.insert(journals).values({
      studentId: student.id,
      placementId: dto.placementId,
      date: dto.date,
      title: dto.title,
      activityRaw: dto.activityRaw,
      activityCompiled: aiResult.activityCompiled || null,
      newThings: aiResult.newThings || null,
      obstacle: aiResult.obstacle || null,
      solution: aiResult.solution || null,
      rtl: aiResult.rtl || null,
      photoUrl: dto.photoUrl,
      aiProcessed: !!aiResult.activityCompiled,
    }).returning()

    // Fire-and-forget WA notification
    if (dto.placementId) {
      JournalService._notifyPlacement(dto.placementId, studentName, dto.date, dto.title)
        .catch(e => console.error('WA notify failed:', (e as Error).message))
    }

    return journal
  },

  async update(id: string, studentId: string, dto: UpdateJournalDto) {
    const [existing] = await db.select({ id: journals.id }).from(journals)
      .where(and(eq(journals.id, id), eq(journals.studentId, studentId))).limit(1)
    if (!existing) throw new Error('Not found or not authorized')

    const [updated] = await db.update(journals).set(dto).where(eq(journals.id, id)).returning()
    return updated
  },

  async recompile(id: string, studentId: string) {
    const [journal] = await db.select().from(journals)
      .where(and(eq(journals.id, id), eq(journals.studentId, studentId))).limit(1)
    if (!journal) throw new Error('Not found')

    const [student] = await db.select({ majorName: majors.name })
      .from(students).innerJoin(majors, eq(students.majorId, majors.id))
      .where(eq(students.id, studentId)).limit(1)

    const aiResult = await compileJournalEntry({
      title: journal.title,
      activityRaw: journal.activityRaw,
      major: student.majorName,
    })

    const [updated] = await db.update(journals)
      .set({ ...aiResult, aiProcessed: true })
      .where(eq(journals.id, id))
      .returning()
    return updated
  },

  async _notifyPlacement(placementId: string, studentName: string, date: string, title: string) {
    const [placement] = await db.select().from(pklPlacements).where(eq(pklPlacements.id, placementId)).limit(1)
    if (!placement) return

    const pick = async (userId: string | null) => {
      if (!userId) return undefined
      const [row] = await db.select({ phone: users.phone }).from(users).where(eq(users.id, userId)).limit(1)
      return row?.phone ?? undefined
    }

    await notifyJournalSaved({
      studentName,
      date,
      title,
      teacherPhone: await pick(placement.teacherId),
      industryPhone: await pick(placement.industrySupervisorId),
      parentPhone: await pick(placement.parentId),
    })
  },
}
