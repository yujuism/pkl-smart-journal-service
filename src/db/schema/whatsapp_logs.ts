import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { journals } from './journals.ts'

export const whatsappLogs = pgTable('whatsapp_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  journalId: uuid('journal_id').references(() => journals.id),
  recipientPhone: text('recipient_phone').notNull(),
  recipientRole: text('recipient_role').notNull(),
  messageType: text('message_type', { enum: ['notification', 'feedback', 'recap'] }).notNull(),
  status: text('status', { enum: ['sent', 'delivered', 'failed'] }).notNull().default('sent'),
  waMessageId: text('wa_message_id'),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow(),
})

export type WhatsappLog = typeof whatsappLogs.$inferSelect
export type NewWhatsappLog = typeof whatsappLogs.$inferInsert
