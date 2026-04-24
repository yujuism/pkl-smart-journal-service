import { pgTable, uuid, text } from 'drizzle-orm/pg-core'

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  contactPerson: text('contact_person'),
})

export type Company = typeof companies.$inferSelect
export type NewCompany = typeof companies.$inferInsert
