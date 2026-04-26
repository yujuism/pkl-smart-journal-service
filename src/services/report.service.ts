import { eq, desc, and } from 'drizzle-orm'
import { db } from '../db/index.ts'
import {
  students, users, majors, pklPlacements, companies,
  journals, feedbacks, aiEvaluations,
} from '../db/schema/index.ts'
import { generatePKLNarrativeReport } from './ai.ts'

export const ReportService = {
  async generateStudentReport(studentId: string): Promise<string> {
    // ── Student info ──────────────────────────────────────────────────
    const [student] = await db.select({
      name: users.name,
      nis: students.nis,
      class: students.class,
      major: majors.name,
      email: users.email,
      phone: users.phone,
    }).from(students)
      .innerJoin(users, eq(students.userId, users.id))
      .innerJoin(majors, eq(students.majorId, majors.id))
      .where(eq(students.id, studentId))
      .limit(1)

    if (!student) throw new Error('Student not found')

    // ── Active placement ──────────────────────────────────────────────
    const [placement] = await db.select({
      companyName: companies.name,
      companyAddress: companies.address,
      startDate: pklPlacements.startDate,
      endDate: pklPlacements.endDate,
      teacherName: users.name,
    }).from(pklPlacements)
      .innerJoin(companies, eq(pklPlacements.companyId, companies.id))
      .innerJoin(users, eq(pklPlacements.teacherId, users.id))
      .where(and(eq(pklPlacements.studentId, studentId), eq(pklPlacements.status, 'active')))
      .limit(1)

    // ── Journals ──────────────────────────────────────────────────────
    const journalRows = await db.select({
      id: journals.id,
      date: journals.date,
      title: journals.title,
      activityCompiled: journals.activityCompiled,
      activityRaw: journals.activityRaw,
      newThings: journals.newThings,
      obstacle: journals.obstacle,
      solution: journals.solution,
      rtl: journals.rtl,
      finalizedAt: journals.finalizedAt,
    }).from(journals)
      .where(eq(journals.studentId, studentId))
      .orderBy(journals.date)

    // ── Latest evaluation ─────────────────────────────────────────────
    const [latestEval] = await db.select().from(aiEvaluations)
      .where(eq(aiEvaluations.studentId, studentId))
      .orderBy(desc(aiEvaluations.createdAt))
      .limit(1)

    // ── Generate AI narrative ─────────────────────────────────────────
    const narrative = await generatePKLNarrativeReport({
      studentName: student.name,
      major: student.major,
      companyName: placement?.companyName ?? 'Tidak diketahui',
      periodStart: placement?.startDate ?? journalRows[0]?.date ?? '',
      periodEnd: placement?.endDate ?? journalRows[journalRows.length - 1]?.date ?? '',
      journals: journalRows,
      evaluationScore: latestEval?.score ?? undefined,
      evaluationAnalysis: latestEval?.analysis ?? undefined,
      competencyScores: (latestEval?.competencyScores as Record<string, number>) ?? undefined,
    })

    const generatedAt = new Date().toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })

    const totalJournals = journalRows.length
    const finalizedJournals = journalRows.filter(j => j.finalizedAt).length

    // ── Competency scores section ─────────────────────────────────────
    const competencySection = latestEval?.competencyScores && Object.keys(latestEval.competencyScores).length > 0
      ? `<div class="competency-grid">
          ${Object.entries(latestEval.competencyScores as Record<string, number>)
            .sort(([,a],[,b]) => b - a)
            .map(([name, score]) => `
              <div class="competency-item">
                <div class="comp-header">
                  <span>${esc(name)}</span>
                  <strong class="${score >= 75 ? 'good' : score >= 50 ? 'mid' : 'bad'}">${score}</strong>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill ${score >= 75 ? 'fill-good' : score >= 50 ? 'fill-mid' : 'fill-bad'}" style="width:${Math.min(score,100)}%"></div>
                </div>
              </div>
            `).join('')}
        </div>`
      : ''

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <title>Laporan PKL — ${esc(student.name)}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1a1a2e;background:#f8f9fa;line-height:1.7}

    /* Print bar */
    .print-bar{background:#1F4E79;padding:12px 40px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10}
    .print-bar p{color:rgba(255,255,255,0.7);font-size:12px}
    .print-btn{background:white;color:#1F4E79;border:none;padding:8px 20px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px}
    .print-btn:hover{background:#e8f0fe}

    /* Cover */
    .cover{background:linear-gradient(135deg,#1F4E79 0%,#2980b9 100%);color:white;padding:48px 40px 40px}
    .cover-badge{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:.65;margin-bottom:10px}
    .cover-name{font-size:32px;font-weight:900;line-height:1.1;margin-bottom:6px}
    .cover-sub{font-size:15px;opacity:.8;margin-bottom:28px}
    .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .meta-item{background:rgba(255,255,255,.12);border-radius:10px;padding:12px 16px}
    .meta-item label{font-size:10px;text-transform:uppercase;letter-spacing:1px;opacity:.6;display:block;margin-bottom:3px}
    .meta-item span{font-size:13px;font-weight:600}
    .cover-gen{margin-top:20px;font-size:11px;opacity:.5}

    /* Stats */
    .stats{display:grid;grid-template-columns:repeat(4,1fr);background:white;border-bottom:2px solid #f0f0f0}
    .stat{text-align:center;padding:18px;border-right:1px solid #f0f0f0}
    .stat:last-child{border-right:none}
    .stat-num{font-size:28px;font-weight:900;color:#1F4E79;line-height:1}
    .stat-lbl{font-size:11px;color:#888;margin-top:3px}

    /* Main content */
    .content{max-width:900px;margin:0 auto;padding:32px 20px}

    /* Cards */
    .card{background:white;border-radius:14px;padding:28px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
    .card-title{font-size:15px;font-weight:800;color:#1F4E79;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #e8f0fe;display:flex;align-items:center;gap:8px}
    .card-title .icon{width:28px;height:28px;background:#e8f0fe;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:14px}

    /* Eval card */
    .eval-row{display:flex;align-items:center;gap:20px;background:#f8f9ff;border-radius:12px;padding:18px;margin-bottom:16px}
    .score-big{text-align:center;min-width:80px}
    .score-big .num{font-size:52px;font-weight:900;line-height:1;display:block}
    .score-big .den{font-size:12px;color:#999}
    .good{color:#16a34a}.mid{color:#d97706}.bad{color:#dc2626}
    .badge{display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700}
    .badge-lanjut{background:#dcfce7;color:#16a34a}
    .badge-perhatikan{background:#fef3c7;color:#d97706}
    .badge-pindah{background:#fee2e2;color:#dc2626}

    /* Competency */
    .competency-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .competency-item{background:#fafafa;border-radius:8px;padding:10px 12px}
    .comp-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;font-size:12px}
    .progress-bar{background:#e5e7eb;border-radius:99px;height:6px}
    .progress-fill{height:6px;border-radius:99px}
    .fill-good{background:#16a34a}.fill-mid{background:#d97706}.fill-bad{background:#dc2626}

    /* Narrative */
    .narrative p{color:#374151;line-height:1.8;margin-bottom:14px;font-size:14px}
    .narrative p:last-child{margin-bottom:0}

    /* Lists */
    .item-list{display:flex;flex-direction:column;gap:10px}
    .item-card{background:#fafafa;border-radius:10px;padding:14px 16px;border-left:4px solid #1F4E79}
    .item-card.kendala{border-left-color:#ef4444}
    .item-card.rekomendasi{border-left-color:#8b5cf6}
    .item-card.pencapaian{border-left-color:#10b981}
    .item-card h4{font-size:13px;font-weight:700;color:#1a1a2e;margin-bottom:4px}
    .item-card p{font-size:12px;color:#6b7280;line-height:1.5}
    .item-card .tag{display:inline-block;font-size:10px;font-weight:700;padding:1px 7px;border-radius:99px;margin-bottom:6px}
    .tag-sekali{background:#fef3c7;color:#d97706}
    .tag-beberapa{background:#fee2e2;color:#ef4444}
    .tag-berulang{background:#fecaca;color:#dc2626}
    .pencapaian-list{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .pencapaian-item{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 12px;font-size:12px;color:#166534;display:flex;align-items:flex-start;gap:8px}
    .pencapaian-item::before{content:'✓';font-weight:900;color:#16a34a;flex-shrink:0}

    /* Kesimpulan */
    .kesimpulan{background:linear-gradient(135deg,#1F4E79,#2980b9);color:white;border-radius:14px;padding:24px 28px}
    .kesimpulan h3{font-size:15px;font-weight:800;margin-bottom:12px;opacity:.85;text-transform:uppercase;letter-spacing:1px}
    .kesimpulan p{font-size:14px;line-height:1.8;opacity:.92}

    @media print{
      body{background:white}
      .print-bar,.no-print{display:none}
      .card{box-shadow:none;border:1px solid #e5e7eb}
      .content{padding:0}
      .card{break-inside:avoid}
    }
  </style>
</head>
<body>

<div class="print-bar no-print">
  <p>Laporan PKL — ${esc(student.name)} · Ctrl+P / Cmd+P → Simpan sebagai PDF → Upload ke NotebookLM</p>
  <button class="print-btn" onclick="window.print()">
    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
    </svg>
    Cetak / Simpan PDF
  </button>
</div>

<div class="cover">
  <div class="cover-badge">Laporan Naratif Praktik Kerja Lapangan</div>
  <div class="cover-name">${esc(student.name)}</div>
  <div class="cover-sub">${esc(student.major)} · ${esc(student.class)}</div>
  <div class="meta-grid">
    <div class="meta-item"><label>NIS</label><span>${esc(student.nis)}</span></div>
    ${placement ? `
    <div class="meta-item"><label>Tempat PKL</label><span>${esc(placement.companyName)}</span></div>
    <div class="meta-item"><label>Periode</label><span>${formatDate(placement.startDate ?? '')} – ${formatDate(placement.endDate ?? '')}</span></div>
    <div class="meta-item"><label>Guru Pembimbing</label><span>${esc(placement.teacherName)}</span></div>
    ` : ''}
  </div>
  <div class="cover-gen">Laporan dibuat otomatis oleh AI pada ${generatedAt}</div>
</div>

<div class="stats">
  <div class="stat"><div class="stat-num">${totalJournals}</div><div class="stat-lbl">Total Jurnal</div></div>
  <div class="stat"><div class="stat-num">${finalizedJournals}</div><div class="stat-lbl">Jurnal Finalized</div></div>
  <div class="stat"><div class="stat-num">${latestEval?.score?.toFixed(0) ?? '–'}</div><div class="stat-lbl">Skor Evaluasi AI</div></div>
  <div class="stat"><div class="stat-num">${narrative.pencapaianMenonjol.length}</div><div class="stat-lbl">Pencapaian Menonjol</div></div>
</div>

<div class="content">

  <!-- Ringkasan Naratif -->
  <div class="card">
    <div class="card-title"><span class="icon">📖</span> Ringkasan Perjalanan PKL</div>
    <div class="narrative">
      ${narrative.ringkasan.split('\n').filter(p => p.trim()).map(p => `<p>${esc(p)}</p>`).join('')}
    </div>
  </div>

  <!-- Evaluasi AI -->
  ${latestEval ? `
  <div class="card">
    <div class="card-title"><span class="icon">🤖</span> Hasil Evaluasi AI</div>
    <div class="eval-row">
      <div class="score-big">
        <span class="num ${latestEval.score && latestEval.score >= 75 ? 'good' : latestEval.score && latestEval.score >= 50 ? 'mid' : 'bad'}">${latestEval.score?.toFixed(0) ?? '–'}</span>
        <span class="den">/ 100</span>
      </div>
      <div>
        <p style="font-size:13px;margin-bottom:6px"><strong>Rekomendasi:</strong> <span class="badge badge-${latestEval.recommendation}">${recoLabel(latestEval.recommendation ?? '')}</span></p>
        <p style="font-size:13px;color:#555;line-height:1.6">${esc(latestEval.analysis ?? '')}</p>
      </div>
    </div>
    ${competencySection}
  </div>
  ` : ''}

  <!-- Kompetensi yang Dikuasai -->
  ${narrative.kompetensiDikuasai.length > 0 ? `
  <div class="card">
    <div class="card-title"><span class="icon">💡</span> Kompetensi yang Dikuasai</div>
    <div class="item-list">
      ${narrative.kompetensiDikuasai.map(k => `
        <div class="item-card">
          <h4>${esc(k.nama)}</h4>
          <p>${esc(k.deskripsi)}</p>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <!-- Pencapaian Menonjol -->
  ${narrative.pencapaianMenonjol.length > 0 ? `
  <div class="card">
    <div class="card-title"><span class="icon">🏆</span> Pencapaian Menonjol</div>
    <div class="pencapaian-list">
      ${narrative.pencapaianMenonjol.map(p => `<div class="pencapaian-item">${esc(p)}</div>`).join('')}
    </div>
  </div>
  ` : ''}

  <!-- Kendala & Solusi -->
  ${narrative.kendalaUtama.length > 0 ? `
  <div class="card">
    <div class="card-title"><span class="icon">⚠️</span> Kendala & Solusi</div>
    <div class="item-list">
      ${narrative.kendalaUtama.map(k => `
        <div class="item-card kendala">
          <span class="tag ${k.frekuensi?.includes('berulang') ? 'tag-berulang' : k.frekuensi?.includes('beberapa') ? 'tag-beberapa' : 'tag-sekali'}">${esc(k.frekuensi)}</span>
          <h4>${esc(k.kendala)}</h4>
          <p><strong>Solusi:</strong> ${esc(k.solusi)}</p>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <!-- Rekomendasi Pengembangan -->
  ${narrative.rekomendasiPengembangan.length > 0 ? `
  <div class="card">
    <div class="card-title"><span class="icon">🎯</span> Rekomendasi Pengembangan</div>
    <div class="item-list">
      ${narrative.rekomendasiPengembangan.map((r, i) => `
        <div class="item-card rekomendasi">
          <h4>Rekomendasi ${i + 1}</h4>
          <p>${esc(r)}</p>
        </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <!-- Kesimpulan -->
  ${narrative.kesimpulan ? `
  <div class="kesimpulan">
    <h3>Kesimpulan</h3>
    ${narrative.kesimpulan.split('\n').filter(p => p.trim()).map(p => `<p>${esc(p)}</p>`).join('')}
  </div>
  ` : ''}

</div>
</body>
</html>`
  }
}

function esc(str: string | null | undefined): string {
  if (!str) return ''
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '–'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

function recoLabel(r: string): string {
  if (r === 'lanjut') return 'Lanjutkan'
  if (r === 'perhatikan') return 'Perlu Perhatian'
  if (r === 'pindah') return 'Tindakan Diperlukan'
  return r
}
