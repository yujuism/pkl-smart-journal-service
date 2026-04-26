import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.ts'
import { EvaluationService } from '../services/evaluation.service.ts'
import type { AppEnv } from '../types.ts'

const router = new Hono<AppEnv>()

router.get('/student/:studentId', requireAuth('teacher', 'admin'), async (c) => {
  const rows = await EvaluationService.listByStudent(c.req.param('studentId') as string)
  return c.json(rows)
})

const triggerSchema = z.object({
  studentId: z.string().uuid(),
  placementId: z.string().uuid().optional(),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

router.post('/trigger', requireAuth('teacher', 'admin'), zValidator('json', triggerSchema), async (c) => {
  try {
    const result = await EvaluationService.trigger(c.req.valid('json'))
    return c.json(result, 201)
  } catch (e) {
    return c.json({ error: (e as Error).message }, 404)
  }
})

router.delete('/:id', requireAuth('teacher', 'admin'), async (c) => {
  try {
    await EvaluationService.delete(c.req.param('id') as string)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: (e as Error).message }, 404)
  }
})

export default router
