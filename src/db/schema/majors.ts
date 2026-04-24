import { pgTable, uuid, text } from 'drizzle-orm/pg-core'

export const majors = pgTable('majors', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),  // e.g. TKRO
  name: text('name').notNull(),           // e.g. Teknik Kendaraan Ringan Otomotif
})

export type Major = typeof majors.$inferSelect
export type NewMajor = typeof majors.$inferInsert
