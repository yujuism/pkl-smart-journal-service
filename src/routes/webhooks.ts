import { Hono } from 'hono'
import { handleIncomingReply } from '../services/whatsapp.ts'
import type { AppEnv } from '../types.ts'

const router = new Hono<AppEnv>()

router.post('/whatsapp', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ received: true })

  const { event, payload } = body

  // Hanya proses event message yang bukan dari kita sendiri
  if (event !== 'message' || !payload || payload.fromMe) {
    return c.json({ received: true })
  }

  const fromPhone: string = payload.from?.replace('@c.us', '').replace('@lid', '') ?? ''
  const msgBody: string = payload.body ?? ''
  const quotedMessageId: string | null = payload._data?.quotedStanzaID ?? null

  console.log(`[WA] Incoming: from=${fromPhone} quoted=${quotedMessageId} body="${msgBody}"`)

  if (!msgBody.trim()) return c.json({ received: true })

  const result = await handleIncomingReply({
    fromPhone,
    body: msgBody,
    quotedMessageId,
  })

  console.log('[WA] Result:', result.message)
  return c.json({ received: true })
})

export default router
