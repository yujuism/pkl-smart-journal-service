import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireAuth, requirePermission } from '../middleware/auth.ts'
import { PlacementService } from '../services/placement.service.ts'
import type { AppEnv } from '../types.ts'

const router = new Hono<AppEnv>()

router.get('/my', requireAuth('student'), async (c) => {
  const rows = await PlacementService.listByStudent(c.get('user').studentId!)
  return c.json(rows)
})

router.get('/', requirePermission('placements:write'), async (c) => {
  const rows = await PlacementService.listAll()
  return c.json(rows)
})

const createSchema = z.object({
  studentId: z.string().uuid(),
  teacherId: z.string().uuid().optional(),
  industrySupervisorId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  companyId: z.string().uuid(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

router.post('/', requirePermission('placements:write'), zValidator('json', createSchema), async (c) => {
  const row = await PlacementService.create(c.req.valid('json'))
  return c.json(row, 201)
})

router.put('/:id', requirePermission('placements:write'), async (c) => {
  const body = await c.req.json() as Parameters<typeof PlacementService.update>[1]
  const row = await PlacementService.update(c.req.param('id') as string, body)
  return c.json(row)
})

router.delete('/:id', requirePermission('placements:write'), async (c) => {
  await PlacementService.remove(c.req.param('id') as string)
  return c.json({ success: true })
})

export default router
