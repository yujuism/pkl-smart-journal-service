const FONNTE_URL = 'https://api.fonnte.com/send'
const token = process.env.FONNTE_API_KEY ?? ''

async function sendWA(phone: string, message: string): Promise<{ status: boolean; id?: string }> {
  if (!token) {
    console.log('[WA MOCK]', phone, ':', message)
    return { status: true, id: `mock-${Date.now()}` }
  }
  const res = await fetch(FONNTE_URL, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ target: phone, message }),
  })
  return res.json() as Promise<{ status: boolean; id?: string }>
}

export async function notifyJournalSaved(params: {
  studentName: string
  date: string
  title: string
  teacherPhone?: string | null
  industryPhone?: string | null
  parentPhone?: string | null
}): Promise<void> {
  const { studentName, date, title, teacherPhone, industryPhone, parentPhone } = params
  const msg = `*Jurnal PKL Baru*\n\nSiswa: ${studentName}\nTanggal: ${date}\nKegiatan: ${title}\n\n_Balas pesan ini untuk memberi feedback (akan tersimpan otomatis)_`
  const recipients = [teacherPhone, industryPhone, parentPhone].filter((p): p is string => Boolean(p))
  await Promise.all(recipients.map(phone => sendWA(phone, msg)))
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
