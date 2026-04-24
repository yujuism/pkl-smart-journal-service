import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { AuthService } from '../services/auth.service.ts'
import { requireAuth } from '../middleware/auth.ts'
import type { AppEnv } from '../types.ts'

const router = new Hono<AppEnv>()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['student', 'teacher', 'industry', 'parent', 'admin']),
  phone: z.string().optional(),
  schoolId: z.string().uuid().optional(),
  nis: z.string().optional(),
  class: z.string().optional(),
  majorId: z.string().uuid().optional(),
})

router.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const result = await AuthService.login(c.req.valid('json'))
    return c.json(result)
  } catch (e) {
    return c.json({ error: (e as Error).message }, 401)
  }
})

router.post('/register', zValidator('json', registerSchema), async (c) => {
  try {
    await AuthService.register(c.req.valid('json'))
    return c.json({ message: 'Registered successfully' }, 201)
  } catch (e) {
    return c.json({ error: (e as Error).message }, 409)
  }
})

// Google OAuth — verify GSI credential token, login or return onboarding data
router.post('/google', async (c) => {
  try {
    const { credential } = await c.req.json()
    if (!credential) return c.json({ error: 'Missing credential' }, 400)
    const result = await AuthService.loginWithGoogle(credential)
    return c.json(result)
  } catch (e) {
    return c.json({ error: (e as Error).message }, 401)
  }
})

// Complete Google onboarding — create user after form fill
router.post('/google/onboard', async (c) => {
  try {
    const body = await c.req.json()
    const result = await AuthService.onboardGoogle(body)
    return c.json(result)
  } catch (e) {
    return c.json({ error: (e as Error).message }, 409)
  }
})

// Validate token + status — returns 401 if pending/suspended
router.get('/me', requireAuth(), async (c) => {
  return c.json(c.get('user'))
})

export default router
