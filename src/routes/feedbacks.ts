import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.ts'
import { FeedbackService } from '../services/feedback.service.ts'
import type { AppEnv } from '../types.ts'

const router = new Hono<AppEnv>()

router.get('/journal/:journalId', requireAuth('teacher', 'industry', 'admin'), async (c) => {
  const rows = await FeedbackService.listByJournal(c.req.param('journalId') as string)
  return c.json(rows)
})

const createSchema = z.object({
  journalId: z.string().uuid(),
  content: z.string().min(3),
  source: z.enum(['web', 'whatsapp']).default('web'),
})

router.post('/', requireAuth('teacher', 'industry'), zValidator('json', createSchema), async (c) => {
  const user = c.get('user')
  try {
    const feedback = await FeedbackService.create({
      journalId: c.req.valid('json').journalId,
      reviewerId: user.id,
      reviewerRole: user.role,
      content: c.req.valid('json').content,
      source: c.req.valid('json').source,
    })
    return c.json(feedback, 201)
  } catch (e) {
    return c.json({ error: (e as Error).message }, 404)
  }
})

// Fonnte webhook: WA replies → feedback
router.post('/webhook/whatsapp', async (c) => {
  const body = await c.req.json() as { message?: string; sender?: string }
  console.log('[WA WEBHOOK]', body.sender, ':', body.message)
  // TODO: match sender → user → latest mentee journal → FeedbackService.create
  return c.json({ status: 'received' })
})

export default router
