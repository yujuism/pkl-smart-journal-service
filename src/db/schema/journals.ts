import { pgTable, uuid, text, date, boolean, timestamp, unique } from 'drizzle-orm/pg-core'
import { students } from './students.ts'
import { pklPlacements } from './placements.ts'

export const journals = pgTable('journals', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id),
  placementId: uuid('placement_id').references(() => pklPlacements.id),
  date: date('date').notNull(),
  title: text('title').notNull(),
  activityRaw: text('activity_raw').notNull(),
  activityCompiled: text('activity_compiled'),
  newThings: text('new_things'),
  obstacle: text('obstacle'),
  solution: text('solution'),
  rtl: text('rtl'),
  photoUrl: text('photo_url'),
  aiProcessed: boolean('ai_processed').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  finalizedAt: timestamp('finalized_at', { withTimezone: true }),
}, (t) => [
  unique('journals_student_date_unique').on(t.studentId, t.date),
])

export type Journal = typeof journals.$inferSelect
export type NewJournal = typeof journals.$inferInsert
