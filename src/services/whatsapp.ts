import { db } from '../db/index.ts'
import { whatsappLogs, pklPlacements, users, feedbacks, journals } from '../db/schema/index.ts'
import { eq, and } from 'drizzle-orm'

const WAHA_URL = process.env.WAHA_URL ?? 'https://waha.cloudsynth.site'
const WAHA_API_KEY = process.env.WAHA_API_KEY ?? ''
const WAHA_SESSION = process.env.WAHA_SESSION ?? 'default'

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^0/, '62')
}

async function sendWA(phone: string, message: string): Promise<string | null> {
  if (!WAHA_API_KEY) {
    console.log('[WA MOCK]', phone, ':', message)
    return null
  }
  const chatId = `${normalizePhone(phone)}@c.us`
  try {
    const res = await fetch(`${WAHA_URL}/api/sendText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': WAHA_API_KEY,
      },
      body: JSON.stringify({ session: WAHA_SESSION, chatId, text: message }),
    })
    const data = await res.json() as { id?: { id?: string } }
    return data?.id?.id ?? null
  } catch (e) {
    console.error('[WA] Send failed:', (e as Error).message)
    return null
  }
}

export async function notifyJournalSaved(params: {
  studentName: string
  date: string
  title: string
  journalId: string
  teacherPhone?: string | null
  teacherId?: string | null
  industryPhone?: string | null
  industrySupervisorId?: string | null
  parentPhone?: string | null
  parentId?: string | null
}): Promise<void> {
  const { studentName, date, title, journalId, teacherPhone, teacherId, industryPhone, industrySupervisorId, parentPhone, parentId } = params

  const msg = `*Jurnal PKL Baru*\n\nSiswa: ${studentName}\nTanggal: ${date}\nKegiatan: ${title}\n\n_Balas pesan ini untuk memberi feedback_`

  const recipients: { phone: string; role: string; userId: string | null }[] = []
  if (teacherPhone) recipients.push({ phone: teacherPhone, role: 'teacher', userId: teacherId ?? null })
  if (industryPhone) recipients.push({ phone: industryPhone, role: 'industry', userId: industrySupervisorId ?? null })
  if (parentPhone) recipients.push({ phone: parentPhone, role: 'parent', userId: parentId ?? null })

  await Promise.all(recipients.map(async ({ phone, role, userId }) => {
    const waMessageId = await sendWA(phone, msg)
    // Simpan ke whatsapp_logs dengan messageId agar bisa di-lookup waktu reply
    await db.insert(whatsappLogs).values({
      journalId,
      recipientPhone: normalizePhone(phone),
      recipientRole: role,
      messageType: 'notification',
      status: waMessageId ? 'sent' : 'failed',
      waMessageId: waMessageId ?? null,
    })
  }))
}

export async function sendWeeklyRecap(params: {
  recipientPhone: string
  studentName: string
  recap: string
}): Promise<void> {
  const { recipientPhone, studentName, recap } = params
  const msg = `*Rekap Mingguan PKL*\n\nSiswa: ${studentName}\n\n${recap}`
  await sendWA(recipientPhone, msg)
}

// Dipanggil dari webhook handler
export async function handleIncomingReply(params: {
  fromPhone: string
  body: string
  quotedMessageId: string | null
}): Promise<{ success: boolean; message: string }> {
  const { fromPhone, body, quotedMessageId } = params

  if (!quotedMessageId) {
    return { success: false, message: 'Bukan reply ke pesan jurnal' }
  }

  // Lookup whatsapp_logs berdasarkan waMessageId yang di-reply
  const [log] = await db.select().from(whatsappLogs)
    .where(eq(whatsappLogs.waMessageId, quotedMessageId))
    .limit(1)

  if (!log || !log.journalId) {
    return { success: false, message: 'Pesan yang di-reply tidak terkait jurnal' }
  }

  // Cari user berdasarkan nomor HP pengirim — coba semua format
  const normalizedFrom = normalizePhone(fromPhone) // 628xxx
  const withZero = '0' + normalizedFrom.slice(2)   // 08xxx

  const allUsers = await db.select().from(users)
  const reviewer = allUsers.find(u => {
    if (!u.phone) return false
    const p = u.phone.replace(/\D/g, '')
    const p62 = p.startsWith('0') ? '62' + p.slice(1) : p
    return p62 === normalizedFrom || p === withZero || p === normalizedFrom
  }) ?? null
  if (!reviewer) {
    return { success: false, message: `User dengan nomor ${normalizedFrom} tidak ditemukan` }
  }

  // Simpan feedback
  await db.insert(feedbacks).values({
    journalId: log.journalId,
    reviewerId: reviewer.id,
    reviewerRole: log.recipientRole,
    content: body.trim(),
    source: 'whatsapp',
  })

  console.log(`[WA] Feedback saved: journal=${log.journalId} from=${reviewer.name} (${log.recipientRole})`)
  return { success: true, message: 'Feedback berhasil disimpan' }
}
