import { eq, desc } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { aiEvaluations, students, users, journals, competencyGuidelines, majors } from '../db/schema/index.ts'
import { evaluatePKLCompetency } from './ai.ts'

export type TriggerEvaluationDto = {
  studentId: string
  placementId?: string
}

export const EvaluationService = {
  async listByStudent(studentId: string) {
    return db.select().from(aiEvaluations)
      .where(eq(aiEvaluations.studentId, studentId))
      .orderBy(desc(aiEvaluations.createdAt))
  },

  async trigger(dto: TriggerEvaluationDto) {
    const [student] = await db.select({ id: students.id, majorName: majors.name, name: users.name })
      .from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .innerJoin(majors, eq(students.majorId, majors.id))
      .where(eq(students.id, dto.studentId))
      .limit(1)
    if (!student) throw new Error('Student not found')

    const studentJournals = await db.select({
      date: journals.date,
      title: journals.title,
      activityRaw: journals.activityRaw,
      activityCompiled: journals.activityCompiled,
    }).from(journals)
      .where(eq(journals.studentId, dto.studentId))
      .orderBy(desc(journals.date))
      .limit(30)

    const [guideline] = await db.select().from(competencyGuidelines)
      .where(eq(competencyGuidelines.major, student.majorName)).limit(1)

    const evaluation = await evaluatePKLCompetency({
      studentName: student.name,
      major: student.majorName,
      journals: studentJournals,
      guidelines: guideline
        ? { competencies: guideline.competencies ?? [], keywords: guideline.keywords ?? [] }
        : undefined,
    })

    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(now.getDate() - 30)

    const [saved] = await db.insert(aiEvaluations).values({
      studentId: dto.studentId,
      placementId: dto.placementId,
      periodStart: thirtyDaysAgo.toISOString().split('T')[0],
      periodEnd: now.toISOString().split('T')[0],
      score: evaluation.score,
      analysis: evaluation.analysis,
      recommendation: evaluation.recommendation,
      competencyScores: evaluation.competencyScores,
    }).returning()

    return saved
  },
}
