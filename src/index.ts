import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import { JournalService } from './services/journal.service.ts'
import authRoutes from './routes/auth.ts'
import journalRoutes from './routes/journals.ts'
import feedbackRoutes from './routes/feedbacks.ts'
import studentRoutes from './routes/students.ts'
import evaluationRoutes from './routes/evaluations.ts'
import guidelineRoutes from './routes/guidelines.ts'
import placementRoutes from './routes/placements.ts'
import userRoutes from './routes/users.ts'
import roleRoutes from './routes/roles.ts'
import majorRoutes from './routes/majors.ts'
import companyRoutes from './routes/companies.ts'
import reportRoutes from './routes/reports.ts'
import webhookRoutes from './routes/webhooks.ts'

const app = new Hono()

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      process.env.STUDENT_APP_URL ?? '',
      process.env.TEACHER_PORTAL_URL ?? '',
    ].filter(Boolean),
    credentials: true,
  }),
)

app.get('/', (c) =>
  c.json({ status: 'PKL Smart Journal API', version: '1.0.0' }),
)

app.route('/api/auth', authRoutes)
app.route('/api/journals', journalRoutes)
app.route('/api/feedbacks', feedbackRoutes)
app.route('/api/students', studentRoutes)
app.route('/api/evaluations', evaluationRoutes)
app.route('/api/guidelines', guidelineRoutes)
app.route('/api/placements', placementRoutes)
app.route('/api/users', userRoutes)
app.route('/api/roles', roleRoutes)
app.route('/api/majors', majorRoutes)
app.route('/api/companies', companyRoutes)
app.route('/api/reports', reportRoutes)
app.route('/api/webhooks', webhookRoutes)

app.onError((err, c) => {
  console.error(err)
  return c.json(
    { error: (err as Error).message ?? 'Internal server error' },
    500,
  )
})

const port = parseInt(process.env.PORT ?? '3000')

export default {
  port,
  fetch: app.fetch,
}

console.log(`PKL Smart Journal API running on http://localhost:${port}`)

// Cron: tiap menit auto-finalize jurnal yang sudah >5 menit tidak diubah
setInterval(() => {
  JournalService.autoFinalizePending().catch(e => console.error('Cron error:', e))
}, 60 * 1000)
