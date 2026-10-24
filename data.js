/* =========================================================
   data.js — Data akademik (contoh) + penyimpanan state
   ---------------------------------------------------------
   Semua tanggal dibuat RELATIF terhadap hari ini, sehingga
   demo selalu terlihat "hidup" kapan pun dibuka.
   Saat tersambung ke backend, ganti isi objek DB.* dengan
   hasil fetch() dari API kampus.
   ========================================================= */
(function () {
  'use strict';

  /** Tanggal relatif: hari ini + n hari, jam h:m */
  const at = (days, h = 23, m = 59) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(h, m, 0, 0);
    return d;
  };

  // Jumlah hari menuju Senin berikutnya (dipakai untuk jadwal UTS/UAS)
  const toMonday = ((8 - new Date().getDay()) % 7) || 7;

  /* ---------------- Mata kuliah semester berjalan ---------------- */
  // hari: 1=Senin ... 5=Jumat
  const courses = [
    { id: 'IF301', nama: 'Pemrograman Web Lanjut',        sks: 3, dosen: 'Dr. Budi Santoso, M.Kom.',  hari: 1, mulai: '08:00', selesai: '10:30', ruang: 'Lab 3.2', warna: '#f5b700',
      hadir: [1,1,1,1,1,1,1], nilai: { tugas: 88, kuis: 90, uts: null, uas: null } },
    { id: 'IF302', nama: 'Basis Data Lanjut',             sks: 3, dosen: 'Siti Nurhaliza, M.T.',      hari: 1, mulai: '13:00', selesai: '15:30', ruang: 'R. 2.04', warna: '#6366f1',
      hadir: [1,1,0,1,1,1,1], nilai: { tugas: 82, kuis: 78, uts: null, uas: null } },
    { id: 'IF303', nama: 'Kecerdasan Buatan',             sks: 3, dosen: 'Ahmad Fauzi, Ph.D.',        hari: 2, mulai: '09:00', selesai: '11:30', ruang: 'R. 3.01', warna: '#10b981',
      hadir: [1,1,1,1,1,1,1], nilai: { tugas: 91, kuis: 85, uts: null, uas: null } },
    { id: 'IF304', nama: 'Jaringan Komputer',             sks: 3, dosen: 'Rina Marlina, M.Kom.',      hari: 3, mulai: '10:00', selesai: '12:30', ruang: 'Lab 2.1', warna: '#0ea5e9',
      hadir: [1,1,1,0,1,1,1], nilai: { tugas: 79, kuis: 84, uts: null, uas: null } },
    { id: 'IF305', nama: 'Rekayasa Perangkat Lunak',      sks: 3, dosen: 'Dewi Anggraini, M.T.',      hari: 4, mulai: '08:00', selesai: '10:30', ruang: 'R. 2.07', warna: '#f43f5e',
      hadir: [1,1,1,1,1,1,0], nilai: { tugas: 86, kuis: 80, uts: null, uas: null } },
    { id: 'UM301', nama: 'Kewirausahaan',                 sks: 2, dosen: 'Hendra Wijaya, M.M.',       hari: 4, mulai: '13:00', selesai: '14:40', ruang: 'R. 1.02', warna: '#8b5cf6',
      hadir: [1,1,1,1,1,1,1], nilai: { tugas: 90, kuis: 88, uts: null, uas: null } },
    { id: 'IF306', nama: 'Interaksi Manusia & Komputer',  sks: 3, dosen: 'Yusuf Hidayat, M.Kom.',     hari: 5, mulai: '08:00', selesai: '10:30', ruang: 'R. 3.05', warna: '#14b8a6',
      hadir: [1,1,1,1,1,0,1], nilai: { tugas: 93, kuis: 89, uts: null, uas: null } }
  ];

  const TOTAL_PERTEMUAN = 16;     // pertemuan per semester
  const PERTEMUAN_BERJALAN = 7;   // pertemuan yang sudah berlangsung

  /* ---------------- Tugas ---------------- */
  const tugas = [
    { id: 'T01', mk: 'IF302', judul: 'Normalisasi & ERD Studi Kasus Perpustakaan', desc: 'Buat ERD sampai bentuk normal ketiga (3NF) beserta dokumentasi proses normalisasi.', due: at(1),  prioritas: 'high' },
    { id: 'T02', mk: 'IF301', judul: 'Proyek Mini: REST API dengan Node.js',        desc: 'Bangun REST API sederhana (CRUD) lengkap dengan dokumentasi endpoint.',               due: at(3),  prioritas: 'high' },
    { id: 'T03', mk: 'IF306', judul: 'Wireframe Aplikasi Akademik',                 desc: 'Rancang wireframe low-fidelity untuk 5 halaman utama aplikasi akademik.',              due: at(5),  prioritas: 'medium' },
    { id: 'T04', mk: 'IF303', judul: 'Resume Paper: Search Algorithm',              desc: 'Ringkas satu paper tentang algoritma pencarian (A*, BFS, atau DFS) maksimal 2 halaman.', due: at(6),  prioritas: 'medium' },
    { id: 'T05', mk: 'IF304', judul: 'Laporan Praktikum Subnetting',                desc: 'Susun laporan praktikum subnetting VLSM beserta tangkapan layar simulasi.',            due: at(8),  prioritas: 'medium' },
    { id: 'T06', mk: 'IF305', judul: 'Dokumen SRS Kelompok',                        desc: 'Software Requirements Specification untuk proyek kelompok (format IEEE 830).',         due: at(12), prioritas: 'high' },
    { id: 'T07', mk: 'UM301', judul: 'Proposal Ide Bisnis',                         desc: 'Proposal singkat ide bisnis digital: masalah, solusi, target pasar, dan model bisnis.', due: at(14), prioritas: 'low' },
    { id: 'T08', mk: 'IF301', judul: 'Latihan Responsive Layout',                   desc: 'Latihan membuat layout responsif dengan CSS Grid dan Flexbox.',                         due: at(-3), prioritas: 'low',    done: true },
    { id: 'T09', mk: 'IF304', judul: 'Kuis Topologi Jaringan',                      desc: 'Kuis daring topologi jaringan dan perangkat.',                                          due: at(-6), prioritas: 'low',    done: true }
  ];

  /* ---------------- Ujian ---------------- */
  const slot = (mkId) => {
    const c = courses.find(x => x.id === mkId);
    return { mulai: c.mulai, ruang: c.ruang };
  };
  const mkExam = (kind, mk, offset, mulai, selesai, mode) => {
    const c = courses.find(x => x.id === mk);
    const [h, m] = mulai.split(':').map(Number);
    return { id: kind + '-' + mk, jenis: kind, mk, tanggal: at(offset, h, m), mulai, selesai, ruang: c.ruang, mode: mode || 'Luring' };
  };
  const ujian = [
    mkExam('UTS', 'IF301', toMonday + 0, '08:00', '09:40'),
    mkExam('UTS', 'IF302', toMonday + 0, '13:00', '14:40'),
    mkExam('UTS', 'IF303', toMonday + 1, '09:00', '10:40'),
    mkExam('UTS', 'IF304', toMonday + 2, '10:00', '11:40', 'Praktik'),
    mkExam('UTS', 'IF305', toMonday + 3, '08:00', '09:40'),
    mkExam('UTS', 'UM301', toMonday + 3, '13:00', '14:40'),
    mkExam('UTS', 'IF306', toMonday + 4, '08:00', '09:40', 'Daring'),
    mkExam('UAS', 'IF301', toMonday + 49, '08:00', '10:00'),
    mkExam('UAS', 'IF302', toMonday + 49, '13:00', '15:00'),
    mkExam('UAS', 'IF303', toMonday + 50, '09:00', '11:00'),
    mkExam('UAS', 'IF304', toMonday + 51, '10:00', '12:00', 'Praktik'),
    mkExam('UAS', 'IF305', toMonday + 52, '08:00', '10:00'),
    mkExam('UAS', 'UM301', toMonday + 52, '13:00', '14:40'),
    mkExam('UAS', 'IF306', toMonday + 53, '08:00', '10:00', 'Daring')
  ];

  /* ---------------- Riwayat akademik ---------------- */
  const riwayat = [
    { smt: 1, periode: '2024/2025 Ganjil', sks: 20, ips: 3.45 },
    { smt: 2, periode: '2024/2025 Genap',  sks: 22, ips: 3.62 },
    { smt: 3, periode: '2025/2026 Ganjil', sks: 21, ips: 3.55 },
    { smt: 4, periode: '2025/2026 Genap',  sks: 22, ips: 3.70 }
  ];
  const SKS_LULUS_TARGET = 144;

  /* ---------------- Keuangan ---------------- */
  const tagihan = [
    { id: 'B01', nama: 'Biaya Pendidikan Semester 5',      kode: 'SPP-5',  jumlah: 6500000, due: at(-45), paid: true, paidAt: at(-40, 10, 14), method: 'BCA Virtual Account' },
    { id: 'B02', nama: 'Asuransi & Kartu Mahasiswa',       kode: 'ASR-5',  jumlah: 150000,  due: at(-45), paid: true, paidAt: at(-40, 10, 16), method: 'BCA Virtual Account' },
    { id: 'B03', nama: 'Biaya Praktikum Laboratorium',     kode: 'PRK-5',  jumlah: 750000,  due: at(10) },
    { id: 'B04', nama: 'Kegiatan Kemahasiswaan (UKM)',     kode: 'KMH-5',  jumlah: 250000,  due: at(10) }
  ];

  /* ---------------- Pengumuman ---------------- */
  const pengumuman = [
    { id: 'A01', judul: 'Jadwal UTS Semester Ganjil telah terbit', isi: 'UTS dilaksanakan mulai Senin pekan depan. Cek menu Ujian untuk ruang dan waktu masing-masing mata kuliah.', tgl: at(-1, 9, 0),  kategori: 'Akademik' },
    { id: 'A02', judul: 'Batas pembayaran biaya praktikum',        isi: 'Pembayaran biaya praktikum dan kegiatan kemahasiswaan paling lambat 10 hari dari sekarang agar kartu ujian aktif.', tgl: at(-2, 13, 30), kategori: 'Keuangan' },
    { id: 'A03', judul: 'Pendaftaran Beasiswa PPA dibuka',         isi: 'Mahasiswa dengan IPK minimal 3,25 dapat mengajukan beasiswa melalui bagian Kemahasiswaan.',            tgl: at(-4, 8, 0),   kategori: 'Beasiswa' },
    { id: 'A04', judul: 'Seminar Nasional Teknologi & AI',         isi: 'Seminar terbuka untuk seluruh mahasiswa di Auditorium Utama. Sertifikat dan poin SKPI tersedia.',        tgl: at(-5, 15, 0),  kategori: 'Kegiatan' }
  ];

  /* ---------------- Penyimpanan state per mahasiswa ---------------- */
  const KEY = (nim) => 'pb_state_' + nim;
  function state(nim) {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY(nim))); } catch (e) { /* abaikan */ }
    return Object.assign({ tugas: {}, bayar: {}, baca: [] }, s || {});
  }
  function save(nim, s) {
    try { localStorage.setItem(KEY(nim), JSON.stringify(s)); } catch (e) { /* storage penuh/diblokir */ }
  }

  window.DB = {
    courses, tugas, ujian, riwayat, tagihan, pengumuman,
    TOTAL_PERTEMUAN, PERTEMUAN_BERJALAN, SKS_LULUS_TARGET,
    state, save
  };
})();
