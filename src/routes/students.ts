import { Hono } from 'hono'
import { requireAuth, requirePermission } from '../middleware/auth.ts'
import { StudentService } from '../services/student.service.ts'
import type { AppEnv } from '../types.ts'

const router = new Hono<AppEnv>()

// ABAC: each role gets only their scoped students
router.get('/', requirePermission('students:read'), async (c) => {
  const user = c.get('user')
  const rows = await StudentService.listForUser(user)
  return c.json(rows)
})

router.get('/stats', requirePermission('students:read'), async (c) => {
  const user = c.get('user')
  const stats = await StudentService.getStats(user)
  return c.json(stats)
})

router.get('/:id/summary', requirePermission('students:read'), async (c) => {
  const user = c.get('user')
  const studentId = c.req.param('id') as string

  // ABAC ownership check
  const allowed = await StudentService.canAccess(user, studentId)
  if (!allowed) return c.json({ error: 'Forbidden — bukan siswa bimbingan Anda' }, 403)

  const summary = await StudentService.getSummary(studentId)
  if (!summary) return c.json({ error: 'Not found' }, 404)
  return c.json(summary)
})

router.get('/:id/contacts', requirePermission('students:read'), async (c) => {
  const user = c.get('user')
  const studentId = c.req.param('id') as string

  const allowed = await StudentService.canAccess(user, studentId)
  if (!allowed) return c.json({ error: 'Forbidden' }, 403)

  const contacts = await StudentService.getContacts(studentId)
  return c.json(contacts)
})

export default router
