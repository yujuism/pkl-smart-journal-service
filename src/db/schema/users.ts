import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { schools } from './schools.ts'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  schoolId: uuid('school_id').references(() => schools.id),
  role: text('role', { enum: ['student', 'teacher', 'industry', 'parent', 'admin'] }).notNull(),
  status: text('status', { enum: ['pending', 'active', 'suspended'] }).notNull().default('active'),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  phone: text('phone'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
