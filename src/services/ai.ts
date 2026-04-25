import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' })

function parseJson<T>(text: string, fallback: T): T {
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    return JSON.parse(cleaned) as T
  } catch {
    return fallback
  }
}

async function chat(prompt: string): Promise<string> {
  const res = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  })
  return res.choices[0]?.message?.content ?? ''
}

export type CompiledJournal = {
  title: string
  activityCompiled: string
  newThings: string
  obstacle: string
  solution: string
  rtl: string
}

export async function compileJournalEntry(params: {
  activityRaw: string
  major: string
}): Promise<CompiledJournal> {
  const { activityRaw, major } = params
  const prompt = `Kamu adalah asisten jurnal PKL SMK. Ubah catatan harian berikut menjadi entri jurnal formal dalam Bahasa Indonesia yang baik dan benar.

Jurusan siswa: ${major}
Catatan mentah siswa:
"${activityRaw}"

Hasilkan JSON dengan format berikut (tanpa markdown code block):
{
  "title": "judul singkat tema kegiatan hari ini (maksimal 8 kata, tanpa tanda kutip)",
  "activityCompiled": "deskripsi kegiatan yang sudah dirapikan dan diformalkan (2-3 paragraf)",
  "newThings": "hal baru yang dipelajari hari ini",
  "obstacle": "kendala yang dihadapi (atau 'Tidak ada kendala berarti' jika tidak ada)",
  "solution": "solusi yang diambil untuk mengatasi kendala",
  "rtl": "rencana tindak lanjut untuk hari berikutnya"
}`

  const text = await chat(prompt)
  return parseJson<CompiledJournal>(text, {
    title: '',
    activityCompiled: activityRaw,
    newThings: '',
    obstacle: '',
    solution: '',
    rtl: '',
  })
}

export type EvaluationResult = {
  score: number
  analysis: string
  recommendation: 'lanjut' | 'perhatikan' | 'pindah'
  competencyScores: Record<string, number>
}

export async function evaluatePKLCompetency(params: {
  studentName: string
  major: string
  journals: { date: string; title: string; activityRaw: string; activityCompiled: string | null }[]
  guidelines: { competencies: { name: string; indicators: string[]; weight: number }[]; keywords: string[] | null } | undefined
}): Promise<EvaluationResult> {
  const { studentName, major, journals, guidelines } = params
  const journalSummary = journals
    .slice(-30)
    .map((j, i) => `${i + 1}. [${j.date}] ${j.title}: ${j.activityCompiled ?? j.activityRaw}`)
    .join('\n')

  const guidelineText = guidelines
    ? guidelines.competencies.map(c => `- ${c.name} (bobot ${c.weight}%): ${c.indicators.join(', ')}`).join('\n')
    : 'Tidak ada guideline tersedia'

  const prompt = `Evaluasi kesesuaian PKL siswa berikut dengan jurusan/kompetensinya.

Siswa: ${studentName}
Jurusan: ${major}

Guideline Kompetensi:
${guidelineText}

Jurnal 30 hari terakhir:
${journalSummary}

Hasilkan JSON evaluasi (tanpa markdown code block):
{
  "score": <angka 0-100>,
  "analysis": "analisis naratif 2-3 paragraf",
  "recommendation": "<lanjut|perhatikan|pindah>",
  "competencyScores": { "<nama_kompetensi>": <skor 0-100> }
}`

  const text = await chat(prompt)
  return parseJson<EvaluationResult>(text, {
    score: 0,
    analysis: 'Evaluasi gagal diproses.',
    recommendation: 'perhatikan',
    competencyScores: {},
  })
}

export async function generateWeeklyRecap(params: {
  studentName: string
  journals: { date: string; title: string; activityCompiled: string | null; activityRaw: string }[]
}): Promise<string> {
  const { studentName, journals } = params
  const entries = journals.map(j => `[${j.date}] ${j.title}: ${j.activityCompiled ?? j.activityRaw}`).join('\n')
  const prompt = `Buat rekap mingguan jurnal PKL untuk siswa ${studentName} dalam Bahasa Indonesia formal.

Jurnal minggu ini:
${entries}

Hasilkan ringkasan naratif 1-2 paragraf yang merangkum kegiatan minggu ini, pencapaian, dan hal-hal yang perlu diperhatikan.`

  return chat(prompt)
}
