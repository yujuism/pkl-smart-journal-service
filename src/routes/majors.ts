import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requirePermission } from '../middleware/auth.ts'
import { MajorService } from '../services/major.service.ts'
import type { AppEnv } from '../types.ts'

const router = new Hono<AppEnv>()
const schema = z.object({ code: z.string().min(2).max(20), name: z.string().min(3) })

router.get('/', async (c) => c.json(await MajorService.list()))
router.post('/', requirePermission('guidelines:manage'), zValidator('json', schema), async (c) => {
  const row = await MajorService.create(c.req.valid('json'))
  return c.json(row, 201)
})
router.put('/:id', requirePermission('guidelines:manage'), zValidator('json', schema), async (c) => {
  const row = await MajorService.update(c.req.param('id'), c.req.valid('json'))
  return c.json(row)
})
router.delete('/:id', requirePermission('guidelines:manage'), async (c) => {
  await MajorService.remove(c.req.param('id'))
  return c.json({ success: true })
})
export default router
