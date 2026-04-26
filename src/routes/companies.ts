import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requirePermission } from '../middleware/auth.ts'
import { CompanyService } from '../services/company.service.ts'
import { parsePagination } from '../utils/pagination.ts'
import type { AppEnv } from '../types.ts'

const router = new Hono<AppEnv>()
const schema = z.object({
  name: z.string().min(2),
  address: z.string().optional(),
  phone: z.string().optional(),
  contactPerson: z.string().optional(),
})

router.get('/', async (c) => {
  const pg = parsePagination(c.req.query() as Record<string, string>)
  const search = c.req.query('search') ?? ''
  return c.json(await CompanyService.list(pg, search))
})

router.get('/with-students', requirePermission('students:read'), async (c) => {
  const user = c.get('user')
  const data = await CompanyService.listWithStudents(user)
  return c.json(data)
})
router.post('/', requirePermission('placements:write'), zValidator('json', schema), async (c) => {
  const row = await CompanyService.create(c.req.valid('json'))
  return c.json(row, 201)
})
router.put('/:id', requirePermission('placements:write'), zValidator('json', schema), async (c) => {
  const row = await CompanyService.update(c.req.param('id'), c.req.valid('json'))
  return c.json(row)
})
router.delete('/:id', requirePermission('placements:write'), async (c) => {
  await CompanyService.remove(c.req.param('id'))
  return c.json({ success: true })
})
export default router
