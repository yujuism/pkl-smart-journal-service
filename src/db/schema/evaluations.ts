import { pgTable, uuid, text, date, real, timestamp, jsonb } from 'drizzle-orm/pg-core'
import { students } from './students.ts'
import { pklPlacements } from './placements.ts'

export const aiEvaluations = pgTable('ai_evaluations', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id),
  placementId: uuid('placement_id').references(() => pklPlacements.id),
  periodStart: date('period_start'),
  periodEnd: date('period_end'),
  score: real('score'),
  analysis: text('analysis'),
  recommendation: text('recommendation', { enum: ['lanjut', 'perhatikan', 'pindah'] }),
  competencyScores: jsonb('competency_scores').$type<Record<string, number>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export type AiEvaluation = typeof aiEvaluations.$inferSelect
export type NewAiEvaluation = typeof aiEvaluations.$inferInsert
