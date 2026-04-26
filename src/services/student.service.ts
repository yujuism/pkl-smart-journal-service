import { eq, and, sql } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { students, users, pklPlacements, journals, majors, companies, feedbacks } from '../db/schema/index.ts'
import type { JwtPayload } from '../middleware/auth.ts'

export const StudentService = {
  async listAll() {
    return db.select({
      id: students.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      nis: students.nis,
      class: students.class,
      major: majors.name,
      companyName: companies.name,
      placementId: pklPlacements.id,
    }).from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .innerJoin(majors, eq(students.majorId, majors.id))
      .leftJoin(pklPlacements, and(eq(pklPlacements.studentId, students.id), eq(pklPlacements.status, 'active')))
      .leftJoin(companies, eq(pklPlacements.companyId, companies.id))
  },

  async listByTeacher(teacherId: string) {
    return db.select({
      id: students.id,
      name: users.name,
      email: users.email,
      nis: students.nis,
      class: students.class,
      major: majors.name,
      companyName: companies.name,
      placementId: pklPlacements.id,
    })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .innerJoin(majors, eq(students.majorId, majors.id))
      .innerJoin(pklPlacements, and(
        eq(pklPlacements.studentId, students.id),
        eq(pklPlacements.teacherId, teacherId),
        eq(pklPlacements.status, 'active'),
      ))
      .innerJoin(companies, eq(pklPlacements.companyId, companies.id))
  },

  // ABAC: industry sees only students at their company
  async listByIndustry(industrySupervisorId: string) {
    return db.select({
      id: students.id,
      name: users.name,
      email: users.email,
      nis: students.nis,
      class: students.class,
      major: majors.name,
      companyName: companies.name,
      placementId: pklPlacements.id,
    })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .innerJoin(majors, eq(students.majorId, majors.id))
      .innerJoin(pklPlacements, and(
        eq(pklPlacements.studentId, students.id),
        eq(pklPlacements.industrySupervisorId, industrySupervisorId),
        eq(pklPlacements.status, 'active'),
      ))
      .innerJoin(companies, eq(pklPlacements.companyId, companies.id))
  },

  // ABAC: parent sees only their own child
  async listByParent(parentId: string) {
    return db.select({
      id: students.id,
      name: users.name,
      email: users.email,
      nis: students.nis,
      class: students.class,
      major: majors.name,
      companyName: companies.name,
      placementId: pklPlacements.id,
    })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .innerJoin(majors, eq(students.majorId, majors.id))
      .innerJoin(pklPlacements, and(
        eq(pklPlacements.studentId, students.id),
        eq(pklPlacements.parentId, parentId),
        eq(pklPlacements.status, 'active'),
      ))
      .innerJoin(companies, eq(pklPlacements.companyId, companies.id))
  },

  // ABAC-aware list — picks correct query based on caller's system role
  async listForUser(caller: JwtPayload) {
    if (caller.role === 'admin') return StudentService.listAll()
    if (caller.role === 'teacher') return StudentService.listByTeacher(caller.id)
    if (caller.role === 'industry') return StudentService.listByIndustry(caller.id)
    if (caller.role === 'parent') return StudentService.listByParent(caller.id)
    return StudentService.listByTeacher(caller.id)
  },

  // ABAC: verify caller is allowed to access a specific student
  async canAccess(caller: JwtPayload, studentId: string): Promise<boolean> {
    if (caller.role === 'admin') return true
    if (caller.role === 'student') return caller.studentId === studentId

    const condition = caller.role === 'teacher'
      ? eq(pklPlacements.teacherId, caller.id)
      : caller.role === 'industry'
      ? eq(pklPlacements.industrySupervisorId, caller.id)
      : eq(pklPlacements.parentId, caller.id)

    const [row] = await db.select({ id: pklPlacements.id }).from(pklPlacements).where(
      and(eq(pklPlacements.studentId, studentId), eq(pklPlacements.status, 'active'), condition)
    ).limit(1)
    return !!row
  },

  async getStats(caller: JwtPayload) {
    // Get scoped student IDs
    const studentRows = await StudentService.listForUser(caller)
    const studentIds = studentRows.map(s => s.id)
    if (studentIds.length === 0) {
      return { totalStudents: 0, activeStudents: 0, totalJournals: 0, journalsThisWeek: 0, journalsTodayCount: 0, unreviewed: 0, studentsNoJournalToday: [] }
    }

    const idList = studentIds.map(id => `'${id}'`).join(',')
    const today = new Date().toISOString().split('T')[0]
    const monday = new Date()
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
    const mondayStr = monday.toISOString().split('T')[0]

    const [counts] = await db.execute(sql`
      SELECT
        COUNT(DISTINCT j.id) FILTER (WHERE j.id IS NOT NULL) AS total_journals,
        COUNT(DISTINCT j.id) FILTER (WHERE j.date >= ${mondayStr}) AS journals_this_week,
        COUNT(DISTINCT j.id) FILTER (WHERE j.date = ${today}) AS journals_today
      FROM journals j
      WHERE j.student_id = ANY(ARRAY[${sql.raw(idList)}]::uuid[])
    `) as any

    // Unreviewed: finalized journals with no feedback from caller's role
    const [unreviewedRow] = await db.execute(sql`
      SELECT COUNT(DISTINCT j.id) AS unreviewed
      FROM journals j
      WHERE j.student_id = ANY(ARRAY[${sql.raw(idList)}]::uuid[])
        AND j.finalized_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM feedbacks f
          WHERE f.journal_id = j.id AND f.reviewer_role = ${caller.role}
        )
    `) as any

    // Students with no journal today
    const noJournalRows = await db.execute(sql`
      SELECT u.name FROM students s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = ANY(ARRAY[${sql.raw(idList)}]::uuid[])
        AND NOT EXISTS (
          SELECT 1 FROM journals j WHERE j.student_id = s.id AND j.date = ${today}
        )
    `) as any[]

    // Active = has active placement
    const activePlacements = await db.select({ studentId: pklPlacements.studentId })
      .from(pklPlacements)
      .where(and(eq(pklPlacements.status, 'active'), sql`student_id = ANY(ARRAY[${sql.raw(idList)}]::uuid[])`))
    const activeStudents = new Set(activePlacements.map(p => p.studentId)).size

    return {
      totalStudents: studentIds.length,
      activeStudents,
      totalJournals: Number(counts?.total_journals ?? 0),
      journalsThisWeek: Number(counts?.journals_this_week ?? 0),
      journalsTodayCount: Number(counts?.journals_today ?? 0),
      unreviewed: Number(unreviewedRow?.unreviewed ?? 0),
      studentsNoJournalToday: (noJournalRows as any[]).map((r: any) => r.name),
    }
  },

  async getContacts(studentId: string) {
    // Student + their user phone
    const [studentRow] = await db.select({ name: users.name, phone: users.phone })
      .from(students).innerJoin(users, eq(students.userId, users.id))
      .where(eq(students.id, studentId)).limit(1)

    // Active placement
    const [placement] = await db.select({
      teacherId: pklPlacements.teacherId,
      industrySupervisorId: pklPlacements.industrySupervisorId,
      parentId: pklPlacements.parentId,
    }).from(pklPlacements)
      .where(and(eq(pklPlacements.studentId, studentId), eq(pklPlacements.status, 'active')))
      .limit(1)

    const pickContact = async (userId: string | null) => {
      if (!userId) return null
      const [row] = await db.select({ name: users.name, phone: users.phone }).from(users).where(eq(users.id, userId)).limit(1)
      return row ?? null
    }

    return {
      student: studentRow ?? null,
      teacher: await pickContact(placement?.teacherId ?? null),
      industrySupervisor: await pickContact(placement?.industrySupervisorId ?? null),
      parent: await pickContact(placement?.parentId ?? null),
    }
  },

  async getUnreviewedJournals(caller: JwtPayload) {
    const studentRows = await StudentService.listForUser(caller)
    const studentIds = studentRows.map(s => s.id)
    if (studentIds.length === 0) return []

    const idList = studentIds.map(id => `'${id}'`).join(',')
    const rows = await db.execute(sql`
      SELECT
        j.id,
        j.date,
        j.title,
        j.student_id AS "studentId",
        u.name AS "studentName"
      FROM journals j
      JOIN students s ON s.id = j.student_id
      JOIN users u ON u.id = s.user_id
      WHERE j.student_id = ANY(ARRAY[${sql.raw(idList)}]::uuid[])
        AND j.finalized_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM feedbacks f
          WHERE f.journal_id = j.id AND f.reviewer_role = ${caller.role}
        )
      ORDER BY j.date DESC
    `) as any[]
    return rows as { id: string; date: string; title: string; studentId: string; studentName: string }[]
  },

  async getSummary(studentId: string) {
    const [student] = await db.select({
      id: students.id,
      name: users.name,
      nis: students.nis,
      class: students.class,
      major: majors.name,
    }).from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .innerJoin(majors, eq(students.majorId, majors.id))
      .where(eq(students.id, studentId))
      .limit(1)

    if (!student) return null

    const recentJournals = await db.select({
      id: journals.id,
      date: journals.date,
      title: journals.title,
      aiProcessed: journals.aiProcessed,
      createdAt: journals.createdAt,
    }).from(journals)
      .where(eq(journals.studentId, studentId))
      .orderBy(journals.date)
      .limit(7)

    return { student, recentJournals, totalJournals: recentJournals.length }
  },
}
