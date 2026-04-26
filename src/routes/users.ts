import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireAuth, requirePermission } from '../middleware/auth.ts'
import { UserService } from '../services/user.service.ts'
import { parsePagination } from '../utils/pagination.ts'
import type { AppEnv } from '../types.ts'

const router = new Hono<AppEnv>()

// Admin: list all users (optionally filtered by role)
router.get('/', requireAuth('admin'), async (c) => {
  const role = c.req.query('role')
  const search = c.req.query('search') ?? ''
  const pg = parsePagination(c.req.query() as Record<string, string>)
  const result = await UserService.listAll(role as string | undefined, pg, search)
  return c.json(result)
})

// Admin/approver: list pending users
router.get('/pending', requirePermission('users:approve'), async (c) => {
  const search = c.req.query('search') ?? ''
  const pg = parsePagination(c.req.query() as Record<string, string>)
  const result = await UserService.listPending(pg, search)
  return c.json(result)
})

// Admin/approver: approve pending user
router.post('/:id/approve', requirePermission('users:approve'), async (c) => {
  try {
    const row = await UserService.approve(c.req.param('id') as string)
    return c.json(row)
  } catch (e) {
    return c.json({ error: (e as Error).message }, 404)
  }
})

// Admin/approver: reject (delete) pending user
router.post('/:id/reject', requirePermission('users:approve'), async (c) => {
  try {
    await UserService.reject(c.req.param('id') as string)
    return c.json({ success: true })
  } catch (e) {
    return c.json({ error: (e as Error).message }, 404)
  }
})

// Admin: get single user
router.get('/:id', requireAuth('admin'), async (c) => {
  const user = await UserService.getById(c.req.param('id') as string)
  if (!user) return c.json({ error: 'Not found' }, 404)
  return c.json(user)
})

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['student', 'teacher', 'industry', 'parent', 'admin']),
  phone: z.string().optional(),
  schoolId: z.string().uuid().optional(),
  // student-specific
  nis: z.string().optional(),
  class: z.string().optional(),
  majorId: z.string().uuid().optional(),
})

// Admin: create user
router.post('/', requireAuth('admin'), zValidator('json', createUserSchema), async (c) => {
  const user = c.get('user')
  const body = c.req.valid('json')
  const row = await UserService.create({ ...body, schoolId: body.schoolId ?? user.schoolId ?? undefined })
  return c.json(row, 201)
})

// Admin: update user role
router.patch('/:id/role', requireAuth('admin'), zValidator('json', z.object({
  role: z.enum(['student', 'teacher', 'industry', 'parent', 'admin']),
})), async (c) => {
  const row = await UserService.updateRole(c.req.param('id') as string, c.req.valid('json').role)
  return c.json(row)
})

// Admin: delete user
router.delete('/:id', requireAuth('admin'), async (c) => {
  await UserService.delete(c.req.param('id') as string)
  return c.json({ success: true })
})

export default router
