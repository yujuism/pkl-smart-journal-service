import { eq, desc, and } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { aiEvaluations, students, users, journals, competencyGuidelines, majors, pklPlacements, companies } from '../db/schema/index.ts'
import { evaluatePKLCompetency } from './ai.ts'

export type TriggerEvaluationDto = {
  studentId: string
  placementId?: string
  periodStart?: string
  periodEnd?: string
}

export const EvaluationService = {
  async listByStudent(studentId: string) {
    return db.select({
      id: aiEvaluations.id,
      studentId: aiEvaluations.studentId,
      placementId: aiEvaluations.placementId,
      periodStart: aiEvaluations.periodStart,
      periodEnd: aiEvaluations.periodEnd,
      score: aiEvaluations.score,
      analysis: aiEvaluations.analysis,
      ringkasanKegiatan: aiEvaluations.ringkasanKegiatan,
      kompetensiDikuasai: aiEvaluations.kompetensiDikuasai,
      perkembangan: aiEvaluations.perkembangan,
      kendalaAdaptasi: aiEvaluations.kendalaAdaptasi,
      kesiapanKerja: aiEvaluations.kesiapanKerja,
      recommendation: aiEvaluations.recommendation,
      competencyScores: aiEvaluations.competencyScores,
      companyName: aiEvaluations.companyName,
      createdAt: aiEvaluations.createdAt,
    }).from(aiEvaluations)
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

    // Snapshot company name at time of evaluation for historical accuracy
    const [activePlacement] = await db.select({ companyName: companies.name, placementId: pklPlacements.id })
      .from(pklPlacements)
      .innerJoin(companies, eq(pklPlacements.companyId, companies.id))
      .where(and(eq(pklPlacements.studentId, dto.studentId), eq(pklPlacements.status, 'active')))
      .limit(1)

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

    const periodEnd = dto.periodEnd ?? now.toISOString().split('T')[0]
    const periodStart = dto.periodStart ?? thirtyDaysAgo.toISOString().split('T')[0]

    const [saved] = await db.insert(aiEvaluations).values({
      studentId: dto.studentId,
      placementId: dto.placementId ?? activePlacement?.placementId,
      periodStart,
      periodEnd,
      score: evaluation.score,
      analysis: evaluation.analysis,
      ringkasanKegiatan: evaluation.ringkasanKegiatan,
      kompetensiDikuasai: evaluation.kompetensiDikuasai,
      perkembangan: evaluation.perkembangan,
      kendalaAdaptasi: evaluation.kendalaAdaptasi,
      kesiapanKerja: evaluation.kesiapanKerja,
      recommendation: evaluation.recommendation,
      competencyScores: evaluation.competencyScores,
      companyName: activePlacement?.companyName ?? null,
    }).returning()

    return saved
  },

  async delete(id: string) {
    const [deleted] = await db.delete(aiEvaluations).where(eq(aiEvaluations.id, id)).returning()
    if (!deleted) throw new Error('Evaluation not found')
    return deleted
  },
}
