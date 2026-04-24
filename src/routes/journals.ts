import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.ts'
import { JournalService } from '../services/journal.service.ts'
import type { AppEnv } from '../types.ts'

const router = new Hono<AppEnv>()

router.get('/', requireAuth('student', 'teacher', 'industry', 'admin'), async (c) => {
  const user = c.get('user')
  const { page = '1', limit = '10', studentId } = c.req.query()
  const resolvedStudentId = user.role === 'student' ? user.studentId! : studentId
  const result = await JournalService.list({
    userId: user.id,
    role: user.role,
    studentId: resolvedStudentId,
    page: parseInt(page),
    limit: parseInt(limit),
  })
  return c.json(result)
})

router.get('/:id', requireAuth('student', 'teacher', 'industry', 'admin'), async (c) => {
  const user = c.get('user')
  const journal = await JournalService.getById(c.req.param('id') as string, {
    userId: user.id,
    role: user.role,
    studentId: user.studentId,
  })
  if (!journal) return c.json({ error: 'Not found' }, 404)
  return c.json(journal)
})

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  title: z.string().min(3),
  activityRaw: z.string().min(10),
  placementId: z.string().uuid().optional(),
  photoUrl: z.string().url().optional(),
})

router.post('/', requireAuth('student'), zValidator('json', createSchema), async (c) => {
  const user = c.get('user')
  try {
    const journal = await JournalService.create(user.studentId!, user.name, c.req.valid('json'))
    return c.json(journal, 201)
  } catch (e) {
    return c.json({ error: (e as Error).message }, 400)
  }
})

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  activityCompiled: z.string().optional(),
  newThings: z.string().optional(),
  obstacle: z.string().optional(),
  solution: z.string().optional(),
  rtl: z.string().optional(),
  photoUrl: z.string().url().optional(),
})

router.put('/:id', requireAuth('student'), zValidator('json', updateSchema), async (c) => {
  const user = c.get('user')
  try {
    const updated = await JournalService.update(c.req.param('id') as string, user.studentId!, c.req.valid('json'))
    return c.json(updated)
  } catch (e) {
    return c.json({ error: (e as Error).message }, 404)
  }
})

router.post('/:id/compile', requireAuth('student'), async (c) => {
  const user = c.get('user')
  try {
    const updated = await JournalService.recompile(c.req.param('id') as string, user.studentId!)
    return c.json(updated)
  } catch (e) {
    return c.json({ error: (e as Error).message }, 404)
  }
})

export default router
