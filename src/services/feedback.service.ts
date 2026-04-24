import { eq } from 'drizzle-orm'
import { db } from '../db/index.ts'
import { feedbacks, journals } from '../db/schema/index.ts'

export type CreateFeedbackDto = {
  journalId: string
  reviewerId: string
  reviewerRole: string
  content: string
  source: 'web' | 'whatsapp'
}

export const FeedbackService = {
  async listByJournal(journalId: string) {
    return db.select().from(feedbacks).where(eq(feedbacks.journalId, journalId))
  },

  async create(dto: CreateFeedbackDto) {
    const [journal] = await db.select({ id: journals.id }).from(journals)
      .where(eq(journals.id, dto.journalId)).limit(1)
    if (!journal) throw new Error('Journal not found')

    const [feedback] = await db.insert(feedbacks).values(dto).returning()
    return feedback
  },
}
