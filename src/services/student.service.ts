import { eq, and } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { students, users, pklPlacements, journals, majors, companies } from '../db/schema/index.ts'
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
    }).from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .innerJoin(majors, eq(students.majorId, majors.id))
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
