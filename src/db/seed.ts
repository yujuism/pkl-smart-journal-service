import { db } from './index.ts'
import { schools, users, students, pklPlacements, competencyGuidelines, journals, feedbacks, majors, companies } from './schema/index.ts'
import { RbacService } from '../services/rbac.service.ts'

async function hashPassword(pwd: string): Promise<string> {
  const salt = process.env.JWT_SECRET ?? 'salt'
  const encoded = new TextEncoder().encode(pwd + salt)
  const buffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function seed() {
  console.log('🌱 Seeding database...')

  // ── Majors ───────────────────────────────────────────────────────
  const [majorTkro] = await db.insert(majors).values({
    code: 'TKRO',
    name: 'Teknik Kendaraan Ringan Otomotif',
  }).returning()

  const [majorTkj] = await db.insert(majors).values({
    code: 'TKJ',
    name: 'Teknik Komputer Jaringan',
  }).returning()
  console.log('✓ Majors:', majorTkro.code, '+', majorTkj.code)

  // ── Companies ─────────────────────────────────────────────────────
  const [companyAstra] = await db.insert(companies).values({
    name: 'PT Astra Honda Motor',
    address: 'Jl. Raya Pegangsaan Dua No.1, Jakarta Utara',
  }).returning()

  const [companyYamaha] = await db.insert(companies).values({
    name: 'PT Yamaha Indonesia Motor Manufacturing',
    address: 'Jl. Dr. KRT. Radjiman Widyodiningrat, Jakarta Selatan',
  }).returning()
  console.log('✓ Companies:', companyAstra.name, '+', companyYamaha.name)

  // School
  const [school] = await db.insert(schools).values({
    name: 'SMK Negeri 1 Contoh',
    logoUrl: null,
  }).returning()
  console.log('✓ School:', school.name)

  const password = await hashPassword('password123')

  // ── Admin / Koordinator ──────────────────────────────────────────
  const [admin] = await db.insert(users).values({
    schoolId: school.id,
    role: 'admin',
    name: 'Admin Koordinator',
    email: 'admin@sekolah.sch.id',
    passwordHash: password,
    phone: '081200000000',
  }).returning()
  console.log('✓ Admin (akses penuh):', admin.email)

  // ── Guru Pembimbing (2 guru) ─────────────────────────────────────
  const [teacher1] = await db.insert(users).values({
    schoolId: school.id,
    role: 'teacher',
    name: 'Eko Setiyawan',
    email: 'eko.guru@sekolah.sch.id',
    passwordHash: password,
    phone: '081211111111',
  }).returning()

  const [teacher2] = await db.insert(users).values({
    schoolId: school.id,
    role: 'teacher',
    name: 'Sari Dewi Rahayu',
    email: 'sari.guru@sekolah.sch.id',
    passwordHash: password,
    phone: '081211112222',
  }).returning()
  console.log('✓ Teacher 1 (monitoring + feedback):', teacher1.email)
  console.log('✓ Teacher 2 (monitoring + feedback):', teacher2.email)

  // ── Pembimbing Industri (2 perusahaan) ───────────────────────────
  const [industry1] = await db.insert(users).values({
    schoolId: school.id,
    role: 'industry',
    name: 'Budi Santoso',
    email: 'budi@astra.co.id',
    passwordHash: password,
    phone: '081222222222',
  }).returning()

  const [industry2] = await db.insert(users).values({
    schoolId: school.id,
    role: 'industry',
    name: 'Dewi Anggraeni',
    email: 'dewi@yamaha.co.id',
    passwordHash: password,
    phone: '081222223333',
  }).returning()
  console.log('✓ Industry 1 (lihat + feedback):', industry1.email)
  console.log('✓ Industry 2 (lihat + feedback):', industry2.email)

  // ── Orang Tua ────────────────────────────────────────────────────
  const [parent1] = await db.insert(users).values({
    schoolId: school.id,
    role: 'parent',
    name: 'Siti Rahayu',
    email: 'siti.ortu@gmail.com',
    passwordHash: password,
    phone: '081233333333',
  }).returning()

  const [parent2] = await db.insert(users).values({
    schoolId: school.id,
    role: 'parent',
    name: 'Hendra Gunawan',
    email: 'hendra.ortu@gmail.com',
    passwordHash: password,
    phone: '081233334444',
  }).returning()
  console.log('✓ Parent 1 (read-only via WA):', parent1.email)
  console.log('✓ Parent 2 (read-only via WA):', parent2.email)

  // ── Siswa (3 siswa) ──────────────────────────────────────────────
  const [studentUser1] = await db.insert(users).values({
    schoolId: school.id,
    role: 'student',
    name: 'Ahmad Chairul Fauzan',
    email: '2024001@sekolah.sch.id',
    passwordHash: password,
    phone: '081244444444',
  }).returning()
  const [student1] = await db.insert(students).values({
    userId: studentUser1.id,
    schoolId: school.id,
    nis: '2024001',
    class: 'XII TKRA 1',
    majorId: majorTkro.id,
  }).returning()

  const [studentUser2] = await db.insert(users).values({
    schoolId: school.id,
    role: 'student',
    name: 'Rizky Pratama',
    email: '2024002@sekolah.sch.id',
    passwordHash: password,
    phone: '081244445555',
  }).returning()
  const [student2] = await db.insert(students).values({
    userId: studentUser2.id,
    schoolId: school.id,
    nis: '2024002',
    class: 'XII TKRA 1',
    majorId: majorTkro.id,
  }).returning()

  const [studentUser3] = await db.insert(users).values({
    schoolId: school.id,
    role: 'student',
    name: 'Fira Aulia Sari',
    email: '2024003@sekolah.sch.id',
    passwordHash: password,
    phone: '081244446666',
  }).returning()
  const [student3] = await db.insert(students).values({
    userId: studentUser3.id,
    schoolId: school.id,
    nis: '2024003',
    class: 'XII TKJ 1',
    majorId: majorTkj.id,
  }).returning()

  console.log('✓ Student 1 (isi jurnal):', studentUser1.email, '| NIS:', student1.nis)
  console.log('✓ Student 2 (isi jurnal):', studentUser2.email, '| NIS:', student2.nis)
  console.log('✓ Student 3 (isi jurnal):', studentUser3.email, '| NIS:', student3.nis)

  // ── PKL Placements ───────────────────────────────────────────────
  const [placement1] = await db.insert(pklPlacements).values({
    studentId: student1.id,
    teacherId: teacher1.id,
    industrySupervisorId: industry1.id,
    parentId: parent1.id,
    companyId: companyAstra.id,
    startDate: '2026-01-06',
    endDate: '2026-04-06',
    status: 'active',
  }).returning()

  const [placement2] = await db.insert(pklPlacements).values({
    studentId: student2.id,
    teacherId: teacher1.id,
    industrySupervisorId: industry1.id,
    parentId: parent2.id,
    companyId: companyAstra.id,
    startDate: '2026-01-06',
    endDate: '2026-04-06',
    status: 'active',
  }).returning()

  const [placement3] = await db.insert(pklPlacements).values({
    studentId: student3.id,
    teacherId: teacher2.id,
    industrySupervisorId: industry2.id,
    parentId: parent1.id,
    companyId: companyYamaha.id,
    startDate: '2026-01-06',
    endDate: '2026-04-06',
    status: 'active',
  }).returning()

  console.log('✓ Placement 1:', companyAstra.name, '→', studentUser1.name)
  console.log('✓ Placement 2:', companyAstra.name, '→', studentUser2.name)
  console.log('✓ Placement 3:', companyYamaha.name, '→', studentUser3.name)

  // ── Journals & Feedbacks ─────────────────────────────────────────
  // Ahmad (student1, TKRO, placement1 @ Astra) — 14 entries
  const journalDataS1 = [
    {
      date: '2026-04-01', title: 'Orientasi dan Pengenalan Lingkungan Kerja',
      activityRaw: 'Hari pertama PKL di PT Astra Honda Motor. Diperkenalkan dengan pembimbing industri Pak Budi dan rekan-rekan di divisi Quality Control. Diajak keliling pabrik untuk mengenal area produksi, gudang part, dan ruang QC.',
      activityCompiled: 'Siswa melaksanakan orientasi awal PKL di PT Astra Honda Motor divisi Quality Control. Kegiatan meliputi perkenalan dengan pembimbing industri, tur fasilitas pabrik mencakup area produksi, gudang suku cadang, dan laboratorium QC.',
      newThings: 'Mengetahui alur proses produksi sepeda motor dari awal hingga siap kirim. Mengenal sistem 5S yang diterapkan di seluruh area pabrik.',
      obstacle: 'Belum hafal nama-nama area dan singkatan istilah teknis yang digunakan.',
      solution: 'Mencatat setiap istilah baru di buku catatan dan bertanya kepada karyawan.',
      rtl: 'Pelajari SOP dasar divisi QC dan hafalkan denah area pabrik.',
    },
    {
      date: '2026-04-02', title: 'Belajar Prosedur Inspeksi Part',
      activityRaw: 'Belajar cara menggunakan caliper dan micrometer untuk mengukur dimensi part. Mengamati karyawan senior melakukan inspeksi pada komponen mesin yang masuk dari supplier.',
      activityCompiled: 'Siswa mempelajari penggunaan alat ukur presisi (caliper dan micrometer) dalam proses inspeksi incoming part. Mengamati langsung prosedur pemeriksaan dimensi komponen mesin dari supplier.',
      newThings: 'Cara membaca skala vernier caliper hingga ketelitian 0,02 mm. Istilah "go/no-go gauge" untuk pemeriksaan toleransi.',
      obstacle: 'Kesulitan membaca skala micrometer dengan cepat dan tepat.',
      solution: 'Berlatih berulang kali dengan part yang sama hingga pembacaan konsisten.',
      rtl: 'Latihan mandiri penggunaan caliper dan micrometer pada part-part scrap.',
    },
    {
      date: '2026-04-03', title: 'Praktik Inspeksi Incoming Part',
      activityRaw: 'Ikut serta dalam kegiatan inspeksi part dari supplier. Memeriksa 50 pcs bushing camshaft menggunakan go/no-go gauge. Ditemukan 2 pcs yang tidak sesuai toleransi dan dilaporkan ke supervisor.',
      activityCompiled: 'Siswa terlibat aktif dalam inspeksi incoming part dengan memeriksa 50 unit bushing camshaft menggunakan go/no-go gauge. Berhasil mengidentifikasi 2 unit cacat (4% defect rate) dan menyusun laporan NCR ke supervisor.',
      newThings: 'Prosedur penulisan Non-Conformance Report (NCR) dan tindakan karantina part.',
      obstacle: 'Ragu dalam memutuskan status "reject" karena takut salah.',
      solution: 'Selalu konfirmasi dengan supervisor sebelum men-tag part sebagai reject.',
      rtl: 'Pelajari standar toleransi masing-masing part di buku referensi QC.',
    },
    {
      date: '2026-04-04', title: 'Pengenalan Sistem Dokumentasi QC',
      activityRaw: 'Diajari cara mengisi form inspeksi harian (Daily Inspection Report) secara digital menggunakan sistem SAP yang ada di perusahaan. Juga belajar cara input data hasil pengukuran ke database.',
      activityCompiled: 'Siswa mempelajari sistem dokumentasi QC berbasis SAP untuk pengisian Daily Inspection Report secara digital dan entri data hasil pengukuran ke database perusahaan.',
      newThings: 'Cara navigasi modul QM (Quality Management) di SAP. Pentingnya akurasi data input untuk traceability produk.',
      obstacle: 'Sistem SAP terasa kompleks dengan banyak menu dan kode.',
      solution: 'Meminta panduan cheat sheet dari senior dan berlatih step by step.',
      rtl: 'Latihan input data mandiri dengan data dummy di sistem training.',
    },
    {
      date: '2026-04-07', title: 'Proses Assembly Line Pengamatan',
      activityRaw: 'Mengamati proses assembly sepeda motor di lini produksi. Mencatat urutan pemasangan komponen dari frame, mesin, sistem kelistrikan, hingga finishing. Total cycle time satu unit sekitar 45 detik.',
      activityCompiled: 'Siswa melakukan observasi menyeluruh pada lini assembly produksi sepeda motor, mendokumentasikan urutan perakitan dari rangka hingga finishing dengan cycle time 45 detik per unit.',
      newThings: 'Konsep takt time dan bagaimana menyeimbangkan beban kerja di setiap stasiun assembly.',
      obstacle: 'Sulit mengikuti kecepatan lini yang bergerak cepat saat mencatat.',
      solution: 'Merekam video singkat (seizin supervisor) sebagai referensi catatan.',
      rtl: 'Buat diagram alur proses assembly berdasarkan catatan dan rekaman.',
    },
    {
      date: '2026-04-08', title: 'Inspeksi Outgoing Produk Jadi',
      activityRaw: 'Ikut tim QC melakukan final inspection pada 20 unit motor yang siap kirim ke dealer. Memeriksa kelengkapan aksesori, fungsi rem, lampu, dan kelistrikan. Semua unit lolos inspeksi.',
      activityCompiled: 'Siswa berpartisipasi dalam final inspection 20 unit sepeda motor sebelum pengiriman ke dealer, meliputi pemeriksaan kelengkapan aksesori, sistem pengereman, pencahayaan, dan kelistrikan. Seluruh unit memenuhi standar pengiriman.',
      newThings: 'Checklist final inspection terdiri dari 47 poin pemeriksaan. Pentingnya konsistensi dan ketelitian dalam setiap poin.',
      obstacle: 'Konsentrasi mulai menurun saat memeriksa unit ke-15 dan seterusnya.',
      solution: 'Istirahat singkat 5 menit dan minum air putih sebelum melanjutkan.',
      rtl: 'Cari teknik menjaga konsentrasi saat melakukan pekerjaan repetitif.',
    },
    {
      date: '2026-04-09', title: 'Analisis Defect dengan Diagram Pareto',
      activityRaw: 'Diajari oleh supervisor cara membuat diagram Pareto dari data defect bulan Maret. Data menunjukkan 3 jenis defect terbanyak: cat baret (35%), komponen longgar (28%), dan salah pasang (20%). Membuat presentasi singkat hasilnya.',
      activityCompiled: 'Siswa mempelajari analisis defect menggunakan Diagram Pareto berdasarkan data bulan Maret. Hasil analisis mengidentifikasi tiga defect dominan: cat baret (35%), komponen longgar (28%), dan kesalahan pemasangan (20%). Siswa menyusun presentasi ringkas dari temuan tersebut.',
      newThings: 'Prinsip Pareto 80/20 dalam konteks quality management. Cara membuat diagram Pareto menggunakan Excel.',
      obstacle: 'Data defect di spreadsheet tidak terstruktur sehingga sulit diolah.',
      solution: 'Minta bantuan senior untuk merapikan data terlebih dahulu sebelum diolah.',
      rtl: 'Pelajari penggunaan pivot table di Excel untuk analisis data lebih lanjut.',
    },
    {
      date: '2026-04-10', title: 'Latihan Penggunaan Torque Wrench',
      activityRaw: 'Belajar menggunakan torque wrench untuk mengencangkan baut dengan torsi yang tepat sesuai spesifikasi. Mempraktikkan pada baut-baut di unit training yang sudah tidak terpakai. Torsi yang dilatihkan: 10 Nm, 25 Nm, dan 40 Nm.',
      activityCompiled: 'Siswa mempraktikkan penggunaan torque wrench dengan variasi torsi 10 Nm, 25 Nm, dan 40 Nm pada unit training. Latihan ini bertujuan membangun feel yang tepat untuk pengencanagan baut sesuai spesifikasi teknis.',
      newThings: 'Pentingnya torsi yang tepat — under-torque menyebabkan baut longgar, over-torque bisa merusak thread.',
      obstacle: 'Sulit merasakan perbedaan klik antara torsi yang sudah tercapai dan belum.',
      solution: 'Berlatih berulang kali di berbagai setting torsi dan minta verifikasi dari supervisor.',
      rtl: 'Praktikkan di rumah menggunakan kunci biasa untuk membangun intuisi torsi.',
    },
    {
      date: '2026-04-11', title: 'Kegiatan K3 dan Safety Talk',
      activityRaw: 'Mengikuti sesi safety talk mingguan. Topik: prosedur penanganan bahan kimia berbahaya (oli, coolant, thinner) dan penggunaan APD yang benar. Juga dibahas insiden minor yang terjadi minggu lalu sebagai pembelajaran.',
      activityCompiled: 'Siswa mengikuti safety talk mingguan dengan topik penanganan bahan kimia berbahaya (oli, coolant, thinner) dan prosedur APD yang benar. Pembahasan insiden minor minggu sebelumnya digunakan sebagai studi kasus pembelajaran.',
      newThings: 'SOP penanganan tumpahan bahan kimia: isolasi area, gunakan absorber, lapor ke K3 dalam 5 menit. MSDS (Material Safety Data Sheet) untuk setiap bahan kimia.',
      obstacle: 'Materi K3 sangat banyak dan padat dalam satu sesi.',
      solution: 'Merekam sesi dengan izin dan mencatat poin-poin kritis saja.',
      rtl: 'Review ulang MSDS untuk bahan-bahan yang sering digunakan di area QC.',
    },
    {
      date: '2026-04-14', title: 'Pembuatan Laporan Inspeksi Mingguan',
      activityRaw: 'Ditugaskan membuat rekap laporan inspeksi selama satu minggu. Data dikumpulkan dari form harian, diolah menjadi grafik tren defect, dan disusun menjadi laporan 5 halaman. Laporan dipresentasikan ke supervisor.',
      activityCompiled: 'Siswa menyusun laporan inspeksi mingguan secara mandiri, mulai dari pengumpulan data form harian, visualisasi tren defect dalam grafik, hingga presentasi 5 halaman kepada supervisor.',
      newThings: 'Format pelaporan standar perusahaan mengikuti template ISO 9001. Cara menyampaikan temuan secara profesional ke atasan.',
      obstacle: 'Data dari form harian tidak konsisten formatnya sehingga sulit di-compile.',
      solution: 'Standarisasi format manual sebelum diolah, dan usulkan perbaikan form ke supervisor.',
      rtl: 'Kembangkan template form yang lebih mudah di-compile untuk laporan berikutnya.',
    },
    {
      date: '2026-04-15', title: 'Pengujian Brake Test pada Produk Jadi',
      activityRaw: 'Belajar dan mempraktikkan pengujian rem pada unit jadi menggunakan alat brake tester. Menguji 10 unit dan mencatat hasil gaya pengereman depan dan belakang. Dua unit menunjukkan gaya rem belakang di bawah standar dan dikembalikan ke lini untuk penyetelan.',
      activityCompiled: 'Siswa mempraktikkan pengujian sistem pengereman menggunakan brake tester pada 10 unit produksi jadi. Dua unit teridentifikasi memiliki gaya rem belakang di bawah standar dan dikembalikan ke lini produksi untuk adjustment.',
      newThings: 'Standar gaya pengereman depan minimal 35 kg dan belakang minimal 20 kg untuk tipe ini. Cara melakukan adjustment tali rem.',
      obstacle: 'Kalibrasi alat brake tester ternyata perlu dilakukan setiap pagi — hampir terlewat.',
      solution: 'Membuat checklist kalibrasi harian agar tidak terlewat lagi.',
      rtl: 'Pelajari prosedur kalibrasi semua alat ukur di divisi QC.',
    },
    {
      date: '2026-04-16', title: 'Pengenalan Root Cause Analysis (RCA)',
      activityRaw: 'Supervisor mengajari metode 5 Why untuk menemukan akar masalah defect. Studi kasus: baut tangki kendor pada produk jadi. Hasil RCA menunjukkan bahwa torque wrench station 12 sudah tidak akurat dan perlu kalibrasi.',
      activityCompiled: 'Siswa mempelajari metode Root Cause Analysis menggunakan pendekatan 5 Why. Studi kasus baut tangki kendor diselesaikan dengan menemukan akar masalah berupa torque wrench Station 12 yang membutuhkan kalibrasi.',
      newThings: 'Teknik 5 Why dan Fishbone Diagram sebagai tools RCA. Pentingnya menyerang akar masalah, bukan gejala.',
      obstacle: 'Sulit membedakan antara "penyebab" dan "gejala" dalam proses 5 Why.',
      solution: 'Tanya "kenapa ini bisa terjadi?" secara sistematis dan konsisten di setiap level.',
      rtl: 'Latih RCA pada kasus defect minor yang ditemukan minggu ini.',
    },
    {
      date: '2026-04-17', title: 'Praktik 5S di Area Kerja',
      activityRaw: 'Ikut kegiatan 5S bulanan di area QC. Tugas: sorting tools yang sudah tidak digunakan, memberi label pada semua rak dan laci, dan memastikan semua alat ukur tersimpan di tempat yang benar. Selesai dalam 3 jam.',
      activityCompiled: 'Siswa berpartisipasi aktif dalam kegiatan 5S bulanan di area QC, meliputi pemilahan peralatan (Seiri), pelabelan rak dan laci (Seiton), dan pengembalian alat ukur ke tempatnya (Seiketsu). Kegiatan selesai dalam 3 jam.',
      newThings: 'Filosofi 5S bukan sekadar bersih-bersih, tapi sistem untuk efisiensi dan mencegah kesalahan.',
      obstacle: 'Beberapa tools sudah tidak ada tagnya sehingga sulit dikembalikan ke tempat semula.',
      solution: 'Buat tag baru dan dokumentasikan lokasi penyimpanan yang tepat bersama supervisor.',
      rtl: 'Inisiatif membuat visual management sederhana untuk area workstation sendiri.',
    },
    {
      date: '2026-04-21', title: 'Evaluasi dan Review Capaian 4 Minggu',
      activityRaw: 'Melakukan review capaian PKL bersama Pak Budi dan Pak Eko. Mendapat penilaian positif pada ketelitian inspeksi dan kedisiplinan. Diminta untuk meningkatkan kecepatan kerja dan inisiatif bertanya. Target minggu depan: bisa melakukan inspeksi mandiri tanpa didampingi.',
      activityCompiled: 'Siswa menjalani sesi review capaian 4 minggu PKL bersama pembimbing industri dan guru pembimbing. Penilaian positif diterima pada aspek ketelitian dan kedisiplinan, dengan area pengembangan pada kecepatan kerja dan inisiatif. Target periode berikutnya adalah inspeksi mandiri.',
      newThings: 'Pentingnya self-assessment dan menerima feedback secara konstruktif. Cara menetapkan target SMART dalam pengembangan diri.',
      obstacle: 'Merasa canggung saat menerima kritik di depan supervisor senior.',
      solution: 'Fokus pada isi kritik, bukan perasaan pribadi, dan catat semua masukan.',
      rtl: 'Susun action plan pribadi untuk meningkatkan kecepatan dan inisiatif.',
    },
  ]

  const journalDataS2 = [
    {
      date: '2026-04-01', title: 'Hari Pertama di PT Astra Honda Motor',
      activityRaw: 'Hari pertama PKL bersama Ahmad. Orientasi lingkungan kerja dan perkenalan tim QC. Mendapat seragam dan kartu akses. Mengikuti briefing safety wajib selama 2 jam.',
      activityCompiled: 'Siswa melaksanakan orientasi hari pertama PKL di PT Astra Honda Motor, mencakup perkenalan tim QC, pembagian seragam dan kartu akses, serta mengikuti safety briefing wajib selama 2 jam.',
      newThings: 'Prosedur keselamatan dasar di area pabrik: jalur evakuasi, titik assembly point, dan rambu-rambu K3.',
      obstacle: 'Terlalu banyak informasi dalam satu hari sehingga sulit dicerna semua.',
      solution: 'Prioritaskan informasi keselamatan dulu, yang lain dicatat untuk dipelajari malam.',
      rtl: 'Review ulang semua materi orientasi hari ini sebelum tidur.',
    },
    {
      date: '2026-04-03', title: 'Mencoba Inspeksi Part Pertama Kali',
      activityRaw: 'Bersama Ahmad, mencoba melakukan inspeksi bushing camshaft. Menggunakan caliper dan go/no-go gauge. Masih perlu pendampingan penuh dari senior. Berhasil memeriksa 20 pcs.',
      activityCompiled: 'Siswa melaksanakan inspeksi incoming part perdana berupa bushing camshaft menggunakan caliper dan go/no-go gauge dengan pendampingan penuh senior QC. Berhasil menyelesaikan pemeriksaan 20 unit.',
      newThings: 'Perbedaan antara toleransi H7 dan h6 dalam sistem toleransi ISO. Cara menyimpan alat ukur agar tidak rusak.',
      obstacle: 'Caliper sempat terjatuh dan perlu dicek ulang akurasinya.',
      solution: 'Selalu kalibrasi ulang alat setelah jatuh atau terbentur sebelum digunakan.',
      rtl: 'Pelajari kode toleransi ISO dan artinya.',
    },
    {
      date: '2026-04-08', title: 'Mengamati Proses Produksi dari Awal',
      activityRaw: 'Hari ini khusus mengamati alur produksi dari receiving material hingga shipping. Mencatat setiap tahapan dan waktu prosesnya. Total ada 12 stasiun kerja di lini utama.',
      activityCompiled: 'Siswa melakukan observasi menyeluruh pada alur produksi dari receiving material hingga shipping, mendokumentasikan 12 stasiun kerja di lini utama beserta waktu proses masing-masing.',
      newThings: 'Value Stream Mapping — cara memetakan alur produksi untuk identifikasi pemborosan. Konsep bottleneck dan dampaknya pada output produksi.',
      obstacle: 'Tidak semua stasiun bisa diobservasi karena area restricted.',
      solution: 'Tanya supervisor tentang proses di area restricted melalui dokumen atau foto.',
      rtl: 'Buat draft value stream map sederhana dari observasi hari ini.',
    },
    {
      date: '2026-04-10', title: 'Latihan Dokumentasi Inspeksi',
      activityRaw: 'Ditugaskan mengisi form inspeksi secara mandiri untuk pertama kali. Memeriksa 30 pcs valve dan mendokumentasikan hasilnya di sistem. Supervisor mengecek hasilnya dan menemukan 1 kesalahan input.',
      activityCompiled: 'Siswa melaksanakan dokumentasi inspeksi secara mandiri pertama kali, memeriksa 30 unit valve dan menginput data ke sistem. Supervisor mengidentifikasi satu kesalahan input yang menjadi bahan pembelajaran.',
      newThings: 'Double-check sebelum submit data adalah kebiasaan wajib. Format angka harus konsisten: koma untuk desimal, bukan titik.',
      obstacle: 'Salah format input angka desimal menyebabkan data error di sistem.',
      solution: 'Buat reminder sticky note di monitor tentang format input yang benar.',
      rtl: 'Selalu preview data sebelum submit dan minta peer review dari teman sebelum submit.',
    },
    {
      date: '2026-04-14', title: 'Ikut Rapat Tim QC',
      activityRaw: 'Pertama kali diizinkan mengikuti rapat mingguan tim QC. Topik: review defect rate minggu ini dan rencana improvement. Banyak istilah teknis yang belum familiar. Mencatat sebanyak mungkin.',
      activityCompiled: 'Siswa pertama kali menghadiri rapat mingguan tim QC. Agenda mencakup review defect rate dan perencanaan improvement. Siswa aktif mencatat meskipun masih banyak istilah teknis yang perlu dipelajari lebih lanjut.',
      newThings: 'Format rapat tim menggunakan PDCA cycle. Setiap improvement harus punya PIC (Person in Charge) dan deadline.',
      obstacle: 'Banyak singkatan dan istilah teknis yang tidak diketahui artinya.',
      solution: 'Buat glosarium pribadi dan isi setiap istilah baru yang ditemui.',
      rtl: 'Lengkapi glosarium dengan 10 istilah baru dari rapat tadi.',
    },
    {
      date: '2026-04-17', title: 'Kegiatan 5S Bersama Tim',
      activityRaw: 'Ikut kegiatan 5S bulanan seperti Ahmad. Bagian tugas: area gudang penyimpanan alat ukur. Membersihkan, mengelompokkan, dan memberi label semua alat. Ditemukan 3 alat yang masa kalibrasinya sudah lewat.',
      activityCompiled: 'Siswa berpartisipasi dalam kegiatan 5S bulanan pada area gudang alat ukur, melaksanakan pembersihan, pengelompokan, dan pelabelan. Berhasil mengidentifikasi 3 alat ukur dengan kalibrasi kedaluwarsa yang perlu segera ditindaklanjuti.',
      newThings: 'Alat ukur wajib dikalibrasi secara berkala — ada stiker kalibrasi yang mencantumkan tanggal berlaku. Alat yang kedaluwarsa tidak boleh digunakan sampai dikalibrasi ulang.',
      obstacle: 'Beberapa alat tidak ada stiker kalibrasinya sama sekali.',
      solution: 'Laporkan ke supervisor dan tandai dengan label "quarantine" sampai dikalibrasi.',
      rtl: 'Usulkan sistem tracking kalibrasi yang lebih terorganisir ke supervisor.',
    },
    {
      date: '2026-04-21', title: 'Review Capaian dan Rencana Ke Depan',
      activityRaw: 'Review bersama Pak Budi dan Pak Eko. Mendapat apresiasi atas inisiatif menemukan alat kalibrasi kedaluwarsa. Diminta untuk minggu depan bisa membantu junior yang baru masuk PKL.',
      activityCompiled: 'Siswa menjalani sesi review capaian bersama pembimbing industri dan guru. Mendapatkan apresiasi khusus atas inisiatif identifikasi alat kalibrasi kedaluwarsa. Ditugaskan menjadi mentor junior pada periode berikutnya.',
      newThings: 'Menjadi mentor adalah bagian dari pengembangan soft skill kepemimpinan. Cara memberikan arahan yang konstruktif kepada rekan yang lebih junior.',
      obstacle: 'Belum percaya diri untuk mengajar orang lain karena merasa masih banyak yang belum tahu.',
      solution: 'Ajarkan apa yang sudah dikuasai saja, akui dengan jujur jika ada yang tidak tahu.',
      rtl: 'Siapkan materi orientasi singkat untuk membantu junior yang datang.',
    },
  ]

  const journalDataS3 = [
    {
      date: '2026-04-01', title: 'Hari Pertama di Yamaha — Divisi IT & Jaringan',
      activityRaw: 'Orientasi di PT Yamaha Indonesia Motor Manufacturing divisi IT. Diperkenalkan dengan Bu Dewi dan tim. Mendapat gambaran infrastruktur jaringan perusahaan: 3 gedung, sekitar 500 node aktif.',
      activityCompiled: 'Siswa melaksanakan orientasi di divisi IT PT Yamaha Indonesia Motor Manufacturing. Mendapat gambaran infrastruktur jaringan perusahaan yang mencakup 3 gedung dengan sekitar 500 node aktif.',
      newThings: 'Topologi jaringan perusahaan menggunakan kombinasi star dan hierarchical. Ada 3 layer: core, distribution, dan access switch.',
      obstacle: 'Scope infrastruktur jaringan jauh lebih besar dari yang dibayangkan sebelumnya.',
      solution: 'Fokus pada satu area dulu dan perlahan perluas pemahaman ke area lain.',
      rtl: 'Buat diagram topologi jaringan dari hasil orientasi hari ini.',
    },
    {
      date: '2026-04-02', title: 'Belajar Konfigurasi Switch Cisco',
      activityRaw: 'Diajari cara akses switch menggunakan putty dan melakukan konfigurasi dasar. Mempraktikkan perintah show interfaces, show vlan, dan show running-config. Latihan di switch lab yang disediakan.',
      activityCompiled: 'Siswa mempelajari konfigurasi dasar switch Cisco melalui CLI menggunakan PuTTY, mempraktikkan perintah show interfaces, show vlan, dan show running-config pada perangkat lab.',
      newThings: 'Perbedaan antara mode user EXEC, privileged EXEC, dan global config. Pentingnya selalu "copy run start" setelah konfigurasi.',
      obstacle: 'Perintah CLI Cisco berbeda dengan yang dipelajari di sekolah menggunakan simulator.',
      solution: 'Buat cheat sheet perintah Cisco dan bandingkan dengan catatan sekolah.',
      rtl: 'Hafal 20 perintah CLI Cisco yang paling sering digunakan.',
    },
    {
      date: '2026-04-03', title: 'Troubleshooting Koneksi User',
      activityRaw: 'Diminta membantu troubleshoot masalah koneksi internet salah satu user di departemen HR. Dilakukan pengecekan kabel, ping test, dan cek konfigurasi IP. Masalah ditemukan: kabel patch putus di dalam karena terjepit meja.',
      activityCompiled: 'Siswa melaksanakan troubleshooting koneksi internet user di departemen HR secara bertahap: pengecekan fisik kabel, ping test, dan verifikasi konfigurasi IP. Akar masalah teridentifikasi berupa kabel patch putus akibat terjepit furniture.',
      newThings: 'Urutan troubleshooting jaringan: physical → data link → network → transport → application (OSI model). Cara crimping kabel Cat6.',
      obstacle: 'Sulit mendiagnosis masalah karena tidak tahu histori sebelumnya.',
      solution: 'Mulai dari layer paling bawah OSI model secara sistematis.',
      rtl: 'Pelajari lebih dalam cara membaca MAC address table di switch untuk troubleshooting.',
    },
    {
      date: '2026-04-07', title: 'Konfigurasi VLAN untuk Departemen Baru',
      activityRaw: 'Ditugaskan membantu konfigurasi VLAN baru untuk departemen Marketing yang pindah ke gedung B. Langkah-langkah: buat VLAN 40 di core switch, setting trunk, dan konfigurasi IP helper untuk DHCP.',
      activityCompiled: 'Siswa membantu konfigurasi VLAN 40 untuk departemen Marketing di gedung B, meliputi pembuatan VLAN di core switch, konfigurasi trunk port, dan pengaturan IP helper untuk layanan DHCP.',
      newThings: 'Pentingnya VLAN dalam keamanan segmentasi jaringan. Cara kerja IP helper-address untuk DHCP relay antar VLAN.',
      obstacle: 'Lupa menambahkan VLAN di interface trunk sehingga traffic tidak lewat.',
      solution: 'Cek dengan "show interfaces trunk" untuk memverifikasi VLAN allowed.',
      rtl: 'Buat checklist konfigurasi VLAN agar tidak ada langkah yang terlewat.',
    },
    {
      date: '2026-04-09', title: 'Monitoring Jaringan dengan PRTG',
      activityRaw: 'Diperkenalkan dengan sistem monitoring jaringan PRTG. Belajar cara baca dashboard, interpretasi alert, dan cara menambahkan device baru ke monitoring. Juga belajar cara set threshold untuk alerting.',
      activityCompiled: 'Siswa mempelajari sistem monitoring jaringan PRTG Network Monitor, mencakup pembacaan dashboard, interpretasi alert, penambahan device baru, dan konfigurasi threshold untuk alerting.',
      newThings: 'SNMP v2c dan v3 untuk monitoring device. Pentingnya proactive monitoring dibanding reactive troubleshooting.',
      obstacle: 'SNMP community string beberapa perangkat lama tidak terdokumentasi.',
      solution: 'Coba default community string dulu, jika tidak berhasil konsultasi dengan senior.',
      rtl: 'Buat inventori perangkat lengkap dengan SNMP community string-nya.',
    },
    {
      date: '2026-04-10', title: 'Backup Konfigurasi Router dan Switch',
      activityRaw: 'Melakukan backup konfigurasi rutin untuk 5 router dan 12 switch menggunakan TFTP server. Membuat script sederhana menggunakan Python untuk otomatisasi backup. Script masih perlu disempurnakan.',
      activityCompiled: 'Siswa melaksanakan backup konfigurasi rutin pada 5 router dan 12 switch menggunakan TFTP server, sekaligus membuat script Python sederhana untuk otomatisasi proses backup.',
      newThings: 'Library Netmiko di Python untuk otomatisasi perangkat jaringan. Pentingnya backup terjadwal dan verifikasi hasil backup.',
      obstacle: 'Script Python gagal connect ke 3 switch karena perbedaan versi SSH.',
      solution: 'Tambahkan parameter device_type yang tepat di Netmiko dan update versi library.',
      rtl: 'Sempurnakan script agar bisa handle berbagai versi SSH dan device type.',
    },
    {
      date: '2026-04-14', title: 'Instalasi Access Point Baru',
      activityRaw: 'Membantu instalasi 3 unit access point baru di area kantin dan lobby. Proses: mounting AP, routing kabel, konfigurasi SSID dan security, dan tes coverage dengan wifi analyzer.',
      activityCompiled: 'Siswa berpartisipasi dalam instalasi 3 unit access point baru di area kantin dan lobby, meliputi pemasangan fisik, routing kabel, konfigurasi SSID dan keamanan, serta pengujian coverage menggunakan wifi analyzer.',
      newThings: 'Cara menentukan posisi AP optimal menggunakan heat map. Pentingnya pemilihan channel yang tidak overlap untuk menghindari interferensi.',
      obstacle: 'Salah satu AP tidak mau join controller karena firmware tidak kompatibel.',
      solution: 'Update firmware AP ke versi terbaru sebelum di-join ke controller.',
      rtl: 'Pelajari cara membaca dan menginterpretasi wifi heat map.',
    },
    {
      date: '2026-04-16', title: 'Setup Firewall Rules',
      activityRaw: 'Belajar dan mempraktikkan konfigurasi firewall rules di Fortigate. Menambahkan rule untuk mengizinkan akses aplikasi baru HR dari VLAN internal ke server DMZ. Harus sangat hati-hati agar tidak mengganggu rules yang ada.',
      activityCompiled: 'Siswa mempelajari konfigurasi firewall rules pada perangkat Fortigate, mempraktikkan penambahan rule akses dari VLAN internal ke server DMZ untuk aplikasi HR baru dengan mempertimbangkan dampak minimal pada konfigurasi existing.',
      newThings: 'Prinsip least privilege dalam firewall rules — hanya buka apa yang perlu dibuka. Cara menggunakan policy test di Fortigate untuk verifikasi rule sebelum diaktifkan.',
      obstacle: 'Rule baru secara tidak sengaja konflik dengan rule yang ada sehingga ada traffic yang terblokir.',
      solution: 'Gunakan policy test dan session monitor untuk verifikasi sebelum apply ke production.',
      rtl: 'Pelajari best practice urutan firewall rules untuk menghindari konflik.',
    },
    {
      date: '2026-04-17', title: 'Dokumentasi Jaringan',
      activityRaw: 'Ditugaskan membuat dokumentasi jaringan yang up-to-date menggunakan draw.io. Memetakan semua perangkat aktif, IP address, koneksi antar gedung, dan keterangan VLAN. Butuh 5 jam untuk area gedung A saja.',
      activityCompiled: 'Siswa mengerjakan pembuatan dokumentasi jaringan terkini menggunakan draw.io, memetakan seluruh perangkat aktif, IP address, interkoneksi antar gedung, dan informasi VLAN di area gedung A.',
      newThings: 'Network documentation adalah aset berharga yang sering diabaikan tapi sangat berguna saat troubleshooting. Standar simbol Cisco untuk diagram jaringan.',
      obstacle: 'Beberapa konfigurasi aktual berbeda dari dokumentasi lama yang ada.',
      solution: 'Verifikasi langsung ke perangkat menggunakan show command dan update dokumentasi.',
      rtl: 'Selesaikan dokumentasi gedung B dan C minggu depan.',
    },
    {
      date: '2026-04-21', title: 'Presentasi Proyek Mini: Script Backup Otomatis',
      activityRaw: 'Mempresentasikan hasil script Python backup otomatis yang sudah disempurnakan kepada tim IT. Script sekarang bisa backup 17 perangkat dalam 8 menit dan menyimpan riwayat 30 hari. Tim memberi feedback positif dan menyarankan penambahan fitur notifikasi email.',
      activityCompiled: 'Siswa mempresentasikan script Python backup otomatis yang telah dikembangkan kepada tim IT, memperagakan kemampuan backup 17 perangkat dalam 8 menit dengan retensi riwayat 30 hari. Tim memberikan apresiasi dan menyarankan penambahan fitur notifikasi email.',
      newThings: 'Cara menyampaikan hasil teknis kepada audiens non-teknis. Pentingnya dokumentasi kode agar bisa dikembangkan oleh orang lain.',
      obstacle: 'Saat demo, ada 1 perangkat yang gagal dibackup karena koneksi unstable.',
      solution: 'Tambahkan retry mechanism dan error logging di script untuk kasus seperti ini.',
      rtl: 'Implementasikan notifikasi email dan retry mechanism dalam script.',
    },
  ]

  // Helper to insert one journal entry
  async function insertJournal(
    sId: string, pId: string,
    d: typeof journalDataS1[0],
  ) {
    const [j] = await db.insert(journals).values({
      studentId: sId,
      placementId: pId,
      date: d.date,
      title: d.title,
      activityRaw: d.activityRaw,
      activityCompiled: d.activityCompiled,
      newThings: d.newThings,
      obstacle: d.obstacle,
      solution: d.solution,
      rtl: d.rtl,
      aiProcessed: true,
    }).returning()
    return j
  }

  // Insert all journals
  const s1Journals = []
  for (const d of journalDataS1) {
    s1Journals.push(await insertJournal(student1.id, placement1.id, d))
  }
  const s2Journals = []
  for (const d of journalDataS2) {
    s2Journals.push(await insertJournal(student2.id, placement2.id, d))
  }
  const s3Journals = []
  for (const d of journalDataS3) {
    s3Journals.push(await insertJournal(student3.id, placement3.id, d))
  }
  console.log(`✓ Journals: ${s1Journals.length} (Ahmad) + ${s2Journals.length} (Rizky) + ${s3Journals.length} (Fira)`)

  // ── Feedbacks ────────────────────────────────────────────────────
  const feedbackData: { journalIdx: number; student: 1 | 2 | 3; reviewer: 'teacher1' | 'teacher2' | 'industry1' | 'industry2'; content: string }[] = [
    // Ahmad (s1) journals — feedback from teacher1 (Eko) and industry1 (Budi)
    { journalIdx: 0, student: 1, reviewer: 'teacher1', content: 'Bagus Ahmad, kesan pertama yang positif. Pastikan kamu juga catat nama-nama pembimbing dan rekan yang ditemui hari ini.' },
    { journalIdx: 2, student: 1, reviewer: 'industry1', content: 'Sangat teliti dalam menemukan part yang tidak sesuai. Tetap percaya diri dalam memberikan keputusan reject, asal prosedurnya diikuti.' },
    { journalIdx: 2, student: 1, reviewer: 'teacher1', content: 'Bagus sekali Ahmad! Menemukan 2 part defect di hari ketiga sudah menunjukkan pemahaman yang baik tentang quality control.' },
    { journalIdx: 6, student: 1, reviewer: 'teacher1', content: 'Analisis Pareto-nya sangat baik. Kamu sudah mulai berpikir seperti seorang quality engineer. Pertahankan!' },
    { journalIdx: 6, student: 1, reviewer: 'industry1', content: 'Presentasinya bagus Ahmad. Minggu depan coba kamu juga usulkan improvement action untuk tiap jenis defect yang kamu temukan.' },
    { journalIdx: 9, student: 1, reviewer: 'teacher1', content: 'Laporan mingguan sudah sangat profesional. Inisiatif untuk merapikan format form adalah nilai tambah yang besar.' },
    { journalIdx: 11, student: 1, reviewer: 'industry1', content: 'RCA dengan 5 Why sudah dilakukan dengan benar. Ingat, temuan akar masalah harus selalu ditindaklanjuti dengan action plan konkret.' },
    { journalIdx: 13, student: 1, reviewer: 'teacher1', content: 'Jurnal akhir yang sangat komprehensif. Kamu berkembang pesat Ahmad. Teruslah tumbuhkan inisiatif dan kecepatan kerja kamu.' },
    { journalIdx: 13, student: 1, reviewer: 'industry1', content: 'Terima kasih Ahmad sudah bekerja keras selama ini. Capaian 4 minggu kamu sangat memuaskan. Semangat untuk bulan berikutnya!' },

    // Rizky (s2) journals — feedback from teacher1 (Eko) and industry1 (Budi)
    { journalIdx: 0, student: 2, reviewer: 'teacher1', content: 'Rizky, catatan orientasinya sudah baik. Pastikan kamu juga tulis nama orang-orang penting yang kamu temui.' },
    { journalIdx: 2, student: 2, reviewer: 'industry1', content: 'Inisiatif Rizky dalam mengamati value stream sangat baik. Teruslah berpikir sistematis.' },
    { journalIdx: 4, student: 2, reviewer: 'teacher1', content: 'Senang melihat Rizky mulai mengikuti rapat tim. Jangan ragu bertanya meskipun masih banyak istilah yang belum familiar.' },
    { journalIdx: 6, student: 2, reviewer: 'industry1', content: 'Penemuan alat kalibrasi yang kedaluwarsa adalah kontribusi nyata Rizky untuk tim. Kerja bagus!' },
    { journalIdx: 6, student: 2, reviewer: 'teacher1', content: 'Rizky berkembang dengan sangat baik. Kepercayaan tim untuk menjadi mentor junior adalah bukti kerja kerasmu.' },

    // Fira (s3) journals — feedback from teacher2 (Sari) and industry2 (Dewi)
    { journalIdx: 0, student: 3, reviewer: 'teacher2', content: 'Fira, senang melihat antusiasmu di hari pertama. Infrastruktur jaringan perusahaan memang besar, tapi kamu pasti bisa pelajari perlahan.' },
    { journalIdx: 2, student: 3, reviewer: 'industry2', content: 'Fira sudah menunjukkan kemampuan troubleshooting yang sistematis. Pendekatan OSI model dari bawah adalah cara yang benar.' },
    { journalIdx: 2, student: 3, reviewer: 'teacher2', content: 'Keterampilan troubleshooting Fira sudah baik. Teruslah kembangkan kemampuan analitis kamu.' },
    { journalIdx: 3, student: 3, reviewer: 'industry2', content: 'Konfigurasi VLAN yang berhasil adalah pencapaian besar untuk PKL minggu pertama. Checklist yang kamu buat akan sangat berguna.' },
    { journalIdx: 5, student: 3, reviewer: 'teacher2', content: 'Script Python untuk backup jaringan sangat inovatif Fira! Ini menunjukkan kemampuan berpikir di luar kotak.' },
    { journalIdx: 7, student: 3, reviewer: 'industry2', content: 'Fira sangat berhati-hati dalam konfigurasi firewall. Sikap ini wajib dimiliki seorang network engineer.' },
    { journalIdx: 7, student: 3, reviewer: 'teacher2', content: 'Pemahaman Fira tentang keamanan jaringan sudah di atas rata-rata. Pertahankan prinsip least privilege ini.' },
    { journalIdx: 9, student: 3, reviewer: 'industry2', content: 'Presentasi script backup otomatis sangat membanggakan. Script ini akan kami gunakan secara resmi di tim IT. Kerja bagus Fira!' },
    { journalIdx: 9, student: 3, reviewer: 'teacher2', content: 'Fira luar biasa! Menghasilkan karya nyata yang dipakai perusahaan adalah capaian yang sangat membanggakan.' },
  ]

  const reviewerMap = {
    teacher1: { id: teacher1.id, role: 'teacher' },
    teacher2: { id: teacher2.id, role: 'teacher' },
    industry1: { id: industry1.id, role: 'industry' },
    industry2: { id: industry2.id, role: 'industry' },
  }

  let feedbackCount = 0
  for (const f of feedbackData) {
    const journalList = f.student === 1 ? s1Journals : f.student === 2 ? s2Journals : s3Journals
    const journal = journalList[f.journalIdx]
    if (!journal) continue
    const reviewer = reviewerMap[f.reviewer]
    await db.insert(feedbacks).values({
      journalId: journal.id,
      reviewerId: reviewer.id,
      reviewerRole: reviewer.role,
      content: f.content,
      source: 'web',
    })
    feedbackCount++
  }
  console.log(`✓ Feedbacks: ${feedbackCount} total`)

  // ── Competency Guidelines ────────────────────────────────────────
  await db.insert(competencyGuidelines).values({
    schoolId: school.id,
    major: 'Teknik Kendaraan Ringan Otomotif',
    title: 'Kompetensi PKL TKRO',
    competencies: [
      { name: 'Quality Control & Inspeksi', indicators: ['inspeksi part', 'pemeriksaan kualitas', 'pengukuran toleransi'], weight: 25 },
      { name: 'Proses Produksi & Perakitan', indicators: ['perakitan mesin', 'assembly line', 'proses manufaktur'], weight: 30 },
      { name: 'K3 & 5S', indicators: ['keselamatan kerja', 'APD', 'kebersihan area', '5S'], weight: 20 },
      { name: 'Maintenance & Perbaikan', indicators: ['perawatan mesin', 'troubleshooting', 'perbaikan'], weight: 15 },
      { name: 'Dokumentasi & Laporan', indicators: ['laporan harian', 'checklist', 'dokumentasi'], weight: 10 },
    ],
    keywords: ['inspeksi', 'quality', 'perakitan', 'assembly', 'APD', 'K3', 'mesin', 'spare part', 'produksi'],
  })

  await db.insert(competencyGuidelines).values({
    schoolId: school.id,
    major: 'Teknik Komputer Jaringan',
    title: 'Kompetensi PKL TKJ',
    competencies: [
      { name: 'Instalasi & Konfigurasi Jaringan', indicators: ['setting router', 'konfigurasi switch', 'VLAN'], weight: 30 },
      { name: 'Troubleshooting Jaringan', indicators: ['diagnosa masalah', 'ping test', 'traceroute'], weight: 25 },
      { name: 'Administrasi Server', indicators: ['setting server', 'DNS', 'DHCP', 'web server'], weight: 25 },
      { name: 'Keamanan Jaringan', indicators: ['firewall', 'VPN', 'monitoring'], weight: 20 },
    ],
    keywords: ['jaringan', 'network', 'router', 'switch', 'server', 'konfigurasi', 'troubleshoot', 'internet'],
  })

  console.log('✓ Guideline TKRO + TKJ seeded')

  // ── RBAC: seed permissions ──────────────────────────────────────
  await RbacService.seedPermissions()
  console.log('✓ Permissions seeded')

  // ── Demo roles (custom, additive on top of tipe pengguna) ───────
  const { SYSTEM_ROLE_PERMISSIONS } = await import('../services/rbac.service.ts')
  const roleDefs = [
    {
      name: 'Koordinator PKL',
      slug: 'koordinator-pkl',
      description: 'Mengkoordinasi program PKL — akses kelola kompetensi & pengguna',
      permissionKeys: [...SYSTEM_ROLE_PERMISSIONS['teacher'], 'guidelines:manage', 'users:manage'],
    },
    {
      name: 'Wali Kelas',
      slug: 'wali-kelas',
      description: 'Monitoring & evaluasi AI siswa walinya',
      permissionKeys: SYSTEM_ROLE_PERMISSIONS['teacher'],
    },
    {
      name: 'Guru Mapel',
      slug: 'guru-mapel',
      description: 'Lihat jurnal & beri feedback, tanpa evaluasi AI',
      permissionKeys: ['journals:read', 'feedback:write', 'students:read'],
    },
  ]

  const roleIds: Record<string, string> = {}
  for (const def of roleDefs) {
    try {
      const role = await RbacService.createRole({ ...def, schoolId: school.id })
      roleIds[def.slug] = role.id
      console.log('✓ Role seeded:', def.name)
    } catch {
      console.log('skip (exists):', def.slug)
    }
  }

  // Assign roles: teacher1 (Eko) → Koordinator PKL + Wali Kelas, teacher2 (Sari) → Wali Kelas
  if (roleIds['koordinator-pkl']) await RbacService.assignRole(teacher1.id, roleIds['koordinator-pkl'])
  if (roleIds['wali-kelas'])      await RbacService.assignRole(teacher1.id, roleIds['wali-kelas'])
  if (roleIds['wali-kelas'])      await RbacService.assignRole(teacher2.id, roleIds['wali-kelas'])
  console.log('✓ Roles assigned: Eko → Koordinator PKL + Wali Kelas | Sari → Wali Kelas')

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           ✅ SEED COMPLETE — PKL Smart Journal                   ║
╠══════════════════════════════════════════════════════════════════╣
║  Password semua akun: password123                                ║
╠══════════════════════════════════════════════════════════════════╣
║  ROLE           EMAIL                         ABAC SCOPE        ║
╠══════════════════════════════════════════════════════════════════╣
║  Admin          admin@sekolah.sch.id          Semua siswa       ║
╠──────────────────────────────────────────────────────────────────╣
║  Guru 1 (Eko)   eko.guru@sekolah.sch.id       Ahmad + Rizky     ║
║  Guru 2 (Sari)  sari.guru@sekolah.sch.id      Fira              ║
╠──────────────────────────────────────────────────────────────────╣
║  Industri 1     budi@astra.co.id              Ahmad + Rizky     ║
║  Industri 2     dewi@yamaha.co.id             Fira              ║
╠──────────────────────────────────────────────────────────────────╣
║  Ortu 1 (Siti)  siti.ortu@gmail.com           Ahmad + Fira      ║
║  Ortu 2 (Hendra)hendra.ortu@gmail.com         Rizky             ║
╠──────────────────────────────────────────────────────────────────╣
║  Siswa 1        2024001@sekolah.sch.id         14 jurnal         ║
║  (Ahmad)        NIS: 2024001                                     ║
║  Siswa 2        2024002@sekolah.sch.id         7 jurnal          ║
║  (Rizky)        NIS: 2024002                                     ║
║  Siswa 3        2024003@sekolah.sch.id         10 jurnal         ║
║  (Fira)         NIS: 2024003                                     ║
╠──────────────────────────────────────────────────────────────────╣
║  ABAC TEST:                                                      ║
║  Login sbg Eko → hanya lihat jurnal Ahmad & Rizky               ║
║  Login sbg Sari → hanya lihat jurnal Fira                        ║
║  Login sbg Siti (ortu) → hanya lihat jurnal Ahmad & Fira        ║
╚══════════════════════════════════════════════════════════════════╝
`)

  process.exit(0)
}

seed().catch((e) => {
  console.error('❌ Seed failed:', e.message)
  process.exit(1)
})
