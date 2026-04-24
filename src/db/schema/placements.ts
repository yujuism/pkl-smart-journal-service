import { pgTable, uuid, text, date } from 'drizzle-orm/pg-core'
import { students } from './students.ts'
import { users } from './users.ts'
import { companies } from './companies.ts'

export const pklPlacements = pgTable('pkl_placements', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id),
  teacherId: uuid('teacher_id').references(() => users.id),
  industrySupervisorId: uuid('industry_supervisor_id').references(() => users.id),
  parentId: uuid('parent_id').references(() => users.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  startDate: date('start_date'),
  endDate: date('end_date'),
  status: text('status', { enum: ['active', 'completed', 'transferred'] }).notNull().default('active'),
})

export type PklPlacement = typeof pklPlacements.$inferSelect
export type NewPklPlacement = typeof pklPlacements.$inferInsert
