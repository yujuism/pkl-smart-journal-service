import { Hono } from 'hono'
import { verifyToken } from '../middleware/auth.ts'
import { StudentService } from '../services/student.service.ts'
import { ReportService } from '../services/report.service.ts'
import type { AppEnv } from '../types.ts'

const router = new Hono<AppEnv>()

// GET /api/reports/student/:studentId — returns HTML report
// Supports token via Authorization header OR ?token= query param (for browser tab open)
router.get('/student/:studentId', async (c) => {
  const studentId = c.req.param('studentId') as string

  // Support token from query param (for window.open) or Authorization header
  const queryToken = c.req.query('token')
  const authHeader = c.req.header('Authorization')
  const rawToken = queryToken ?? authHeader?.replace('Bearer ', '')

  if (!rawToken) return c.html('<p>Unauthorized</p>', 401)

  let caller
  try {
    caller = await verifyToken(rawToken)
  } catch {
    return c.html('<p>Token tidak valid atau sudah expired. Silakan login ulang.</p>', 401)
  }

  const allowed = await StudentService.canAccess(caller, studentId)
  if (!allowed) return c.html('<p>Akses ditolak</p>', 403)

  try {
    const html = await ReportService.generateStudentReport(studentId)
    return c.html(html)
  } catch (e) {
    return c.html(`<p>Error: ${(e as Error).message}</p>`, 404)
  }
})

export default router
