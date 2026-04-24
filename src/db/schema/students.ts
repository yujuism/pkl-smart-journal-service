import { pgTable, uuid, text } from 'drizzle-orm/pg-core'
import { schools } from './schools.ts'
import { users } from './users.ts'
import { majors } from './majors.ts'

export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id),
  schoolId: uuid('school_id').references(() => schools.id),
  nis: text('nis').notNull().unique(),
  class: text('class').notNull(),
  majorId: uuid('major_id').notNull().references(() => majors.id),
})

export type Student = typeof students.$inferSelect
export type NewStudent = typeof students.$inferInsert
