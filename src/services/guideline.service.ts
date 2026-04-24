import { eq } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { competencyGuidelines } from '../db/schema/index.ts'
import type { Competency } from '../db/schema/guidelines.ts'

export type UpsertGuidelineDto = {
  major: string
  title: string
  schoolId?: string
  competencies: Competency[]
  keywords?: string[]
}

export const GuidelineService = {
  async listAll() {
    return db.select().from(competencyGuidelines)
  },

  async getByMajor(major: string) {
    const [row] = await db.select().from(competencyGuidelines)
      .where(eq(competencyGuidelines.major, major)).limit(1)
    return row ?? null
  },

  async create(dto: UpsertGuidelineDto) {
    const [row] = await db.insert(competencyGuidelines).values({
      major: dto.major,
      title: dto.title,
      schoolId: dto.schoolId,
      competencies: dto.competencies,
      keywords: dto.keywords ?? [],
    }).returning()
    return row
  },

  async update(id: string, dto: UpsertGuidelineDto) {
    const [row] = await db.update(competencyGuidelines).set({
      major: dto.major,
      title: dto.title,
      competencies: dto.competencies,
      keywords: dto.keywords ?? [],
      updatedAt: new Date(),
    }).where(eq(competencyGuidelines.id, id)).returning()
    return row
  },
}
