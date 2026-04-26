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
  analysis: string  // kept for backward compat
  ringkasanKegiatan: string
  kompetensiDikuasai: string
  perkembangan: string
  kendalaAdaptasi: string
  kesiapanKerja: string
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

  const prompt = `Kamu adalah evaluator PKL SMK yang berpengalaman. Baca semua jurnal siswa dan buat evaluasi terstruktur.

Siswa: ${studentName}
Jurusan: ${major}

Guideline Kompetensi:
${guidelineText}

Jurnal kegiatan:
${journalSummary}

Hasilkan JSON evaluasi (tanpa markdown code block). Setiap field harus diisi dengan narasi informatif 2-4 kalimat — BUKAN poin-poin, BUKAN singkat, tapi kalimat lengkap seperti laporan profesional:
{
  "score": <angka 0-100>,
  "ringkasanKegiatan": "Gambaran umum apa saja yang dikerjakan siswa selama PKL — aktivitas utama, divisi/area kerja, jenis tugas yang diterima",
  "kompetensiDikuasai": "Kompetensi teknis spesifik yang berhasil dikuasai siswa beserta contoh konkret dari jurnal — alat/prosedur/teknik apa yang dikuasai",
  "perkembangan": "Bagaimana perkembangan siswa dari awal hingga akhir periode — apakah semakin mandiri, percaya diri, inisiatif meningkat, dsb",
  "kendalaAdaptasi": "Kendala-kendala yang dihadapi siswa dan bagaimana cara mengatasinya — apakah siswa mampu beradaptasi dan problem solving dengan baik",
  "kesiapanKerja": "Penilaian kesiapan siswa untuk dunia kerja — aspek teknis, sikap profesional, dan potensi karir di bidang ini",
  "recommendation": "<lanjut|perhatikan|pindah>",
  "competencyScores": { "<nama_kompetensi_sesuai_guideline>": <skor 0-100> }
}`

  const text = await chat(prompt)
  const parsed = parseJson<EvaluationResult>(text, {
    score: 0,
    analysis: 'Evaluasi gagal diproses.',
    ringkasanKegiatan: '',
    kompetensiDikuasai: '',
    perkembangan: '',
    kendalaAdaptasi: '',
    kesiapanKerja: '',
    recommendation: 'perhatikan',
    competencyScores: {},
  })
  // backward compat: gabung semua jadi analysis juga
  parsed.analysis = [parsed.ringkasanKegiatan, parsed.kompetensiDikuasai, parsed.perkembangan, parsed.kendalaAdaptasi, parsed.kesiapanKerja].filter(Boolean).join('\n\n')
  return parsed
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

export type PKLNarrativeReport = {
  ringkasan: string           // 2-3 paragraf narasi keseluruhan
  kompetensiDikuasai: { nama: string; deskripsi: string }[]
  kendalaUtama: { kendala: string; solusi: string; frekuensi: string }[]
  pencapaianMenonjol: string[]
  rekomendasiPengembangan: string[]
  kesimpulan: string
}

export async function generatePKLNarrativeReport(params: {
  studentName: string
  major: string
  companyName: string
  periodStart: string
  periodEnd: string
  journals: { date: string; title: string; activityCompiled: string | null; activityRaw: string; newThings: string | null; obstacle: string | null; solution: string | null }[]
  evaluationScore?: number
  evaluationAnalysis?: string
  competencyScores?: Record<string, number>
}): Promise<PKLNarrativeReport> {
  const { studentName, major, companyName, periodStart, periodEnd, journals, evaluationScore, evaluationAnalysis, competencyScores } = params

  // Kompres jurnal jadi ringkas agar tidak buang token
  const journalText = journals.map(j =>
    `[${j.date}] ${j.title}\n` +
    `  Kegiatan: ${j.activityCompiled ?? j.activityRaw}\n` +
    (j.newThings ? `  Hal baru: ${j.newThings}\n` : '') +
    (j.obstacle ? `  Kendala: ${j.obstacle}\n` : '') +
    (j.solution ? `  Solusi: ${j.solution}` : '')
  ).join('\n\n')

  const evalText = evaluationScore != null
    ? `\nHasil Evaluasi AI: ${evaluationScore}/100\n${evaluationAnalysis ?? ''}\n` +
      (competencyScores ? 'Skor kompetensi: ' + Object.entries(competencyScores).map(([k,v]) => `${k}: ${v}`).join(', ') : '')
    : ''

  const prompt = `Kamu adalah asisten pendidikan SMK yang menulis laporan naratif PKL (Praktik Kerja Lapangan).

Data siswa:
- Nama: ${studentName}
- Jurusan: ${major}
- Tempat PKL: ${companyName}
- Periode: ${periodStart} s/d ${periodEnd}
- Total jurnal: ${journals.length} hari
${evalText}

Seluruh jurnal kegiatan:
${journalText}

Tugas kamu: Baca semua jurnal di atas, lalu buat laporan naratif komprehensif. Jangan hanya menyebut tanggal atau mengulang jurnal satu per satu. Tulis seperti laporan profesional yang menceritakan perjalanan belajar siswa secara keseluruhan.

Hasilkan JSON (tanpa markdown code block):
{
  "ringkasan": "3-4 paragraf narasi perjalanan PKL secara keseluruhan — ceritakan apa yang siswa lakukan, bagaimana perkembangannya dari awal hingga akhir, dan gambaran umum kompetensi yang dibangun",
  "kompetensiDikuasai": [
    { "nama": "nama kompetensi/skill", "deskripsi": "penjelasan konkret bagaimana siswa menguasai ini berdasarkan jurnal" }
  ],
  "kendalaUtama": [
    { "kendala": "deskripsi kendala", "solusi": "solusi yang diambil", "frekuensi": "sekali/beberapa kali/berulang" }
  ],
  "pencapaianMenonjol": ["pencapaian 1", "pencapaian 2", ...],
  "rekomendasiPengembangan": ["rekomendasi 1", "rekomendasi 2", ...],
  "kesimpulan": "1-2 paragraf kesimpulan akhir tentang kesiapan siswa dan potensi karir"
}`

  const text = await chat(prompt)
  return parseJson<PKLNarrativeReport>(text, {
    ringkasan: 'Laporan gagal dibuat.',
    kompetensiDikuasai: [],
    kendalaUtama: [],
    pencapaianMenonjol: [],
    rekomendasiPengembangan: [],
    kesimpulan: '',
  })
}
