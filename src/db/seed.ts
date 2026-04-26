import { db } from './index.ts'
import {
  schools, users, students, pklPlacements,
  competencyGuidelines, journals, feedbacks, majors, companies,
} from './schema/index.ts'
import { sql } from 'drizzle-orm'
import { RbacService } from '../services/rbac.service.ts'

async function hashPassword(pwd: string): Promise<string> {
  const salt = process.env.JWT_SECRET ?? 'salt'
  const encoded = new TextEncoder().encode(pwd + salt)
  const buffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── Reset all data ──────────────────────────────────────────────────────
async function reset() {
  console.log('🗑️  Resetting database...')
  await db.execute(sql`TRUNCATE TABLE feedbacks, ai_evaluations, whatsapp_logs, journals, pkl_placements, students, competency_guidelines, role_permissions, user_roles, roles, permissions, users, companies, majors, schools CASCADE`)
  console.log('✓ All tables cleared')
}

async function seed() {
  await reset()
  console.log('🌱 Seeding database...')

  const password = await hashPassword('password123')

  // ── Majors ──────────────────────────────────────────────────────────
  const [majorTkro] = await db.insert(majors).values({ code: 'TKRO', name: 'Teknik Kendaraan Ringan Otomotif' }).returning()
  const [majorTkj] = await db.insert(majors).values({ code: 'TKJ', name: 'Teknik Komputer Jaringan' }).returning()
  const [majorTav] = await db.insert(majors).values({ code: 'TAV', name: 'Teknik Audio Video' }).returning()
  console.log('✓ Majors: TKRO, TKJ, TAV')

  // ── Companies ────────────────────────────────────────────────────────
  const [cAstra] = await db.insert(companies).values({
    name: 'PT Astra Honda Motor',
    address: 'Jl. Raya Pegangsaan Dua No.1, Jakarta Utara',
    phone: '0218080808',
    contactPerson: 'Budi Santoso',
  }).returning()

  const [cYamaha] = await db.insert(companies).values({
    name: 'PT Yamaha Indonesia Motor Manufacturing',
    address: 'Jl. Dr. KRT. Radjiman Widyodiningrat No.8, Jakarta Selatan',
    phone: '02179171917',
    contactPerson: 'Dewi Anggraeni',
  }).returning()

  const [cTelkom] = await db.insert(companies).values({
    name: 'PT Telkom Indonesia',
    address: 'Jl. Gatot Subroto No.52, Jakarta Selatan',
    phone: '02152789000',
    contactPerson: 'Rudi Hermawan',
  }).returning()

  const [cSamsung] = await db.insert(companies).values({
    name: 'PT Samsung Electronics Indonesia',
    address: 'Cikarang Industrial Estate, Bekasi',
    phone: '02189001000',
    contactPerson: 'Hani Pratiwi',
  }).returning()

  console.log('✓ Companies: Astra, Yamaha, Telkom, Samsung')

  // ── School ───────────────────────────────────────────────────────────
  const [school] = await db.insert(schools).values({
    name: 'SMK Negeri 1 Contoh',
    logoUrl: null,
  }).returning()
  console.log('✓ School:', school.name)

  // ── Admin ────────────────────────────────────────────────────────────
  const [admin] = await db.insert(users).values({
    schoolId: school.id, role: 'admin',
    name: 'Admin Koordinator',
    email: 'admin@sekolah.sch.id',
    passwordHash: password, phone: '081200000000',
  }).returning()
  console.log('✓ Admin:', admin.email)

  // ── Guru (3 orang) ───────────────────────────────────────────────────
  const [teacher1] = await db.insert(users).values({
    schoolId: school.id, role: 'teacher',
    name: 'Eko Setiyawan', email: 'eko.guru@sekolah.sch.id',
    passwordHash: password, phone: '081211111111',
  }).returning()

  const [teacher2] = await db.insert(users).values({
    schoolId: school.id, role: 'teacher',
    name: 'Sari Dewi Rahayu', email: 'sari.guru@sekolah.sch.id',
    passwordHash: password, phone: '081222222222',
  }).returning()

  const [teacher3] = await db.insert(users).values({
    schoolId: school.id, role: 'teacher',
    name: 'Bambang Supriadi', email: 'bambang.guru@sekolah.sch.id',
    passwordHash: password, phone: '081233333333',
  }).returning()

  console.log('✓ Teachers: Eko, Sari, Bambang')

  // ── Pembimbing Industri (4 orang) ────────────────────────────────────
  const [ind1] = await db.insert(users).values({
    schoolId: school.id, role: 'industry',
    name: 'Budi Santoso', email: 'budi@astra.co.id',
    passwordHash: password, phone: '081244444444',
  }).returning()

  const [ind2] = await db.insert(users).values({
    schoolId: school.id, role: 'industry',
    name: 'Dewi Anggraeni', email: 'dewi@yamaha.co.id',
    passwordHash: password, phone: '081255555555',
  }).returning()

  const [ind3] = await db.insert(users).values({
    schoolId: school.id, role: 'industry',
    name: 'Rudi Hermawan', email: 'rudi@telkom.co.id',
    passwordHash: password, phone: '081266666666',
  }).returning()

  const [ind4] = await db.insert(users).values({
    schoolId: school.id, role: 'industry',
    name: 'Hani Pratiwi', email: 'hani@samsung.co.id',
    passwordHash: password, phone: '081277777777',
  }).returning()

  console.log('✓ Industry supervisors: Budi, Dewi, Rudi, Hani')

  // ── Orang Tua (10 orang) ─────────────────────────────────────────────
  const parentNames = [
    { name: 'Suparman', email: 'suparman@gmail.com', phone: '081288881111' },
    { name: 'Mariyati', email: 'mariyati@gmail.com', phone: '081288882222' },
    { name: 'Hendra Gunawan', email: 'hendra@gmail.com', phone: '081288883333' },
    { name: 'Siti Aminah', email: 'siti.aminah@gmail.com', phone: '081288884444' },
    { name: 'Wahyu Santoso', email: 'wahyu.s@gmail.com', phone: '081288885555' },
    { name: 'Endang Susilowati', email: 'endang.s@gmail.com', phone: '081288886666' },
    { name: 'Agus Prayitno', email: 'agus.p@gmail.com', phone: '081288887777' },
    { name: 'Rina Marlina', email: 'rina.m@gmail.com', phone: '081288888888' },
    { name: 'Joko Widodo', email: 'joko.w@gmail.com', phone: '081288889999' },
    { name: 'Dewi Setyowati', email: 'dewi.sety@gmail.com', phone: '081288880000' },
  ]
  const parents: (typeof users.$inferSelect)[] = []
  for (const p of parentNames) {
    const [row] = await db.insert(users).values({
      schoolId: school.id, role: 'parent',
      name: p.name, email: p.email,
      passwordHash: password, phone: p.phone,
    }).returning()
    parents.push(row)
  }
  console.log('✓ Parents: 10 orang')

  // ── Siswa (10 orang) ─────────────────────────────────────────────────
  const studentDefs = [
    // Astra — TKRO — Eko
    { name: 'Ahmad Chairul Fauzan', nis: '2024001', class: 'XII TKRO 1', majorId: majorTkro.id, email: '2024001@sekolah.sch.id', phone: '081299991111', teacher: teacher1, ind: ind1, parent: parents[0], company: cAstra },
    { name: 'Rizky Pratama', nis: '2024002', class: 'XII TKRO 1', majorId: majorTkro.id, email: '2024002@sekolah.sch.id', phone: '081299992222', teacher: teacher1, ind: ind1, parent: parents[1], company: cAstra },
    { name: 'Dimas Ardiansyah', nis: '2024003', class: 'XII TKRO 2', majorId: majorTkro.id, email: '2024003@sekolah.sch.id', phone: '081299993333', teacher: teacher1, ind: ind1, parent: parents[2], company: cAstra },
    // Yamaha — TKRO — Sari
    { name: 'Fira Aulia Sari', nis: '2024004', class: 'XII TKRO 2', majorId: majorTkro.id, email: '2024004@sekolah.sch.id', phone: '081299994444', teacher: teacher2, ind: ind2, parent: parents[3], company: cYamaha },
    { name: 'Nanda Putri Utami', nis: '2024005', class: 'XII TKRO 2', majorId: majorTkro.id, email: '2024005@sekolah.sch.id', phone: '081299995555', teacher: teacher2, ind: ind2, parent: parents[4], company: cYamaha },
    // Telkom — TKJ — Sari
    { name: 'Yoga Permana', nis: '2024006', class: 'XII TKJ 1', majorId: majorTkj.id, email: '2024006@sekolah.sch.id', phone: '081299996666', teacher: teacher2, ind: ind3, parent: parents[5], company: cTelkom },
    { name: 'Annisa Rahma', nis: '2024007', class: 'XII TKJ 1', majorId: majorTkj.id, email: '2024007@sekolah.sch.id', phone: '081299997777', teacher: teacher2, ind: ind3, parent: parents[6], company: cTelkom },
    // Samsung — TAV — Bambang
    { name: 'Bagas Saputra', nis: '2024008', class: 'XII TAV 1', majorId: majorTav.id, email: '2024008@sekolah.sch.id', phone: '081299998888', teacher: teacher3, ind: ind4, parent: parents[7], company: cSamsung },
    { name: 'Citra Dewi Lestari', nis: '2024009', class: 'XII TAV 1', majorId: majorTav.id, email: '2024009@sekolah.sch.id', phone: '081299999999', teacher: teacher3, ind: ind4, parent: parents[8], company: cSamsung },
    { name: 'Galih Wicaksono', nis: '2024010', class: 'XII TAV 1', majorId: majorTav.id, email: '2024010@sekolah.sch.id', phone: '081299990000', teacher: teacher3, ind: ind4, parent: parents[9], company: cSamsung },
  ]

  const studentRows: { user: typeof users.$inferSelect; student: typeof students.$inferSelect; placement: typeof pklPlacements.$inferSelect; def: typeof studentDefs[0] }[] = []

  for (const def of studentDefs) {
    const [userRow] = await db.insert(users).values({
      schoolId: school.id, role: 'student',
      name: def.name, email: def.email,
      passwordHash: password, phone: def.phone,
    }).returning()

    const [studentRow] = await db.insert(students).values({
      userId: userRow.id, schoolId: school.id,
      nis: def.nis, class: def.class, majorId: def.majorId,
    }).returning()

    const [placementRow] = await db.insert(pklPlacements).values({
      studentId: studentRow.id,
      teacherId: def.teacher.id,
      industrySupervisorId: def.ind.id,
      parentId: def.parent.id,
      companyId: def.company.id,
      startDate: '2026-01-06',
      endDate: '2026-06-30',
      status: 'active',
    }).returning()

    studentRows.push({ user: userRow, student: studentRow, placement: placementRow, def })
  }
  console.log('✓ Students + Placements: 10 siswa')

  // ── Journal templates ────────────────────────────────────────────────
  // Dates: going back from today, weekdays only
  function weekdayDates(count: number): string[] {
    const dates: string[] = []
    const d = new Date('2026-04-25')
    while (dates.length < count) {
      const day = d.getDay()
      if (day !== 0 && day !== 6) {
        dates.unshift(d.toISOString().split('T')[0])
      }
      d.setDate(d.getDate() - 1)
    }
    return dates
  }

  // Journal templates per major
  const tkroJournals = [
    { title: 'Orientasi dan Pengenalan Lingkungan Kerja', activityRaw: 'Hari pertama PKL. Diperkenalkan dengan pembimbing industri dan rekan kerja. Keliling area pabrik dan mengenal divisi Quality Control.', activityCompiled: 'Siswa melaksanakan orientasi awal PKL, mencakup perkenalan pembimbing, tur fasilitas pabrik, dan pengenalan divisi QC.', newThings: 'Mengetahui alur proses produksi dari awal hingga siap kirim.', obstacle: 'Belum hafal nama-nama area dan istilah teknis.', solution: 'Mencatat setiap istilah baru di buku catatan.', rtl: 'Pelajari SOP dasar divisi QC.' },
    { title: 'Belajar Prosedur Inspeksi Part', activityRaw: 'Belajar menggunakan caliper dan micrometer untuk mengukur dimensi part. Mengamati karyawan senior melakukan inspeksi komponen mesin.', activityCompiled: 'Siswa mempelajari penggunaan alat ukur presisi dalam proses inspeksi incoming part.', newThings: 'Cara membaca skala vernier caliper hingga 0,02 mm.', obstacle: 'Kesulitan membaca skala micrometer dengan cepat.', solution: 'Berlatih berulang kali dengan part yang sama.', rtl: 'Latihan mandiri penggunaan caliper dan micrometer.' },
    { title: 'Praktik Inspeksi Incoming Part', activityRaw: 'Ikut inspeksi part dari supplier. Memeriksa 50 pcs bushing menggunakan go/no-go gauge. Ditemukan 2 pcs tidak sesuai toleransi.', activityCompiled: 'Siswa terlibat aktif dalam inspeksi incoming part, mengidentifikasi 2 unit cacat dan menyusun NCR.', newThings: 'Prosedur penulisan Non-Conformance Report (NCR).', obstacle: 'Ragu dalam memutuskan status reject.', solution: 'Konfirmasi dengan supervisor sebelum men-tag part.', rtl: 'Pelajari standar toleransi masing-masing part.' },
    { title: 'Pengenalan Sistem Dokumentasi QC', activityRaw: 'Diajari cara mengisi form inspeksi harian secara digital menggunakan sistem SAP. Belajar input data hasil pengukuran ke database.', activityCompiled: 'Siswa mempelajari sistem dokumentasi QC berbasis SAP untuk Daily Inspection Report.', newThings: 'Cara navigasi modul QM di SAP.', obstacle: 'Sistem SAP terasa kompleks.', solution: 'Meminta cheat sheet dari senior.', rtl: 'Latihan input data dengan data dummy di sistem training.' },
    { title: 'Observasi Assembly Line', activityRaw: 'Mengamati proses assembly sepeda motor di lini produksi. Mencatat urutan pemasangan komponen dari frame hingga finishing. Cycle time sekitar 45 detik.', activityCompiled: 'Siswa melakukan observasi menyeluruh pada lini assembly produksi, mendokumentasikan urutan perakitan dengan cycle time 45 detik per unit.', newThings: 'Konsep takt time dan penyeimbangan beban kerja di setiap stasiun.', obstacle: 'Sulit mengikuti kecepatan lini yang bergerak cepat.', solution: 'Merekam video singkat sebagai referensi catatan.', rtl: 'Buat diagram alur proses assembly.' },
    { title: 'Final Inspection Produk Jadi', activityRaw: 'Ikut tim QC melakukan final inspection pada 20 unit motor siap kirim. Memeriksa aksesori, rem, lampu, dan kelistrikan. Semua unit lolos.', activityCompiled: 'Siswa berpartisipasi dalam final inspection 20 unit sepeda motor mencakup 47 poin pemeriksaan.', newThings: 'Checklist final inspection terdiri dari 47 poin.', obstacle: 'Konsentrasi mulai menurun di unit ke-15.', solution: 'Istirahat singkat sebelum melanjutkan.', rtl: 'Cari teknik menjaga konsentrasi pada pekerjaan repetitif.' },
    { title: 'Analisis Defect dengan Diagram Pareto', activityRaw: 'Membuat diagram Pareto dari data defect bulan sebelumnya. 3 defect terbanyak: cat baret 35%, komponen longgar 28%, salah pasang 20%.', activityCompiled: 'Siswa mempelajari analisis defect menggunakan Diagram Pareto, mengidentifikasi tiga defect dominan.', newThings: 'Prinsip Pareto 80/20 dalam quality management.', obstacle: 'Data defect di spreadsheet tidak terstruktur.', solution: 'Minta bantuan senior merapikan data terlebih dahulu.', rtl: 'Pelajari pivot table Excel untuk analisis data.' },
    { title: 'Latihan Torque Wrench', activityRaw: 'Belajar menggunakan torque wrench dengan torsi 10 Nm, 25 Nm, dan 40 Nm pada unit training.', activityCompiled: 'Siswa mempraktikkan penggunaan torque wrench dengan variasi torsi pada unit training.', newThings: 'Under-torque menyebabkan baut longgar, over-torque merusak thread.', obstacle: 'Sulit merasakan perbedaan klik torsi.', solution: 'Berlatih di berbagai setting dan minta verifikasi supervisor.', rtl: 'Praktikkan di rumah untuk membangun intuisi torsi.' },
    { title: 'Safety Talk K3 Mingguan', activityRaw: 'Mengikuti safety talk mingguan. Topik: penanganan bahan kimia berbahaya dan penggunaan APD.', activityCompiled: 'Siswa mengikuti safety talk dengan topik penanganan bahan kimia berbahaya dan prosedur APD.', newThings: 'SOP penanganan tumpahan bahan kimia dalam 5 menit.', obstacle: 'Materi K3 sangat banyak dan padat.', solution: 'Merekam sesi dan mencatat poin kritis saja.', rtl: 'Review MSDS untuk bahan-bahan yang sering digunakan.' },
    { title: 'Pembuatan Laporan Inspeksi Mingguan', activityRaw: 'Ditugaskan membuat rekap laporan inspeksi satu minggu. Data diolah jadi grafik tren defect dan laporan 5 halaman.', activityCompiled: 'Siswa menyusun laporan inspeksi mingguan secara mandiri mencakup visualisasi tren defect.', newThings: 'Format pelaporan standar ISO 9001.', obstacle: 'Data dari form harian tidak konsisten formatnya.', solution: 'Standarisasi format manual sebelum diolah.', rtl: 'Kembangkan template form yang lebih mudah di-compile.' },
    { title: 'Pengujian Brake Test', activityRaw: 'Mengujikan rem pada 10 unit produk jadi menggunakan brake tester. Dua unit dengan gaya rem di bawah standar dikembalikan ke lini.', activityCompiled: 'Siswa mempraktikkan pengujian sistem pengereman pada 10 unit, mengidentifikasi 2 unit di bawah standar.', newThings: 'Standar gaya pengereman depan minimal 35 kg dan belakang 20 kg.', obstacle: 'Kalibrasi alat brake tester hampir terlewat.', solution: 'Membuat checklist kalibrasi harian.', rtl: 'Pelajari prosedur kalibrasi semua alat ukur di divisi QC.' },
    { title: 'Root Cause Analysis (5 Why)', activityRaw: 'Supervisor mengajari metode 5 Why untuk menemukan akar masalah defect. Studi kasus: baut tangki kendor.', activityCompiled: 'Siswa mempelajari Root Cause Analysis menggunakan 5 Why, menemukan torque wrench yang butuh kalibrasi.', newThings: 'Teknik 5 Why dan Fishbone Diagram sebagai tools RCA.', obstacle: 'Sulit membedakan penyebab dan gejala.', solution: 'Tanya kenapa secara sistematis di setiap level.', rtl: 'Latih RCA pada kasus defect minor yang ditemukan minggu ini.' },
    { title: 'Kegiatan 5S di Area Kerja', activityRaw: 'Ikut kegiatan 5S bulanan. Sorting tools tidak terpakai, beri label pada rak dan laci, pastikan alat ukur tersimpan benar.', activityCompiled: 'Siswa berpartisipasi aktif dalam kegiatan 5S bulanan di area QC meliputi Seiri, Seiton, dan Seiketsu.', newThings: 'Filosofi 5S bukan sekadar bersih-bersih tapi sistem efisiensi.', obstacle: 'Beberapa tools tidak ada tagnya.', solution: 'Buat tag baru dan dokumentasikan lokasi penyimpanan.', rtl: 'Buat visual management untuk area workstation.' },
    { title: 'Review Capaian Bulanan', activityRaw: 'Melakukan review capaian PKL bersama pembimbing. Mendapat penilaian positif pada ketelitian dan kedisiplinan.', activityCompiled: 'Siswa menjalani sesi review capaian bersama pembimbing industri dan guru pembimbing.', newThings: 'Cara menetapkan target SMART dalam pengembangan diri.', obstacle: 'Merasa canggung saat menerima kritik di depan supervisor senior.', solution: 'Fokus pada isi kritik dan catat semua masukan.', rtl: 'Susun action plan untuk meningkatkan kecepatan dan inisiatif.' },
    { title: 'Inspeksi Mandiri Tanpa Pendampingan', activityRaw: 'Pertama kali melakukan inspeksi incoming part secara mandiri tanpa didampingi senior. Memeriksa 60 pcs valve spring.', activityCompiled: 'Siswa berhasil melaksanakan inspeksi incoming part pertama kali secara mandiri, memeriksa 60 unit valve spring.', newThings: 'Pentingnya dokumentasi real-time selama inspeksi berlangsung.', obstacle: 'Sempat ragu saat menemukan part borderline toleransi.', solution: 'Rujuk ke tabel toleransi standar dan dokumentasikan keputusan.', rtl: 'Pelajari cara menangani part dengan toleransi borderline.' },
  ]

  const tkjJournals = [
    { title: 'Orientasi Divisi IT dan Infrastruktur Jaringan', activityRaw: 'Hari pertama PKL di divisi IT. Diperkenalkan dengan tim dan mendapat gambaran infrastruktur jaringan: 3 gedung, sekitar 500 node aktif.', activityCompiled: 'Siswa melaksanakan orientasi di divisi IT, mendapat gambaran infrastruktur jaringan yang mencakup 3 gedung dengan 500 node aktif.', newThings: 'Topologi jaringan menggunakan kombinasi star dan hierarchical dengan 3 layer.', obstacle: 'Scope infrastruktur jauh lebih besar dari bayangan.', solution: 'Fokus pada satu area dulu dan perluas perlahan.', rtl: 'Buat diagram topologi dari hasil orientasi.' },
    { title: 'Konfigurasi Switch Cisco Dasar', activityRaw: 'Diajari akses switch menggunakan PuTTY dan konfigurasi dasar. Mempraktikkan perintah show interfaces, show vlan, show running-config.', activityCompiled: 'Siswa mempelajari konfigurasi dasar switch Cisco via CLI menggunakan PuTTY pada perangkat lab.', newThings: 'Perbedaan mode user EXEC, privileged EXEC, dan global config.', obstacle: 'Perintah CLI berbeda dengan simulator di sekolah.', solution: 'Buat cheat sheet perintah Cisco.', rtl: 'Hafal 20 perintah CLI Cisco yang paling sering digunakan.' },
    { title: 'Troubleshooting Koneksi User', activityRaw: 'Membantu troubleshoot masalah koneksi di departemen HR. Pengecekan kabel, ping test, cek IP. Masalah: kabel patch putus terjepit meja.', activityCompiled: 'Siswa melaksanakan troubleshooting koneksi internet secara bertahap mengikuti OSI model. Akar masalah ditemukan.', newThings: 'Urutan troubleshooting: physical → data link → network → transport → application.', obstacle: 'Sulit mendiagnosis karena tidak tahu histori sebelumnya.', solution: 'Mulai dari layer paling bawah OSI secara sistematis.', rtl: 'Pelajari membaca MAC address table di switch.' },
    { title: 'Konfigurasi VLAN Departemen Baru', activityRaw: 'Ditugaskan konfigurasi VLAN baru untuk Marketing. Langkah: buat VLAN 40, setting trunk, konfigurasi IP helper DHCP.', activityCompiled: 'Siswa membantu konfigurasi VLAN 40 meliputi pembuatan VLAN di core switch, trunk port, dan IP helper DHCP.', newThings: 'Pentingnya VLAN dalam segmentasi keamanan jaringan.', obstacle: 'Lupa menambahkan VLAN di interface trunk.', solution: 'Verifikasi dengan "show interfaces trunk".', rtl: 'Buat checklist konfigurasi VLAN.' },
    { title: 'Monitoring Jaringan dengan PRTG', activityRaw: 'Diperkenalkan dengan PRTG Network Monitor. Belajar baca dashboard, interpretasi alert, dan menambahkan device baru.', activityCompiled: 'Siswa mempelajari sistem monitoring jaringan PRTG mencakup dashboard, alert, device baru, dan threshold.', newThings: 'SNMP v2c dan v3 untuk monitoring device.', obstacle: 'SNMP community string beberapa perangkat lama tidak terdokumentasi.', solution: 'Coba default community string dulu.', rtl: 'Buat inventori perangkat dengan SNMP community string.' },
    { title: 'Backup Konfigurasi Router dan Switch', activityRaw: 'Backup konfigurasi rutin 5 router dan 12 switch menggunakan TFTP. Membuat script Python sederhana untuk otomatisasi backup.', activityCompiled: 'Siswa melaksanakan backup konfigurasi rutin dan membuat script Python otomatisasi menggunakan Netmiko.', newThings: 'Library Netmiko di Python untuk otomatisasi perangkat jaringan.', obstacle: 'Script gagal connect ke 3 switch karena perbedaan versi SSH.', solution: 'Tambahkan parameter device_type yang tepat.', rtl: 'Sempurnakan script untuk handle berbagai versi SSH.' },
    { title: 'Instalasi Access Point Baru', activityRaw: 'Membantu instalasi 3 unit access point baru di kantin dan lobby. Mounting, routing kabel, konfigurasi SSID, tes coverage.', activityCompiled: 'Siswa berpartisipasi instalasi 3 unit AP baru termasuk konfigurasi SSID dan pengujian coverage.', newThings: 'Cara menentukan posisi AP optimal menggunakan heat map.', obstacle: 'Satu AP tidak mau join controller karena firmware tidak kompatibel.', solution: 'Update firmware AP ke versi terbaru.', rtl: 'Pelajari cara membaca wifi heat map.' },
    { title: 'Konfigurasi Firewall Fortigate', activityRaw: 'Belajar dan mempraktikkan konfigurasi firewall rules di Fortigate untuk aplikasi baru HR dari VLAN internal ke DMZ.', activityCompiled: 'Siswa mempraktikkan konfigurasi firewall rules Fortigate dengan mempertimbangkan dampak minimal pada konfigurasi existing.', newThings: 'Prinsip least privilege dalam firewall rules.', obstacle: 'Rule baru konflik dengan rule yang ada.', solution: 'Gunakan policy test dan session monitor sebelum apply.', rtl: 'Pelajari best practice urutan firewall rules.' },
    { title: 'Dokumentasi Jaringan dengan Draw.io', activityRaw: 'Ditugaskan membuat dokumentasi jaringan terkini menggunakan draw.io. Memetakan semua perangkat aktif, IP, VLAN di gedung A.', activityCompiled: 'Siswa mengerjakan dokumentasi jaringan terkini memetakan seluruh perangkat aktif di gedung A.', newThings: 'Network documentation sangat berguna saat troubleshooting.', obstacle: 'Konfigurasi aktual berbeda dari dokumentasi lama.', solution: 'Verifikasi langsung ke perangkat menggunakan show command.', rtl: 'Selesaikan dokumentasi gedung B dan C.' },
    { title: 'Presentasi Script Backup Otomatis', activityRaw: 'Mempresentasikan script Python backup otomatis yang bisa backup 17 perangkat dalam 8 menit dan simpan riwayat 30 hari.', activityCompiled: 'Siswa mempresentasikan script Python backup otomatis kepada tim IT dengan hasil positif.', newThings: 'Cara menyampaikan hasil teknis kepada audiens non-teknis.', obstacle: 'Saat demo ada 1 perangkat gagal dibackup karena koneksi unstable.', solution: 'Tambahkan retry mechanism dan error logging.', rtl: 'Implementasikan notifikasi email dan retry mechanism.' },
  ]

  const tavJournals = [
    { title: 'Orientasi Divisi Produksi Elektronik', activityRaw: 'Hari pertama PKL di divisi produksi elektronik. Diperkenalkan dengan tim QC dan proses produksi TV LED.', activityCompiled: 'Siswa melaksanakan orientasi di divisi produksi elektronik, mendapat gambaran proses produksi TV LED.', newThings: 'Proses produksi TV LED dari komponen hingga produk jadi.', obstacle: 'Banyak komponen kecil yang belum dikenal.', solution: 'Minta buku panduan komponen dari supervisor.', rtl: 'Pelajari nama dan fungsi komponen utama TV LED.' },
    { title: 'Pengenalan Alat Ukur Elektronik', activityRaw: 'Belajar menggunakan oscilloscope, multimeter digital, dan function generator di lab elektronik.', activityCompiled: 'Siswa mempelajari penggunaan alat ukur elektronik utama di laboratorium produksi.', newThings: 'Cara membaca gelombang sinyal pada oscilloscope.', obstacle: 'Oscilloscope terasa rumit dengan banyak tombol.', solution: 'Fokus pada fungsi dasar dulu dan pahami satu per satu.', rtl: 'Latihan mengukur berbagai sinyal dengan oscilloscope.' },
    { title: 'Soldering dan Desoldering SMD', activityRaw: 'Latihan soldering komponen SMD menggunakan solder station dan hot air gun. Komponen: resistor dan kapasitor 0805.', activityCompiled: 'Siswa mempraktikkan teknik soldering dan desoldering komponen SMD menggunakan solder station dan hot air gun.', newThings: 'Perbedaan teknik soldering through-hole vs SMD.', obstacle: 'Komponen SMD sangat kecil dan mudah bergeser.', solution: 'Gunakan tweezers dan flux secukupnya untuk posisi yang tepat.', rtl: 'Latihan soldering berbagai ukuran komponen SMD.' },
    { title: 'Troubleshooting TV LED Tidak Menyala', activityRaw: 'Ditugaskan troubleshoot TV LED yang tidak menyala. Langkah: cek power supply, backlight, main board. Masalah ditemukan di kapasitor power supply.', activityCompiled: 'Siswa melaksanakan troubleshooting sistematis TV LED tidak menyala, mengidentifikasi kapasitor power supply yang rusak.', newThings: 'Cara mengecek kapasitor dengan multimeter (ESR test).', obstacle: 'Butuh waktu lama mencari komponen yang rusak.', solution: 'Ikuti alur signal dari power supply secara sistematis.', rtl: 'Pelajari gejala kerusakan tiap blok rangkaian TV LED.' },
    { title: 'Kalibrasi Display Panel', activityRaw: 'Belajar prosedur kalibrasi warna dan brightness panel TV menggunakan colorimeter dan software kalibrasi.', activityCompiled: 'Siswa mempelajari prosedur kalibrasi display panel menggunakan colorimeter untuk memastikan akurasi warna.', newThings: 'Standar warna sRGB dan DCI-P3 untuk display konsumer.', obstacle: 'Hasil kalibrasi awal tidak konsisten antar unit.', solution: 'Pastikan kondisi pencahayaan ruangan dan suhu panel stabil.', rtl: 'Pelajari standar kalibrasi display yang berlaku industri.' },
    { title: 'Pengujian Audio Amplifier', activityRaw: 'Melakukan pengujian audio amplifier TV menggunakan audio analyzer. Mengukur THD, SNR, dan frekuensi respons.', activityCompiled: 'Siswa melaksanakan pengujian audio amplifier dengan mengukur parameter THD, SNR, dan frekuensi respons.', newThings: 'Total Harmonic Distortion (THD) harus di bawah 1% untuk kualitas audio baik.', obstacle: 'Nilai THD beberapa unit sedikit di atas standar.', solution: 'Cek koneksi ground dan lakukan re-soldering titik yang kurang baik.', rtl: 'Pelajari lebih dalam parameter audio quality yang terstandarisasi.' },
    { title: 'Proses Aging Test Produk Jadi', activityRaw: 'Mengikuti proses aging test selama 4 jam pada 10 unit TV yang baru diproduksi. Monitoring suhu dan performa secara berkala.', activityCompiled: 'Siswa berpartisipasi dalam aging test 4 jam pada 10 unit TV, melakukan monitoring suhu dan performa secara berkala.', newThings: 'Aging test bertujuan menyaring defect latent yang tidak muncul saat inspeksi awal.', obstacle: 'Satu unit mati mendadak setelah 2 jam aging.', solution: 'Lakukan analisis komponen thermal dan identifikasi penyebab.', rtl: 'Pelajari failure mode yang sering muncul pada aging test.' },
    { title: 'Pembuatan Laporan Teknis Defect', activityRaw: 'Ditugaskan membuat laporan teknis defect mingguan. Menganalisis 12 unit yang reject dan mengkategorikan jenis kerusakannya.', activityCompiled: 'Siswa menyusun laporan teknis defect mingguan menganalisis 12 unit reject dengan kategorisasi jenis kerusakan.', newThings: 'Format laporan teknis standar industri elektronik.', obstacle: 'Beberapa defect sulit dikategorikan karena multi-factor.', solution: 'Diskusikan dengan supervisor untuk klasifikasi yang tepat.', rtl: 'Pelajari metode analisis defect FTA (Fault Tree Analysis).' },
  ]

  // Assign journals per student based on major
  const journalTemplateMap: Record<string, typeof tkroJournals> = {
    [majorTkro.id]: tkroJournals,
    [majorTkj.id]: tkjJournals,
    [majorTav.id]: tavJournals,
  }

  // Different journal counts per student: 15, 7, 12, 10, 8, 9, 6, 10, 7, 8
  const journalCounts = [15, 7, 12, 10, 8, 9, 6, 10, 7, 8]

  // Track all inserted journals
  type JournalRow = { id: string; studentIdx: number; journalIdx: number }
  const allJournals: JournalRow[] = []

  for (let si = 0; si < studentRows.length; si++) {
    const { student, placement, def } = studentRows[si]
    const templates = journalTemplateMap[def.majorId] ?? tkroJournals
    const count = Math.min(journalCounts[si], templates.length)
    const dates = weekdayDates(count)

    for (let ji = 0; ji < count; ji++) {
      const t = templates[ji % templates.length]
      const isFinalized = ji < count - 1 // all except latest are finalized
      const [j] = await db.insert(journals).values({
        studentId: student.id,
        placementId: placement.id,
        date: dates[ji],
        title: t.title,
        activityRaw: t.activityRaw,
        activityCompiled: t.activityCompiled,
        newThings: t.newThings,
        obstacle: t.obstacle,
        solution: t.solution,
        rtl: t.rtl,
        aiProcessed: true,
        finalizedAt: isFinalized ? new Date(dates[ji] + 'T17:00:00Z') : null,
        updatedAt: new Date(dates[ji] + 'T16:30:00Z'),
      }).returning()
      allJournals.push({ id: j.id, studentIdx: si, journalIdx: ji })
    }
  }
  console.log(`✓ Journals: ${allJournals.length} total`)

  // ── Feedbacks — teacher and industry give feedback on ~40% of journals ──
  const feedbackTemplates = {
    teacher: [
      'Jurnal hari ini sudah cukup baik. Tolong tambahkan lebih banyak detail teknis pada bagian kegiatan.',
      'Bagus! Kamu menunjukkan pemahaman yang baik tentang prosedur kerja. Pertahankan!',
      'Catatan pembelajaran kamu sangat detail. Ini akan sangat berguna untuk laporan akhir PKL.',
      'Inisiatif yang baik! Terus tunjukkan sikap proaktif seperti ini.',
      'Pastikan RTL kamu spesifik dan terukur agar bisa dievaluasi kemajuannya.',
      'Kendala yang kamu hadapi adalah hal yang wajar di awal PKL. Tetap semangat!',
      'Solusi yang kamu cari sudah tepat. Selalu dokumentasikan hasilnya.',
      'Laporan yang sangat komprehensif. Kamu berkembang pesat!',
    ],
    industry: [
      'Sudah menunjukkan inisiatif yang baik. Teruslah bertanya jika ada yang belum jelas.',
      'Kerja hari ini sangat memuaskan. Pertahankan kedisiplinan dan ketelitianmu.',
      'Catatan yang bagus. Pemahaman kamu tentang prosedur sudah tepat.',
      'Bagus sekali! Terus tingkatkan kecepatan kerja tanpa mengorbankan kualitas.',
      'Kamu sudah mulai berpikir seperti seorang profesional. Bangga melihat perkembanganmu!',
      'Identifikasi masalah yang tepat. Lain kali coba usulkan improvement action juga.',
      'Presentasi yang baik. Kemampuan komunikasi teknismu sudah berkembang.',
    ],
  }

  let feedbackCount = 0

  for (const jRow of allJournals) {
    const { student, def } = studentRows[jRow.studentIdx]

    // ~50% chance teacher gives feedback
    if (Math.random() < 0.5) {
      const teacher = def.teacher
      const msg = feedbackTemplates.teacher[feedbackCount % feedbackTemplates.teacher.length]
      await db.insert(feedbacks).values({
        journalId: jRow.id,
        reviewerId: teacher.id,
        reviewerRole: 'teacher',
        content: msg,
        source: 'web',
      })
      feedbackCount++
    }

    // ~40% chance industry supervisor gives feedback
    if (Math.random() < 0.4) {
      const msg = feedbackTemplates.industry[feedbackCount % feedbackTemplates.industry.length]
      await db.insert(feedbacks).values({
        journalId: jRow.id,
        reviewerId: def.ind.id,
        reviewerRole: 'industry',
        content: msg,
        source: 'web',
      })
      feedbackCount++
    }
  }
  console.log(`✓ Feedbacks: ${feedbackCount} total`)

  // ── Competency Guidelines ─────────────────────────────────────────────
  await db.insert(competencyGuidelines).values({
    schoolId: school.id, major: 'Teknik Kendaraan Ringan Otomotif', title: 'Kompetensi PKL TKRO',
    competencies: [
      { name: 'Quality Control & Inspeksi', indicators: ['inspeksi part', 'pengukuran toleransi', 'NCR'], weight: 25 },
      { name: 'Proses Produksi & Assembly', indicators: ['perakitan mesin', 'assembly line', 'proses manufaktur'], weight: 30 },
      { name: 'K3 & 5S', indicators: ['keselamatan kerja', 'APD', '5S'], weight: 20 },
      { name: 'Maintenance & Perbaikan', indicators: ['perawatan mesin', 'troubleshooting'], weight: 15 },
      { name: 'Dokumentasi & Laporan', indicators: ['laporan harian', 'checklist'], weight: 10 },
    ],
    keywords: ['inspeksi', 'quality', 'perakitan', 'APD', 'K3', 'mesin', 'produksi'],
  })

  await db.insert(competencyGuidelines).values({
    schoolId: school.id, major: 'Teknik Komputer Jaringan', title: 'Kompetensi PKL TKJ',
    competencies: [
      { name: 'Instalasi & Konfigurasi Jaringan', indicators: ['setting router', 'konfigurasi switch', 'VLAN'], weight: 30 },
      { name: 'Troubleshooting Jaringan', indicators: ['diagnosa masalah', 'ping test', 'traceroute'], weight: 25 },
      { name: 'Administrasi Server', indicators: ['DNS', 'DHCP', 'web server'], weight: 25 },
      { name: 'Keamanan Jaringan', indicators: ['firewall', 'VPN', 'monitoring'], weight: 20 },
    ],
    keywords: ['jaringan', 'network', 'router', 'switch', 'server', 'konfigurasi', 'troubleshoot'],
  })

  await db.insert(competencyGuidelines).values({
    schoolId: school.id, major: 'Teknik Audio Video', title: 'Kompetensi PKL TAV',
    competencies: [
      { name: 'Analisis & Perbaikan Elektronik', indicators: ['troubleshooting', 'soldering', 'penggantian komponen'], weight: 35 },
      { name: 'Penggunaan Alat Ukur Elektronik', indicators: ['oscilloscope', 'multimeter', 'function generator'], weight: 25 },
      { name: 'Kualitas Produksi', indicators: ['QC visual', 'aging test', 'kalibrasi'], weight: 25 },
      { name: 'Dokumentasi Teknis', indicators: ['laporan defect', 'schematic', 'wiring diagram'], weight: 15 },
    ],
    keywords: ['elektronik', 'soldering', 'troubleshoot', 'komponen', 'oscilloscope', 'audio', 'video', 'display'],
  })
  console.log('✓ Guidelines: TKRO, TKJ, TAV')

  // ── RBAC ─────────────────────────────────────────────────────────────
  await RbacService.seedPermissions()
  const { SYSTEM_ROLE_PERMISSIONS } = await import('../services/rbac.service.ts')
  const roleDefs = [
    { name: 'Koordinator PKL', slug: 'koordinator-pkl', description: 'Koordinasi program PKL', permissionKeys: [...SYSTEM_ROLE_PERMISSIONS['teacher'], 'guidelines:manage', 'users:manage'] },
    { name: 'Wali Kelas', slug: 'wali-kelas', description: 'Monitoring & evaluasi siswa wali', permissionKeys: SYSTEM_ROLE_PERMISSIONS['teacher'] },
    { name: 'Guru Mapel', slug: 'guru-mapel', description: 'Lihat jurnal & beri feedback', permissionKeys: ['journals:read', 'feedback:write', 'students:read'] },
  ]
  const roleIds: Record<string, string> = {}
  for (const def of roleDefs) {
    try {
      const role = await RbacService.createRole({ ...def, schoolId: school.id })
      roleIds[def.slug] = role.id
    } catch { /* skip */ }
  }
  if (roleIds['koordinator-pkl']) await RbacService.assignRole(teacher1.id, roleIds['koordinator-pkl'])
  if (roleIds['wali-kelas']) await RbacService.assignRole(teacher1.id, roleIds['wali-kelas'])
  if (roleIds['wali-kelas']) await RbacService.assignRole(teacher2.id, roleIds['wali-kelas'])
  if (roleIds['wali-kelas']) await RbacService.assignRole(teacher3.id, roleIds['wali-kelas'])
  console.log('✓ RBAC: permissions + roles seeded')

  // ── Summary ───────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║            ✅ SEED COMPLETE — PKL Smart Journal                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Password semua akun: password123                                        ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ROLE             EMAIL                           ABAC SCOPE             ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Admin            admin@sekolah.sch.id            Semua siswa            ║
╠──────────────────────────────────────────────────────────────────────────╣
║  Guru 1 (Eko)     eko.guru@sekolah.sch.id         Ahmad, Rizky, Dimas   ║
║  Guru 2 (Sari)    sari.guru@sekolah.sch.id        Fira, Nanda, Yoga, Annisa ║
║  Guru 3 (Bambang) bambang.guru@sekolah.sch.id     Bagas, Citra, Galih   ║
╠──────────────────────────────────────────────────────────────────────────╣
║  Ind 1 (Budi)     budi@astra.co.id               Astra (3 siswa)        ║
║  Ind 2 (Dewi)     dewi@yamaha.co.id              Yamaha (2 siswa)       ║
║  Ind 3 (Rudi)     rudi@telkom.co.id              Telkom (2 siswa)       ║
║  Ind 4 (Hani)     hani@samsung.co.id             Samsung (3 siswa)      ║
╠──────────────────────────────────────────────────────────────────────────╣
║  SISWA (semua password: password123)                                      ║
║  2024001@sekolah.sch.id  Ahmad Chairul Fauzan  TKRO  Astra  15 jurnal   ║
║  2024002@sekolah.sch.id  Rizky Pratama         TKRO  Astra   7 jurnal   ║
║  2024003@sekolah.sch.id  Dimas Ardiansyah      TKRO  Astra  12 jurnal   ║
║  2024004@sekolah.sch.id  Fira Aulia Sari        TKRO  Yamaha 10 jurnal  ║
║  2024005@sekolah.sch.id  Nanda Putri Utami      TKRO  Yamaha  8 jurnal  ║
║  2024006@sekolah.sch.id  Yoga Permana           TKJ   Telkom  9 jurnal  ║
║  2024007@sekolah.sch.id  Annisa Rahma           TKJ   Telkom  6 jurnal  ║
║  2024008@sekolah.sch.id  Bagas Saputra          TAV   Samsung 10 jurnal ║
║  2024009@sekolah.sch.id  Citra Dewi Lestari     TAV   Samsung  7 jurnal ║
║  2024010@sekolah.sch.id  Galih Wicaksono        TAV   Samsung  8 jurnal ║
╚══════════════════════════════════════════════════════════════════════════╝
`)

  process.exit(0)
}

seed().catch((e) => {
  console.error('❌ Seed failed:', e.message)
  console.error(e.stack)
  process.exit(1)
})
