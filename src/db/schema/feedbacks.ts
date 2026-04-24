import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { journals } from './journals.ts'
import { users } from './users.ts'

export const feedbacks = pgTable('feedbacks', {
  id: uuid('id').primaryKey().defaultRandom(),
  journalId: uuid('journal_id').notNull().references(() => journals.id),
  reviewerId: uuid('reviewer_id').notNull().references(() => users.id),
  reviewerRole: text('reviewer_role').notNull(),
  content: text('content').notNull(),
  source: text('source', { enum: ['web', 'whatsapp'] }).notNull().default('web'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export type Feedback = typeof feedbacks.$inferSelect
export type NewFeedback = typeof feedbacks.$inferInsert
