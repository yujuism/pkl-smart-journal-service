import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.ts'
import { GuidelineService } from '../services/guideline.service.ts'
import type { AppEnv } from '../types.ts'

const router = new Hono<AppEnv>()

router.get('/', requireAuth('teacher', 'admin'), async (c) => {
  return c.json(await GuidelineService.listAll())
})

router.get('/:major', requireAuth('teacher', 'admin'), async (c) => {
  const row = await GuidelineService.getByMajor(c.req.param('major') as string)
  if (!row) return c.json({ error: 'Not found' }, 404)
  return c.json(row)
})

const competencySchema = z.object({
  major: z.string().min(2),
  title: z.string().min(2),
  schoolId: z.string().uuid().optional(),
  competencies: z.array(z.object({
    name: z.string(),
    indicators: z.array(z.string()),
    weight: z.number().min(0).max(100),
  })),
  keywords: z.array(z.string()).optional(),
})

router.post('/', requireAuth('admin'), zValidator('json', competencySchema), async (c) => {
  const row = await GuidelineService.create(c.req.valid('json'))
  return c.json(row, 201)
})

router.put('/:id', requireAuth('admin'), zValidator('json', competencySchema), async (c) => {
  const row = await GuidelineService.update(c.req.param('id') as string, c.req.valid('json'))
  return c.json(row)
})

export default router
