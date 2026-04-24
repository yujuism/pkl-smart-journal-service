import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { schools } from './schools.ts'

export type Competency = {
  name: string
  indicators: string[]
  weight: number
}

export const competencyGuidelines = pgTable('competency_guidelines', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').references(() => schools.id),
  major: text('major').notNull(),
  title: text('title').notNull(),
  competencies: jsonb('competencies').$type<Competency[]>().notNull().default([]),
  keywords: text('keywords').array().default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export type CompetencyGuideline = typeof competencyGuidelines.$inferSelect
export type NewCompetencyGuideline = typeof competencyGuidelines.$inferInsert
