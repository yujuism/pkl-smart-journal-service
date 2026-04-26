import { eq, desc, and } from 'drizzle-orm'
import { db } from '../db/index.ts'
import {
  students, users, majors, pklPlacements, companies,
  journals, feedbacks, aiEvaluations,
} from '../db/schema/index.ts'

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
      companyPhone: companies.phone,
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

    // ── Feedbacks per journal ─────────────────────────────────────────
    const journalIds = journalRows.map(j => j.id)
    let feedbackRows: { journalId: string; content: string; reviewerRole: string; reviewerName: string | null; createdAt: Date | null }[] = []
    if (journalIds.length > 0) {
      feedbackRows = await db.select({
        journalId: feedbacks.journalId,
        content: feedbacks.content,
        reviewerRole: feedbacks.reviewerRole,
        reviewerName: users.name,
        createdAt: feedbacks.createdAt,
      }).from(feedbacks)
        .leftJoin(users, eq(feedbacks.reviewerId, users.id))
        .where(eq(feedbacks.journalId, journalRows[0].id))
    }

    // Fetch all feedbacks in one query
    const allFeedbacks: typeof feedbackRows = []
    for (const jId of journalIds) {
      const rows = await db.select({
        journalId: feedbacks.journalId,
        content: feedbacks.content,
        reviewerRole: feedbacks.reviewerRole,
        reviewerName: users.name,
        createdAt: feedbacks.createdAt,
      }).from(feedbacks)
        .leftJoin(users, eq(feedbacks.reviewerId, users.id))
        .where(eq(feedbacks.journalId, jId))
      allFeedbacks.push(...rows)
    }
    const feedbackByJournal = new Map<string, typeof allFeedbacks>()
    for (const fb of allFeedbacks) {
      if (!feedbackByJournal.has(fb.journalId)) feedbackByJournal.set(fb.journalId, [])
      feedbackByJournal.get(fb.journalId)!.push(fb)
    }

    // ── Latest evaluation ─────────────────────────────────────────────
    const [latestEval] = await db.select().from(aiEvaluations)
      .where(eq(aiEvaluations.studentId, studentId))
      .orderBy(desc(aiEvaluations.createdAt))
      .limit(1)

    // ── Aggregate stats ───────────────────────────────────────────────
    const totalJournals = journalRows.length
    const finalizedJournals = journalRows.filter(j => j.finalizedAt).length
    const totalFeedbacks = allFeedbacks.length

    // Unique obstacles & new things
    const obstacles = journalRows
      .filter(j => j.obstacle)
      .map(j => ({ date: j.date, text: j.obstacle! }))
    const newThings = journalRows
      .filter(j => j.newThings)
      .map(j => ({ date: j.date, text: j.newThings! }))

    const generatedAt = new Date().toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })

    // ── Build HTML ────────────────────────────────────────────────────
    const evalSection = latestEval ? `
      <section class="eval-section">
        <h2>Hasil Evaluasi AI Terbaru</h2>
        <div class="eval-card">
          <div class="eval-score ${latestEval.score && latestEval.score >= 75 ? 'score-good' : latestEval.score && latestEval.score >= 50 ? 'score-mid' : 'score-bad'}">
            <span class="score-num">${latestEval.score?.toFixed(0) ?? '–'}</span>
            <span class="score-denom">/ 100</span>
          </div>
          <div class="eval-meta">
            <p><strong>Periode:</strong> ${formatDate(latestEval.periodStart ?? '')} – ${formatDate(latestEval.periodEnd ?? '')}</p>
            <p><strong>Rekomendasi:</strong> <span class="badge badge-${latestEval.recommendation}">${recoLabel(latestEval.recommendation ?? '')}</span></p>
            ${latestEval.companyName ? `<p><strong>Perusahaan:</strong> ${esc(latestEval.companyName)}</p>` : ''}
            <p><strong>Tanggal Evaluasi:</strong> ${new Date(latestEval.createdAt ?? '').toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        ${latestEval.analysis ? `<div class="analysis-box"><h4>Analisis AI</h4><p>${esc(latestEval.analysis)}</p></div>` : ''}
        ${latestEval.competencyScores && Object.keys(latestEval.competencyScores).length > 0 ? `
          <h4>Skor per Kompetensi</h4>
          <div class="competency-grid">
            ${Object.entries(latestEval.competencyScores as Record<string, number>)
              .sort(([,a],[,b]) => b - a)
              .map(([name, score]) => `
                <div class="competency-item">
                  <div class="competency-header">
                    <span>${esc(name)}</span>
                    <strong class="${score >= 75 ? 'score-good' : score >= 50 ? 'score-mid' : 'score-bad'}">${score}</strong>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill ${score >= 75 ? 'fill-good' : score >= 50 ? 'fill-mid' : 'fill-bad'}" style="width:${Math.min(score, 100)}%"></div>
                  </div>
                </div>
              `).join('')}
          </div>
        ` : ''}
      </section>
    ` : ''

    const journalSection = journalRows.map(j => {
      const jFeedbacks = feedbackByJournal.get(j.id) ?? []
      return `
        <div class="journal-entry">
          <div class="journal-header">
            <div class="journal-date">${formatDate(j.date)}</div>
            <div class="journal-title">${esc(j.title)}</div>
            ${j.finalizedAt ? '<span class="badge-final">Finalized</span>' : '<span class="badge-draft">Draft</span>'}
          </div>
          ${j.activityCompiled || j.activityRaw ? `
            <div class="journal-field">
              <label>Kegiatan</label>
              <p>${esc(j.activityCompiled ?? j.activityRaw)}</p>
            </div>
          ` : ''}
          ${j.newThings ? `
            <div class="journal-field">
              <label>Hal Baru yang Dipelajari</label>
              <p>${esc(j.newThings)}</p>
            </div>
          ` : ''}
          ${j.obstacle ? `
            <div class="journal-field">
              <label>Kendala</label>
              <p>${esc(j.obstacle)}</p>
            </div>
          ` : ''}
          ${j.solution ? `
            <div class="journal-field">
              <label>Solusi</label>
              <p>${esc(j.solution)}</p>
            </div>
          ` : ''}
          ${j.rtl ? `
            <div class="journal-field">
              <label>Rencana Tindak Lanjut</label>
              <p>${esc(j.rtl)}</p>
            </div>
          ` : ''}
          ${jFeedbacks.length > 0 ? `
            <div class="feedbacks">
              ${jFeedbacks.map(fb => `
                <div class="feedback-item">
                  <span class="feedback-author">${esc(fb.reviewerName ?? fb.reviewerRole)} · ${roleLabel(fb.reviewerRole)}</span>
                  <p>${esc(fb.content)}</p>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `
    }).join('')

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Laporan PKL — ${esc(student.name)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1a1a2e; background: #fff; line-height: 1.6; }

    /* Cover */
    .cover { background: linear-gradient(135deg, #1F4E79 0%, #2E86C1 100%); color: white; padding: 48px 40px 40px; }
    .cover-badge { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; opacity: 0.7; margin-bottom: 12px; }
    .cover-title { font-size: 28px; font-weight: 800; line-height: 1.2; margin-bottom: 6px; }
    .cover-subtitle { font-size: 16px; opacity: 0.85; margin-bottom: 32px; }
    .cover-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .cover-item { background: rgba(255,255,255,0.1); border-radius: 10px; padding: 12px 16px; }
    .cover-item label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.65; display: block; margin-bottom: 4px; }
    .cover-item span { font-size: 14px; font-weight: 600; }
    .cover-generated { margin-top: 24px; font-size: 11px; opacity: 0.55; }

    /* Stats bar */
    .stats-bar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border-bottom: 2px solid #f0f0f0; }
    .stat-item { text-align: center; padding: 20px; border-right: 1px solid #f0f0f0; }
    .stat-item:last-child { border-right: none; }
    .stat-num { font-size: 32px; font-weight: 800; color: #1F4E79; line-height: 1; }
    .stat-label { font-size: 11px; color: #888; margin-top: 4px; }

    /* Sections */
    section { padding: 32px 40px; border-bottom: 1px solid #f0f0f0; }
    section:last-child { border-bottom: none; }
    h2 { font-size: 16px; font-weight: 700; color: #1F4E79; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e8f0fe; }
    h4 { font-size: 13px; font-weight: 700; color: #333; margin: 16px 0 10px; }

    /* Eval */
    .eval-card { display: flex; align-items: center; gap: 20px; background: #f8f9ff; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .eval-score { text-align: center; min-width: 80px; }
    .score-num { font-size: 48px; font-weight: 900; line-height: 1; display: block; }
    .score-denom { font-size: 13px; color: #999; }
    .score-good { color: #16a34a; }
    .score-mid { color: #d97706; }
    .score-bad { color: #dc2626; }
    .eval-meta p { margin-bottom: 4px; font-size: 13px; }
    .analysis-box { background: #f8f9ff; border-left: 4px solid #1F4E79; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 16px; }
    .analysis-box p { color: #444; line-height: 1.7; }

    /* Competency */
    .competency-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .competency-item { background: #fafafa; border-radius: 8px; padding: 10px 12px; }
    .competency-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 12px; }
    .progress-bar { background: #e5e7eb; border-radius: 99px; height: 6px; }
    .progress-fill { height: 6px; border-radius: 99px; }
    .fill-good { background: #16a34a; }
    .fill-mid { background: #d97706; }
    .fill-bad { background: #dc2626; }

    /* Badges */
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; }
    .badge-lanjut { background: #dcfce7; color: #16a34a; }
    .badge-perhatikan { background: #fef3c7; color: #d97706; }
    .badge-pindah { background: #fee2e2; color: #dc2626; }
    .badge-final { display: inline-block; padding: 1px 6px; border-radius: 99px; font-size: 10px; font-weight: 600; background: #dcfce7; color: #16a34a; }
    .badge-draft { display: inline-block; padding: 1px 6px; border-radius: 99px; font-size: 10px; font-weight: 600; background: #f3f4f6; color: #9ca3af; }

    /* Journals */
    .journals-section { padding: 32px 40px; }
    .journals-section h2 { font-size: 16px; font-weight: 700; color: #1F4E79; margin-bottom: 20px; padding-bottom: 8px; border-bottom: 2px solid #e8f0fe; }
    .journal-entry { margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; break-inside: avoid; }
    .journal-header { display: flex; align-items: center; gap: 12px; background: #f8f9ff; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; }
    .journal-date { font-size: 11px; font-weight: 700; color: #1F4E79; background: #e8f0fe; padding: 3px 8px; border-radius: 6px; white-space: nowrap; }
    .journal-title { font-size: 14px; font-weight: 700; color: #1a1a2e; flex: 1; }
    .journal-field { padding: 10px 16px; border-bottom: 1px solid #f3f4f6; }
    .journal-field:last-child { border-bottom: none; }
    .journal-field label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; display: block; margin-bottom: 3px; }
    .journal-field p { color: #374151; font-size: 13px; line-height: 1.6; }

    /* Feedbacks */
    .feedbacks { background: #fffbeb; border-top: 1px solid #fde68a; padding: 10px 16px; display: flex; flex-direction: column; gap: 8px; }
    .feedback-item { background: white; border-radius: 8px; padding: 8px 12px; border-left: 3px solid #f59e0b; }
    .feedback-author { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #d97706; display: block; margin-bottom: 3px; }
    .feedback-item p { font-size: 12px; color: #374151; line-height: 1.5; }

    /* Summary lists */
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .summary-card { background: #fafafa; border-radius: 10px; padding: 16px; }
    .summary-card h4 { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #6b7280; margin-bottom: 10px; }
    .summary-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }
    .summary-list li { font-size: 12px; color: #374151; padding: 6px 10px; background: white; border-radius: 6px; border-left: 3px solid #1F4E79; line-height: 1.5; }
    .summary-list li .item-date { font-size: 10px; color: #9ca3af; display: block; margin-bottom: 2px; }
    .obstacle-item { border-left-color: #ef4444 !important; }
    .new-thing-item { border-left-color: #10b981 !important; }

    /* Print */
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .no-print { display: none; }
      .journal-entry { break-inside: avoid; }
      section { break-inside: avoid; }
    }

    /* Print button */
    .print-bar { background: #1F4E79; padding: 12px 40px; display: flex; align-items: center; justify-content: space-between; }
    .print-bar p { color: rgba(255,255,255,0.7); font-size: 12px; }
    .print-btn { background: white; color: #1F4E79; border: none; padding: 8px 20px; border-radius: 8px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; }
    .print-btn:hover { background: #e8f0fe; }
  </style>
</head>
<body>

<!-- Print bar -->
<div class="print-bar no-print">
  <p>Laporan PKL — ${esc(student.name)} · Buka di browser, lalu Ctrl+P / Cmd+P → Simpan sebagai PDF</p>
  <button class="print-btn" onclick="window.print()">
    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/>
    </svg>
    Cetak / Simpan PDF
  </button>
</div>

<!-- Cover -->
<div class="cover">
  <div class="cover-badge">Laporan Praktik Kerja Lapangan</div>
  <div class="cover-title">${esc(student.name)}</div>
  <div class="cover-subtitle">${esc(student.major)} · ${esc(student.class)}</div>
  <div class="cover-grid">
    <div class="cover-item">
      <label>NIS</label>
      <span>${esc(student.nis)}</span>
    </div>
    ${placement ? `
    <div class="cover-item">
      <label>Tempat PKL</label>
      <span>${esc(placement.companyName)}</span>
    </div>
    <div class="cover-item">
      <label>Periode PKL</label>
      <span>${formatDate(placement.startDate ?? '')} – ${formatDate(placement.endDate ?? '')}</span>
    </div>
    <div class="cover-item">
      <label>Guru Pembimbing</label>
      <span>${esc(placement.teacherName)}</span>
    </div>
    ` : ''}
  </div>
  <div class="cover-generated">Laporan dibuat otomatis pada ${generatedAt}</div>
</div>

<!-- Stats -->
<div class="stats-bar">
  <div class="stat-item">
    <div class="stat-num">${totalJournals}</div>
    <div class="stat-label">Total Jurnal</div>
  </div>
  <div class="stat-item">
    <div class="stat-num">${finalizedJournals}</div>
    <div class="stat-label">Jurnal Finalized</div>
  </div>
  <div class="stat-item">
    <div class="stat-num">${totalFeedbacks}</div>
    <div class="stat-label">Total Feedback</div>
  </div>
</div>

${evalSection}

<!-- Summary Kendala & Hal Baru -->
${(obstacles.length > 0 || newThings.length > 0) ? `
<section>
  <h2>Rekapitulasi Kendala & Pembelajaran</h2>
  <div class="summary-grid">
    ${obstacles.length > 0 ? `
    <div class="summary-card">
      <h4>🔴 Kendala yang Dihadapi (${obstacles.length})</h4>
      <ul class="summary-list">
        ${obstacles.map(o => `
          <li class="obstacle-item">
            <span class="item-date">${formatDate(o.date)}</span>
            ${esc(o.text)}
          </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}
    ${newThings.length > 0 ? `
    <div class="summary-card">
      <h4>🟢 Hal Baru yang Dipelajari (${newThings.length})</h4>
      <ul class="summary-list">
        ${newThings.map(n => `
          <li class="new-thing-item">
            <span class="item-date">${formatDate(n.date)}</span>
            ${esc(n.text)}
          </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}
  </div>
</section>
` : ''}

<!-- Journals -->
<div class="journals-section">
  <h2>Riwayat Jurnal Harian (${totalJournals} entri)</h2>
  ${journalSection}
</div>

</body>
</html>`
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
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

function roleLabel(r: string): string {
  if (r === 'teacher') return 'Guru Pembimbing'
  if (r === 'industry') return 'Pembimbing Industri'
  if (r === 'parent') return 'Orang Tua'
  return r
}
