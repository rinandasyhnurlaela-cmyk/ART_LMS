/* =========================================================
   app.js — Logika aplikasi (SPA berbasis hash-router)
   ---------------------------------------------------------
   Alur file:
   1. Helper (format tanggal, rupiah, escape HTML)
   2. Perhitungan akademik (nilai, IPK, status tugas/tagihan)
   3. Shell: navigasi, jam, notifikasi, pencarian
   4. Halaman: dashboard, jadwal, matakuliah, tugas, ujian,
      nilai, keuangan, profil
   5. Modal & aksi (event delegation)
   6. Router & inisialisasi
   ========================================================= */
(() => {
  'use strict';

  let user = Auth.current();
  if (!user) { location.replace('login.html'); return; }

  const { courses, tugas, ujian, riwayat, tagihan, pengumuman } = DB;
  const st = DB.state(user.nim);
  const persist = () => DB.save(user.nim, st);

  /* =======================================================
     1. HELPER
     ======================================================= */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = (name, cls) => '<i data-lucide="' + name + '" class="' + (cls || 'w-4 h-4') + '"></i>';
  const paintIcons = () => window.lucide && lucide.createIcons();

  const TZ = 'Asia/Jakarta';
  const fDate = (d, o) => d.toLocaleDateString('id-ID', Object.assign({ timeZone: TZ }, o));
  const fLong = (d) => fDate(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fMid = (d) => fDate(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const fShort = (d) => fDate(d, { day: 'numeric', month: 'short' });
  const fTime = (d) => d.toLocaleTimeString('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
  const fClock = (d) => d.toLocaleTimeString('id-ID', { timeZone: TZ, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':');
  const rp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');
  const wib = () => new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const dayDiff = (d) => Math.round((startOfDay(d) - startOfDay(new Date())) / 864e5);
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const initials = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const HARI = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat' };
  const mins = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

  function toast(msg, type) {
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.innerHTML = ic(type === 'err' ? 'circle-alert' : 'circle-check', 'w-4 h-4 shrink-0') + '<span>' + esc(msg) + '</span>';
    $('#toasts').appendChild(el);
    paintIcons();
    setTimeout(() => el.remove(), 3800);
  }

  /* =======================================================
     2. PERHITUNGAN AKADEMIK
     ======================================================= */
  const mk = (id) => courses.find(c => c.id === id);
  const BOBOT = [['tugas', 25], ['kuis', 15], ['uts', 25], ['uas', 35]];

  const gradeOf = (n) => n >= 85 ? 'A' : n >= 80 ? 'A-' : n >= 75 ? 'B+' : n >= 70 ? 'B' : n >= 65 ? 'B-' : n >= 60 ? 'C+' : n >= 55 ? 'C' : n >= 40 ? 'D' : 'E';
  const gradeTone = (g) => g[0] === 'A' ? 'chip-ok' : g[0] === 'B' ? 'chip-info' : 'chip-warn';

  /** Nilai sementara = rata-rata tertimbang dari komponen yang sudah ada */
  function nilaiSementara(c) {
    let w = 0, s = 0;
    BOBOT.forEach(([k, b]) => { if (c.nilai[k] != null) { w += b; s += c.nilai[k] * b; } });
    return w ? s / w : 0;
  }
  const kehadiran = (c) => Math.round(c.hadir.filter(Boolean).length / DB.PERTEMUAN_BERJALAN * 100);
  const progressMateri = () => Math.round(DB.PERTEMUAN_BERJALAN / DB.TOTAL_PERTEMUAN * 100);

  const sksLulus = () => riwayat.reduce((a, r) => a + r.sks, 0);
  const ipk = () => riwayat.reduce((a, r) => a + r.ips * r.sks, 0) / sksLulus();
  const sksSemester = () => courses.reduce((a, c) => a + c.sks, 0);
  const predikat = (v) => v > 3.5 ? 'Dengan Pujian' : v >= 2.76 ? 'Sangat Memuaskan' : v >= 2 ? 'Memuaskan' : 'Perlu peningkatan';

  const taskDone = (t) => !!t.done || (st.tugas[t.id] && st.tugas[t.id].status === 'done');
  const taskActive = () => tugas.filter(t => !taskDone(t)).sort((a, b) => a.due - b.due);
  const billPaid = (b) => !!b.paid || !!st.bayar[b.id];
  const billInfo = (b) => b.paid ? { paidAt: b.paidAt, method: b.method } : st.bayar[b.id] && { paidAt: new Date(st.bayar[b.id].paidAt), method: st.bayar[b.id].method };
  const unpaid = () => tagihan.filter(b => !billPaid(b));
  const totalUnpaid = () => unpaid().reduce((a, b) => a + b.jumlah, 0);

  function dueInfo(d, done) {
    if (done) return { label: 'Selesai', cls: 'chip-ok' };
    if (d < new Date()) return { label: 'Terlambat', cls: 'chip-bad' };
    const n = dayDiff(d);
    if (n === 0) return { label: 'Hari ini', cls: 'chip-bad' };
    if (n === 1) return { label: 'Besok', cls: 'chip-warn' };
    if (n <= 3) return { label: n + ' hari lagi', cls: 'chip-warn' };
    return { label: n + ' hari lagi', cls: '' };
  }
  const prioChip = (p) => p === 'high' ? '<span class="chip chip-bad">Prioritas tinggi</span>' : p === 'medium' ? '<span class="chip chip-warn">Sedang</span>' : '<span class="chip">Rendah</span>';
  const dot = (c) => '<span class="inline-block w-2.5 h-2.5 rounded-full shrink-0" style="background:' + c + '"></span>';

  /** Status kelas hari ini */
  function classState(c) {
    const n = wib(); const now = n.getHours() * 60 + n.getMinutes();
    if (now >= mins(c.selesai)) return { label: 'Selesai', cls: '' };
    if (now >= mins(c.mulai)) return { label: 'Berlangsung', cls: 'chip-ok' };
    return { label: 'Akan datang', cls: 'chip-info' };
  }

  /** Kelas berikutnya (hari ini jika masih ada, jika tidak hari kuliah terdekat) */
  function nextClass() {
    const n = wib(); const now = n.getHours() * 60 + n.getMinutes();
    for (let add = 0; add < 8; add++) {
      const day = (n.getDay() + add) % 7;
      const list = courses.filter(c => c.hari === day && (add > 0 || mins(c.selesai) > now)).sort((a, b) => mins(a.mulai) - mins(b.mulai));
      if (list.length) return { c: list[0], add };
    }
    return null;
  }

  /* =======================================================
     3. SHELL
     ======================================================= */
  const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { id: 'jadwal', label: 'Jadwal Kuliah', icon: 'calendar-days' },
    { id: 'matakuliah', label: 'Mata Kuliah', icon: 'book-open' },
    { id: 'tugas', label: 'Tugas', icon: 'clipboard-list', badge: () => taskActive().filter(t => dayDiff(t.due) <= 3).length },
    { id: 'ujian', label: 'Ujian', icon: 'file-pen-line' },
    { id: 'nilai', label: 'Nilai & IPK', icon: 'graduation-cap' },
    { id: 'keuangan', label: 'Keuangan', icon: 'wallet', badge: () => unpaid().length },
    { id: 'profil', label: 'Profil', icon: 'user-round' }
  ];

  function paintNav(active) {
    $('#nav').innerHTML = NAV.map(n => {
      const b = n.badge ? n.badge() : 0;
      return '<a href="#/' + n.id + '" class="nav-link' + (n.id === active ? ' active' : '') + '"' + (n.id === active ? ' aria-current="page"' : '') + '>' +
        ic(n.icon, 'w-[18px] h-[18px]') + '<span>' + n.label + '</span>' + (b ? '<span class="nav-badge">' + b + '</span>' : '') + '</a>';
    }).join('');
  }

  function paintUser() {
    const i = initials(user.nama);
    $('#side-avatar').textContent = i;
    $('#top-avatar').textContent = i;
    $('#side-name').textContent = user.nama;
    $('#side-nim').textContent = 'NIM ' + user.nim;
  }

  /* ---- Jam & tanggal (update tiap detik) ---- */
  function tick() {
    const n = new Date();
    const time = fClock(n);
    $$('[data-clock]').forEach(e => { e.textContent = time; });
    $$('[data-date]').forEach(e => { e.textContent = fLong(n); });
    $$('[data-date-short]').forEach(e => { e.textContent = fMid(n); });
  }

  /* ---- Notifikasi ---- */
  function buildNotifs() {
    const list = [];
    taskActive().filter(t => dayDiff(t.due) <= 3).forEach(t => {
      list.push({ id: 'task:' + t.id, icon: 'clipboard-list', tone: 'chip-warn', title: t.judul, sub: mk(t.mk).nama + ' · ' + dueInfo(t.due).label + ', ' + fTime(t.due), go: '#/tugas' });
    });
    unpaid().forEach(b => {
      list.push({ id: 'bill:' + b.id, icon: 'wallet', tone: 'chip-bad', title: 'Tagihan ' + b.nama, sub: rp(b.jumlah) + ' · jatuh tempo ' + fShort(b.due), go: '#/keuangan' });
    });
    pengumuman.slice(0, 2).forEach(a => {
      list.push({ id: 'ann:' + a.id, icon: 'megaphone', tone: 'chip-info', title: a.judul, sub: a.kategori + ' · ' + fShort(a.tgl), go: '#/dashboard' });
    });
    return list;
  }

  function paintNotifs() {
    const list = buildNotifs();
    const unread = list.filter(n => !st.baca.includes(n.id));
    const badge = $('#bell-badge');
    badge.textContent = unread.length;
    badge.classList.toggle('hidden', !unread.length);
    badge.classList.toggle('inline-flex', !!unread.length);

    $('#notif').innerHTML =
      '<div class="flex items-center justify-between px-4 py-3 border-b border-slate-100"><p class="font-bold text-sm">Notifikasi</p>' +
      (unread.length ? '<button class="text-xs font-semibold hover:underline" data-act="notif-readall">Tandai semua dibaca</button>' : '') + '</div>' +
      '<div class="max-h-96 overflow-auto p-1.5">' +
      (list.length ? list.map(n => {
        const isNew = !st.baca.includes(n.id);
        return '<button class="w-full text-left flex gap-3 p-3 rounded-xl hover:bg-slate-50" data-act="notif-go" data-id="' + n.id + '" data-go="' + n.go + '">' +
          '<span class="chip ' + n.tone + ' !p-2 !rounded-xl h-fit">' + ic(n.icon, 'w-4 h-4') + '</span>' +
          '<span class="min-w-0 flex-1"><span class="block text-sm font-semibold leading-snug">' + esc(n.title) + '</span>' +
          '<span class="block text-xs t-muted mt-0.5">' + esc(n.sub) + '</span></span>' +
          (isNew ? '<span class="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0"></span>' : '') + '</button>';
      }).join('') : '<p class="text-sm t-muted text-center py-8">Tidak ada notifikasi.</p>') + '</div>';
    paintIcons();
  }

  /* ---- Pencarian global ---- */
  function runSearch(q) {
    const box = $('#search-results');
    q = q.trim().toLowerCase();
    if (q.length < 2) { box.classList.add('hidden'); return; }
    const res = [];
    NAV.forEach(n => { if (n.label.toLowerCase().includes(q)) res.push({ icon: n.icon, t: n.label, s: 'Menu', go: '#/' + n.id }); });
    courses.forEach(c => { if ((c.nama + ' ' + c.id + ' ' + c.dosen).toLowerCase().includes(q)) res.push({ icon: 'book-open', t: c.nama, s: c.id + ' · ' + c.dosen, go: '#/matakuliah?open=' + c.id }); });
    tugas.forEach(t => { if ((t.judul + ' ' + mk(t.mk).nama).toLowerCase().includes(q)) res.push({ icon: 'clipboard-list', t: t.judul, s: 'Tugas · ' + mk(t.mk).nama, go: '#/tugas' }); });
    box.innerHTML = res.length
      ? res.slice(0, 8).map(r => '<button class="w-full text-left flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50" data-act="search-go" data-go="' + r.go + '">' +
        '<span class="chip !p-2 !rounded-lg">' + ic(r.icon, 'w-4 h-4') + '</span><span class="min-w-0"><span class="block text-sm font-semibold truncate">' + esc(r.t) + '</span><span class="block text-xs t-muted truncate">' + esc(r.s) + '</span></span></button>').join('')
      : '<p class="text-sm t-muted text-center py-6">Tidak ada hasil untuk “' + esc(q) + '”.</p>';
    box.classList.remove('hidden');
    paintIcons();
  }

  /* =======================================================
     4. HALAMAN
     ======================================================= */
  const pageHead = (title, sub, right) =>
    '<div class="flex flex-wrap items-end justify-between gap-4 mb-6">' +
    '<div><h1 class="text-2xl sm:text-[1.7rem] font-extrabold tracking-tight">' + title + '</h1>' +
    (sub ? '<p class="t-soft text-sm mt-1">' + sub + '</p>' : '') + '</div>' + (right || '') + '</div>';

  const empty = (icon, text) =>
    '<div class="text-center py-10"><span class="chip !p-3 !rounded-2xl mb-3">' + ic(icon, 'w-5 h-5') + '</span><p class="text-sm t-muted">' + text + '</p></div>';

  /* ---------- Kalender mini ---------- */
  let calView = { y: new Date().getFullYear(), m: new Date().getMonth() };

  function eventDates() {
    const set = new Set();
    const key = (d) => d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
    taskActive().forEach(t => set.add(key(t.due)));
    ujian.forEach(u => set.add(key(u.tanggal)));
    return { set, key };
  }

  function calendarHTML() {
    const { y, m } = calView;
    const first = new Date(y, m, 1);
    const offset = first.getDay();
    const total = new Date(y, m + 1, 0).getDate();
    const prevTotal = new Date(y, m, 0).getDate();
    const { set, key } = eventDates();
    const today = new Date();
    let cells = '';
    ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].forEach(d => { cells += '<div class="cal-dow">' + d + '</div>'; });
    for (let i = 0; i < 42; i++) {
      const dayNum = i - offset + 1;
      let d, out = false;
      if (dayNum < 1) { d = new Date(y, m - 1, prevTotal + dayNum); out = true; }
      else if (dayNum > total) { d = new Date(y, m + 1, dayNum - total); out = true; }
      else d = new Date(y, m, dayNum);
      if (i >= 35 && out && d.getMonth() !== m && i % 7 === 0) break;
      const cls = 'cal-day' + (out ? ' out' : '') + (sameDay(d, today) ? ' today' : '');
      cells += '<div class="' + cls + '">' + d.getDate() + (set.has(key(d)) ? '<span class="dot"></span>' : '') + '</div>';
    }
    const title = new Date(y, m, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    return '<div class="flex items-center justify-between mb-3">' +
      '<p class="font-bold capitalize">' + title + '</p>' +
      '<div class="flex gap-1"><button class="icon-btn !w-8 !h-8" data-act="cal-prev" aria-label="Bulan sebelumnya">' + ic('chevron-left') + '</button>' +
      '<button class="icon-btn !w-8 !h-8" data-act="cal-next" aria-label="Bulan berikutnya">' + ic('chevron-right') + '</button></div></div>' +
      '<div class="cal-grid">' + cells + '</div>' +
      '<div class="flex items-center gap-2 mt-3 text-xs t-muted"><span class="w-1.5 h-1.5 rounded-full bg-brand-500"></span> Tenggat tugas &amp; ujian</div>';
  }

  /* ---------- Dashboard ---------- */
  function greeting() {
    const h = wib().getHours();
    return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
  }

  function classRow(c, withState) {
    const s = withState ? classState(c) : null;
    return '<div class="flex items-center gap-4 py-3.5">' +
      '<div class="w-[4.4rem] shrink-0 text-center"><p class="text-sm font-bold tabular-nums">' + c.mulai + '</p><p class="text-xs t-muted tabular-nums">' + c.selesai + '</p></div>' +
      '<span class="w-1 self-stretch rounded-full" style="background:' + c.warna + '"></span>' +
      '<div class="min-w-0 flex-1"><p class="font-semibold text-sm truncate">' + esc(c.nama) + '</p>' +
      '<p class="text-xs t-muted mt-0.5 truncate">' + ic('map-pin', 'w-3 h-3 inline -mt-0.5') + ' ' + esc(c.ruang) + ' · ' + esc(c.dosen) + '</p></div>' +
      (s ? '<span class="chip ' + s.cls + ' hidden sm:inline-flex">' + s.label + '</span>' : '') + '</div>';
  }

  function taskRow(t) {
    const c = mk(t.mk); const d = dueInfo(t.due, taskDone(t));
    return '<div class="flex items-center gap-3 py-3.5">' + dot(c.warna) +
      '<div class="min-w-0 flex-1"><p class="font-semibold text-sm truncate">' + esc(t.judul) + '</p>' +
      '<p class="text-xs t-muted mt-0.5 truncate">' + esc(c.nama) + ' · ' + fShort(t.due) + ', ' + fTime(t.due) + '</p></div>' +
      '<span class="chip ' + d.cls + '">' + d.label + '</span></div>';
  }

  function statCard(icon, label, value, sub, tone) {
    return '<div class="card card-p"><div class="flex items-center justify-between"><p class="text-xs font-semibold t-muted">' + label + '</p>' +
      '<span class="chip ' + (tone || '') + ' !p-2 !rounded-xl">' + ic(icon, 'w-4 h-4') + '</span></div>' +
      '<p class="text-[1.7rem] font-extrabold tracking-tight mt-2 leading-none">' + value + '</p>' +
      '<p class="text-xs t-muted mt-2 truncate">' + sub + '</p></div>';
  }

  function viewDashboard() {
    const todays = courses.filter(c => c.hari === wib().getDay()).sort((a, b) => mins(a.mulai) - mins(b.mulai));
    const nc = nextClass();
    const active = taskActive();
    const urgent = active.filter(t => dayDiff(t.due) <= 3).length;
    const ujianNext = ujian.filter(u => u.tanggal > new Date()).sort((a, b) => a.tanggal - b.tanggal)[0];
    const dueBill = unpaid().sort((a, b) => a.due - b.due)[0];

    let todayBody;
    if (todays.length) {
      todayBody = '<div class="divide-line">' + todays.map(c => classRow(c, true)).join('') + '</div>';
    } else if (nc) {
      const when = nc.add === 1 ? 'besok' : 'hari ' + HARI[nc.c.hari];
      todayBody = '<div class="py-2">' + empty('coffee', 'Tidak ada kuliah hari ini. Nikmati harimu!') + '</div>' +
        '<div class="rounded-xl bg-slate-50 p-3 text-sm"><span class="t-muted">Kuliah berikutnya ' + when + ':</span> <span class="font-semibold">' + esc(nc.c.nama) + '</span> · ' + nc.c.mulai + '</div>';
    } else todayBody = empty('coffee', 'Tidak ada jadwal kuliah.');

    return '<div class="view-enter">' +
      /* Hero */
      '<div class="mb-6">' +
      '<p class="text-sm font-semibold t-soft" data-date>—</p>' +
      '<h1 class="text-[1.65rem] sm:text-3xl font-extrabold tracking-tight mt-1">' + greeting() + ', ' + esc(user.nama.split(' ')[0]) + ' 👋</h1>' +
      '<p class="t-soft text-sm mt-1.5">' + (todays.length ? 'Kamu punya <b class="text-ink">' + todays.length + ' kelas</b> hari ini' : 'Tidak ada kelas hari ini') +
      (urgent ? ' dan <b class="text-ink">' + urgent + ' tugas</b> yang segera jatuh tempo.' : '.') + '</p></div>' +

      /* Featured Thumbnail Banner */
      '<div class="relative overflow-hidden rounded-2xl bg-[#0f172a] text-white shadow-md border border-slate-800 mb-6 group">' +
      '<div class="grid md:grid-cols-12 items-center">' +
      '<div class="md:col-span-7 p-5 sm:p-7 space-y-3 z-10">' +
      '<div class="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-bold uppercase tracking-wider text-amber-300">' +
      '<img src="img/logo.png" alt="ART" class="w-4 h-4 rounded object-contain" /> ART Learning Management' +
      '</div>' +
      '<h2 class="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug">Portal Pembelajaran Terpadu & Interaktif</h2>' +
      '<p class="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-md">Pantau kegiatan perkuliahan, unduh materi, dan kumpulkan tugas tepat waktu dengan kemudahan akses satu pintu.</p>' +
      '<div class="pt-1 flex items-center gap-3">' +
      '<a href="#/jadwal" class="btn btn-sm bg-brand-500 hover:bg-brand-600 text-ink font-bold">' + ic('calendar-days', 'w-4 h-4') + 'Jadwal Kuliah</a>' +
      '<a href="#/matakuliah" class="btn btn-sm bg-white/10 hover:bg-white/20 text-white border border-white/15">' + ic('book-open', 'w-4 h-4') + 'Mata Kuliah</a>' +
      '</div></div>' +
      '<div class="md:col-span-5 h-44 sm:h-52 md:h-full relative overflow-hidden flex items-center justify-center p-3 md:p-4">' +
      '<img src="img/thumbnail.jpg" alt="ART LMS Thumbnail" class="w-full h-full object-cover rounded-xl shadow-xl border border-white/10 transition-transform duration-500 group-hover:scale-105" />' +
      '<div class="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#0f172a] via-transparent to-transparent pointer-events-none"></div>' +
      '</div></div></div>' +

      /* Statistik */
      '<div class="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">' +
      statCard('graduation-cap', 'IPK', ipk().toFixed(2), predikat(ipk()), 'chip-brand') +
      statCard('book-open', 'SKS Semester Ini', sksSemester(), 'Semester ' + user.semester + ' · ' + courses.length + ' mata kuliah', 'chip-info') +
      statCard('clipboard-list', 'Tugas Aktif', active.length, urgent ? urgent + ' segera jatuh tempo' : 'Semua aman', urgent ? 'chip-warn' : 'chip-ok') +
      statCard('wallet', 'Tagihan', totalUnpaid() ? rp(totalUnpaid()) : 'Lunas', dueBill ? 'Jatuh tempo ' + fShort(dueBill.due) : 'Tidak ada tagihan', totalUnpaid() ? 'chip-bad' : 'chip-ok') +
      '</div>' +

      /* Grid utama */
      '<div class="grid lg:grid-cols-3 gap-4 sm:gap-5 mt-5">' +
      '<div class="lg:col-span-2 space-y-4 sm:space-y-5">' +
      '<section class="card card-p"><div class="flex items-center justify-between mb-1"><h2 class="font-extrabold">Jadwal Hari Ini</h2><a href="#/jadwal" class="text-xs font-semibold t-soft hover:text-ink">Lihat semua →</a></div>' + todayBody + '</section>' +
      '<section class="card card-p"><div class="flex items-center justify-between mb-1"><h2 class="font-extrabold">Tugas Terdekat</h2><a href="#/tugas" class="text-xs font-semibold t-soft hover:text-ink">Lihat semua →</a></div>' +
      (active.length ? '<div class="divide-line">' + active.slice(0, 4).map(taskRow).join('') + '</div>' : empty('circle-check', 'Semua tugas sudah dikumpulkan.')) + '</section>' +
      '</div>' +

      '<div class="space-y-4 sm:space-y-5">' +
      '<section class="card card-p" id="cal-box">' + calendarHTML() + '</section>' +
      (ujianNext ? '<section class="card card-p"><p class="text-xs font-semibold t-muted">Ujian berikutnya</p><p class="font-extrabold mt-1.5 leading-snug">' + ujianNext.jenis + ' ' + esc(mk(ujianNext.mk).nama) + '</p>' +
        '<p class="text-xs t-soft mt-1.5">' + fMid(ujianNext.tanggal) + ' · ' + ujianNext.mulai + ' · ' + esc(ujianNext.ruang) + '</p>' +
        '<p class="mt-3"><span class="chip ' + dueInfo(ujianNext.tanggal).cls + '">' + dueInfo(ujianNext.tanggal).label + '</span></p></section>' : '') +
      '<section class="card card-p"><h2 class="font-extrabold mb-1">Pengumuman</h2><div class="divide-line">' +
      pengumuman.slice(0, 3).map(a => '<div class="py-3.5"><div class="flex items-center gap-2"><span class="chip chip-brand">' + esc(a.kategori) + '</span><span class="text-xs t-muted">' + fShort(a.tgl) + '</span></div>' +
        '<p class="font-semibold text-sm mt-2 leading-snug">' + esc(a.judul) + '</p><p class="text-xs t-soft mt-1 leading-relaxed">' + esc(a.isi) + '</p></div>').join('') +
      '</div></section></div></div></div>';
  }

  /* ---------- Jadwal ---------- */
  function viewJadwal() {
    const today = wib().getDay();
    const cols = [1, 2, 3, 4, 5].map(d => {
      const list = courses.filter(c => c.hari === d).sort((a, b) => mins(a.mulai) - mins(b.mulai));
      const isToday = d === today;
      return '<section class="card ' + (isToday ? '!border-brand-500 ring-4 ring-brand-500/10' : '') + ' overflow-hidden">' +
        '<div class="px-4 py-3 flex items-center justify-between ' + (isToday ? 'bg-brand-50' : 'bg-slate-50/70') + ' border-b border-slate-100">' +
        '<h2 class="font-extrabold text-sm">' + HARI[d] + '</h2>' + (isToday ? '<span class="chip chip-brand">Hari ini</span>' : '<span class="text-xs t-muted">' + list.length + ' kelas</span>') + '</div>' +
        '<div class="p-3 space-y-2.5">' +
        (list.length ? list.map(c =>
          '<button class="w-full text-left rounded-xl border border-slate-200/70 p-3 hover:border-slate-300 hover:bg-slate-50/60 transition" data-act="course-open" data-id="' + c.id + '">' +
          '<p class="text-xs font-bold tabular-nums flex items-center gap-1.5">' + dot(c.warna) + c.mulai + ' – ' + c.selesai + '</p>' +
          '<p class="font-semibold text-sm mt-1.5 leading-snug">' + esc(c.nama) + '</p>' +
          '<p class="text-xs t-muted mt-1.5">' + esc(c.ruang) + ' · ' + c.sks + ' SKS</p></button>').join('')
          : '<p class="text-xs t-muted text-center py-6">Tidak ada kuliah</p>') +
        '</div></section>';
    }).join('');

    return '<div class="view-enter">' +
      pageHead('Jadwal Kuliah', 'Semester Ganjil 2026/2027 · ' + courses.length + ' mata kuliah · ' + sksSemester() + ' SKS') +
      '<div class="grid sm:grid-cols-2 xl:grid-cols-5 gap-4 items-start">' + cols + '</div>' +
      '<p class="text-xs t-muted mt-5">Jadwal Sabtu–Minggu tidak ada perkuliahan reguler. Klik kartu untuk melihat detail mata kuliah.</p></div>';
  }

  /* ---------- Mata kuliah ---------- */
  function courseCard(c) {
    const n = nilaiSementara(c); const g = gradeOf(n); const h = kehadiran(c);
    return '<button class="card card-hover card-p text-left w-full" data-act="course-open" data-id="' + c.id + '">' +
      '<div class="flex items-center justify-between"><span class="chip" style="background:' + c.warna + '1f;color:#3a3a55">' + dot(c.warna) + c.id + '</span><span class="text-xs font-semibold t-muted">' + c.sks + ' SKS</span></div>' +
      '<h3 class="font-extrabold mt-3.5 leading-snug">' + esc(c.nama) + '</h3>' +
      '<p class="text-xs t-muted mt-1.5">' + esc(c.dosen) + '</p>' +
      '<div class="mt-4 space-y-1.5 text-xs t-soft"><p class="flex items-center gap-2">' + ic('calendar-days', 'w-3.5 h-3.5') + HARI[c.hari] + ', ' + c.mulai + '–' + c.selesai + '</p>' +
      '<p class="flex items-center gap-2">' + ic('map-pin', 'w-3.5 h-3.5') + esc(c.ruang) + '</p></div>' +
      '<div class="mt-5"><div class="flex justify-between text-xs mb-1.5"><span class="t-muted font-medium">Kehadiran</span><span class="font-bold">' + h + '%</span></div>' +
      '<div class="bar ' + (h >= 80 ? 'ok' : 'brand') + '"><i style="width:' + h + '%"></i></div></div>' +
      '<div class="flex items-center justify-between mt-4 pt-4 border-t border-slate-100"><span class="text-xs t-muted font-medium">Nilai sementara</span>' +
      '<span class="flex items-center gap-2"><b class="text-sm">' + n.toFixed(1) + '</b><span class="chip ' + gradeTone(g) + '">' + g + '</span></span></div></button>';
  }

  function viewMatakuliah() {
    return '<div class="view-enter">' +
      pageHead('Mata Kuliah', courses.length + ' mata kuliah · ' + sksSemester() + ' SKS semester ini',
        '<div class="relative w-full sm:w-72"><i data-lucide="search" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 t-muted"></i>' +
        '<input id="course-filter" class="input !pl-10" placeholder="Filter mata kuliah…" /></div>') +
      '<div id="course-grid" class="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">' + courses.map(courseCard).join('') + '</div></div>';
  }

  function courseModal(id) {
    const c = mk(id); if (!c) return;
    const n = nilaiSementara(c); const g = gradeOf(n);
    const related = tugas.filter(t => t.mk === id).sort((a, b) => a.due - b.due);
    const dots = Array.from({ length: DB.TOTAL_PERTEMUAN }, (_, i) => {
      const done = i < DB.PERTEMUAN_BERJALAN;
      const present = done && c.hadir[i];
      return '<span title="Pertemuan ' + (i + 1) + '" class="w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center ' +
        (present ? 'bg-[#e5f6ef] text-[#12805c]' : done ? 'bg-[#fdeaed] text-[#c2263a]' : 'bg-slate-100 text-slate-400') + '">' + (i + 1) + '</span>';
    }).join('');
    const komp = BOBOT.map(([k, b]) => {
      const v = c.nilai[k];
      return '<div><div class="flex justify-between text-xs mb-1.5"><span class="font-medium t-soft capitalize">' + k + ' <span class="t-muted">(' + b + '%)</span></span><b>' + (v == null ? 'Belum ada' : v) + '</b></div>' +
        '<div class="bar ' + (v == null ? '' : 'ok') + '"><i style="width:' + (v || 0) + '%"></i></div></div>';
    }).join('');

    openModal(
      '<div class="p-5 sm:p-6"><div class="flex items-start justify-between gap-4">' +
      '<div><span class="chip">' + dot(c.warna) + c.id + ' · ' + c.sks + ' SKS</span><h2 class="text-xl font-extrabold tracking-tight mt-3 leading-snug">' + esc(c.nama) + '</h2>' +
      '<p class="text-sm t-soft mt-1">' + esc(c.dosen) + '</p></div>' +
      '<button class="icon-btn shrink-0" data-act="modal-close" aria-label="Tutup">' + ic('x') + '</button></div>' +
      '<div class="grid grid-cols-2 gap-3 mt-5 text-sm">' +
      '<div class="rounded-xl bg-slate-50 p-3.5"><p class="text-xs t-muted">Jadwal</p><p class="font-semibold mt-1">' + HARI[c.hari] + ', ' + c.mulai + '–' + c.selesai + '</p></div>' +
      '<div class="rounded-xl bg-slate-50 p-3.5"><p class="text-xs t-muted">Ruang</p><p class="font-semibold mt-1">' + esc(c.ruang) + '</p></div></div>' +

      '<h3 class="font-bold text-sm mt-6 mb-3">Kehadiran · ' + kehadiran(c) + '%</h3><div class="flex flex-wrap gap-1.5">' + dots + '</div>' +
      '<div class="flex gap-4 mt-3 text-[11px] t-muted"><span class="flex items-center gap-1.5"><i class="w-2.5 h-2.5 rounded bg-[#e5f6ef] inline-block"></i>Hadir</span><span class="flex items-center gap-1.5"><i class="w-2.5 h-2.5 rounded bg-[#fdeaed] inline-block"></i>Tidak hadir</span><span class="flex items-center gap-1.5"><i class="w-2.5 h-2.5 rounded bg-slate-100 inline-block"></i>Belum</span></div>' +

      '<div class="flex items-center justify-between mt-6 mb-3"><h3 class="font-bold text-sm">Komponen nilai</h3><span class="flex items-center gap-2 text-sm">Sementara <b>' + n.toFixed(1) + '</b><span class="chip ' + gradeTone(g) + '">' + g + '</span></span></div>' +
      '<div class="space-y-3.5">' + komp + '</div>' +

      '<h3 class="font-bold text-sm mt-6 mb-1">Tugas terkait</h3>' +
      (related.length ? '<div class="divide-line">' + related.map(taskRow).join('') + '</div>' : '<p class="text-sm t-muted py-3">Belum ada tugas.</p>') +
      '</div>');
  }

  /* ---------- Tugas ---------- */
  let taskFilter = 'aktif';

  function taskCard(t) {
    const c = mk(t.mk); const done = taskDone(t); const d = dueInfo(t.due, done);
    const sub = st.tugas[t.id];
    return '<article class="card card-p flex flex-col sm:flex-row sm:items-center gap-4">' +
      '<div class="flex-1 min-w-0"><div class="flex flex-wrap items-center gap-2">' +
      '<span class="chip">' + dot(c.warna) + esc(c.nama) + '</span>' + (done ? '' : prioChip(t.prioritas)) + '</div>' +
      '<h3 class="font-extrabold mt-2.5 leading-snug">' + esc(t.judul) + '</h3>' +
      '<p class="text-sm t-soft mt-1 leading-relaxed">' + esc(t.desc) + '</p>' +
      '<p class="text-xs t-muted mt-3 flex items-center gap-1.5">' + ic('calendar-days', 'w-3.5 h-3.5') + 'Tenggat ' + fMid(t.due) + ', ' + fTime(t.due) + ' WIB' +
      (sub && sub.file ? ' · ' + ic('paperclip', 'w-3.5 h-3.5') + esc(sub.file) : '') + '</p></div>' +
      '<div class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0">' +
      '<span class="chip ' + d.cls + '">' + (done ? ic('check', 'w-3 h-3') : ic('timer', 'w-3 h-3')) + d.label + '</span>' +
      (done ? '' : '<button class="btn btn-primary btn-sm" data-act="task-submit" data-id="' + t.id + '">' + ic('upload', 'w-3.5 h-3.5') + 'Kumpulkan</button>') +
      '</div></article>';
  }

  function tasksListHTML() {
    const all = tugas.slice().sort((a, b) => a.due - b.due);
    const list = taskFilter === 'aktif' ? all.filter(t => !taskDone(t)) : taskFilter === 'selesai' ? all.filter(taskDone).reverse() : all;
    return list.length ? list.map(taskCard).join('') : '<div class="card card-p">' + empty('circle-check', taskFilter === 'aktif' ? 'Hebat! Tidak ada tugas yang tertunda.' : 'Belum ada tugas pada kategori ini.') + '</div>';
  }

  function viewTugas() {
    const a = taskActive().length; const s = tugas.length - a;
    const tab = (id, label, n) => '<button class="tab' + (taskFilter === id ? ' active' : '') + '" data-act="task-filter" data-id="' + id + '">' + label + ' <span class="t-muted ml-0.5">' + n + '</span></button>';
    return '<div class="view-enter">' +
      pageHead('Tugas', 'Kumpulkan tugas sebelum tenggat agar nilai tidak berkurang.',
        '<div class="tabs" id="task-tabs">' + tab('aktif', 'Belum selesai', a) + tab('selesai', 'Selesai', s) + tab('semua', 'Semua', tugas.length) + '</div>') +
      '<div id="task-list" class="space-y-3">' + tasksListHTML() + '</div></div>';
  }

  function submitModal(id) {
    const t = tugas.find(x => x.id === id); if (!t) return;
    openModal(
      '<form data-form="submit-task" data-id="' + id + '" class="p-5 sm:p-6" novalidate>' +
      '<div class="flex items-start justify-between gap-4"><div><p class="text-xs font-semibold t-muted">' + esc(mk(t.mk).nama) + '</p>' +
      '<h2 class="text-lg font-extrabold tracking-tight mt-1 leading-snug">' + esc(t.judul) + '</h2></div>' +
      '<button type="button" class="icon-btn shrink-0" data-act="modal-close" aria-label="Tutup">' + ic('x') + '</button></div>' +
      '<p class="text-sm t-soft mt-3 leading-relaxed">' + esc(t.desc) + '</p>' +
      '<div class="mt-5"><label class="label" for="f-file">Berkas tugas</label>' +
      '<input id="f-file" type="file" class="input !p-2.5 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold" accept=".pdf,.doc,.docx,.zip,.png,.jpg,.jpeg,.ppt,.pptx" />' +
      '<p class="field-error hidden" id="f-err">Pilih berkas terlebih dahulu.</p></div>' +
      '<div class="mt-4"><label class="label" for="f-note">Catatan untuk dosen (opsional)</label><textarea id="f-note" rows="3" class="input" placeholder="Tulis catatan singkat…"></textarea></div>' +
      '<div class="flex gap-3 mt-6"><button type="button" class="btn btn-outline flex-1" data-act="modal-close">Batal</button><button class="btn btn-primary flex-1" type="submit">Kumpulkan tugas</button></div></form>');
  }

  /* ---------- Ujian ---------- */
  let examTab = 'UTS';

  function examListHTML() {
    const list = ujian.filter(u => u.jenis === examTab).sort((a, b) => a.tanggal - b.tanggal);
    return list.map(u => {
      const c = mk(u.mk); const d = dueInfo(u.tanggal);
      return '<article class="card card-p flex flex-wrap items-center gap-4">' +
        '<div class="w-16 shrink-0 rounded-xl bg-slate-50 border border-slate-200/70 py-2 text-center"><p class="text-[10px] font-bold uppercase t-muted">' + fDate(u.tanggal, { month: 'short' }) + '</p>' +
        '<p class="text-xl font-extrabold leading-none mt-0.5">' + fDate(u.tanggal, { day: 'numeric' }) + '</p><p class="text-[10px] t-muted mt-1">' + fDate(u.tanggal, { weekday: 'short' }) + '</p></div>' +
        '<div class="flex-1 min-w-[12rem]"><h3 class="font-extrabold leading-snug">' + esc(c.nama) + '</h3>' +
        '<p class="text-xs t-muted mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1"><span class="flex items-center gap-1.5">' + ic('clock', 'w-3.5 h-3.5') + u.mulai + '–' + u.selesai + ' WIB</span>' +
        '<span class="flex items-center gap-1.5">' + ic('map-pin', 'w-3.5 h-3.5') + esc(u.ruang) + '</span></p></div>' +
        '<div class="flex items-center gap-2"><span class="chip chip-info">' + u.mode + '</span>' + (u.tanggal > new Date() ? '<span class="chip ' + d.cls + '">' + d.label + '</span>' : '<span class="chip">Selesai</span>') + '</div></article>';
    }).join('');
  }

  function viewUjian() {
    const next = ujian.filter(u => u.tanggal > new Date()).sort((a, b) => a.tanggal - b.tanggal)[0];
    const lunas = unpaid().length === 0;
    return '<div class="view-enter">' +
      pageHead('Ujian', 'Jadwal ujian semester ini beserta ruang dan waktunya.',
        '<div class="tabs"><button class="tab' + (examTab === 'UTS' ? ' active' : '') + '" data-act="exam-tab" data-id="UTS">UTS</button><button class="tab' + (examTab === 'UAS' ? ' active' : '') + '" data-act="exam-tab" data-id="UAS">UAS</button></div>') +
      '<div class="grid lg:grid-cols-3 gap-4 mb-5">' +
      (next ? '<div class="lg:col-span-2 rounded-[1.125rem] p-5 sm:p-6 text-white brand-panel"><p class="text-xs font-semibold text-white/60">Ujian berikutnya</p>' +
        '<h2 class="text-xl sm:text-2xl font-extrabold tracking-tight mt-2">' + next.jenis + ' ' + esc(mk(next.mk).nama) + '</h2>' +
        '<p class="text-sm text-white/70 mt-2">' + fLong(next.tanggal) + ' · ' + next.mulai + ' WIB · ' + esc(next.ruang) + '</p>' +
        '<p class="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold">' + ic('timer') + dueInfo(next.tanggal).label + '</p></div>' : '') +
      '<div class="card card-p"><p class="text-xs font-semibold t-muted">Kartu ujian</p>' +
      '<p class="font-extrabold mt-2 flex items-center gap-2">' + (lunas ? ic('circle-check', 'w-5 h-5 text-[#12805c]') + 'Aktif' : ic('triangle-alert', 'w-5 h-5 text-[#b45309]') + 'Menunggu pembayaran') + '</p>' +
      '<p class="text-xs t-soft mt-2 leading-relaxed">' + (lunas ? 'Semua tagihan lunas. Tunjukkan kartu ujian dan KTM kepada pengawas.' : 'Selesaikan ' + unpaid().length + ' tagihan agar kartu ujian dapat dicetak.') + '</p>' +
      (lunas ? '' : '<a href="#/keuangan" class="btn btn-brand btn-sm mt-4">Bayar sekarang</a>') + '</div></div>' +
      '<div id="exam-list" class="space-y-3">' + examListHTML() + '</div></div>';
  }

  /* ---------- Nilai & IPK ---------- */
  function viewNilai() {
    const bars = riwayat.map(r =>
      '<div class="flex-1 flex flex-col items-center gap-2 min-w-0"><span class="text-xs font-bold">' + r.ips.toFixed(2) + '</span>' +
      '<div class="w-full max-w-[3.2rem] rounded-xl bg-slate-100 h-36 flex items-end overflow-hidden"><div class="w-full rounded-xl bg-ink" style="height:' + (r.ips / 4 * 100) + '%"></div></div>' +
      '<span class="text-xs t-muted font-medium">Smt ' + r.smt + '</span></div>').join('');
    const pct = Math.round(sksLulus() / DB.SKS_LULUS_TARGET * 100);

    const rows = courses.map(c => {
      const n = nilaiSementara(c); const g = gradeOf(n); const v = (x) => x == null ? '<span class="t-muted">–</span>' : x;
      return '<tr><td class="font-semibold">' + dot(c.warna) + ' <span class="ml-1.5">' + esc(c.nama) + '</span><p class="text-xs t-muted font-normal mt-0.5 ml-4">' + c.id + '</p></td><td class="text-center">' + c.sks + '</td>' +
        '<td class="text-center">' + v(c.nilai.tugas) + '</td><td class="text-center">' + v(c.nilai.kuis) + '</td><td class="text-center">' + v(c.nilai.uts) + '</td><td class="text-center">' + v(c.nilai.uas) + '</td>' +
        '<td class="text-center font-bold">' + n.toFixed(1) + '</td><td class="text-center"><span class="chip ' + gradeTone(g) + '">' + g + '</span></td></tr>';
    }).join('');

    return '<div class="view-enter">' + pageHead('Nilai & IPK', 'Ringkasan prestasi akademik dari semester 1 hingga sekarang.') +
      '<div class="grid lg:grid-cols-3 gap-4">' +
      '<div class="card card-p"><p class="text-xs font-semibold t-muted">Indeks Prestasi Kumulatif</p>' +
      '<p class="text-5xl font-extrabold tracking-tight mt-3">' + ipk().toFixed(2) + '<span class="text-lg t-muted font-bold"> / 4.00</span></p>' +
      '<p class="mt-3"><span class="chip chip-brand">' + ic('award', 'w-3 h-3') + predikat(ipk()) + '</span></p>' +
      '<div class="mt-6"><div class="flex justify-between text-xs mb-1.5"><span class="t-muted font-medium">SKS lulus</span><b>' + sksLulus() + ' / ' + DB.SKS_LULUS_TARGET + '</b></div>' +
      '<div class="bar brand"><i style="width:' + pct + '%"></i></div><p class="text-xs t-muted mt-2">' + pct + '% menuju kelulusan</p></div></div>' +
      '<div class="card card-p lg:col-span-2"><div class="flex items-center justify-between"><h2 class="font-extrabold">Indeks Prestasi per Semester</h2><span class="chip">' + ic('trending-up', 'w-3 h-3') + 'Stabil naik</span></div>' +
      '<div class="flex gap-3 sm:gap-5 mt-5 items-end">' + bars + '</div></div></div>' +

      '<section class="card mt-5 overflow-hidden"><div class="p-5 sm:p-6 pb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 class="font-extrabold">Nilai Semester ' + user.semester + ' (sementara)</h2>' +
      '<p class="text-xs t-muted mt-1">Bobot: Tugas 25% · Kuis 15% · UTS 25% · UAS 35%. Nilai akhir keluar setelah UAS.</p></div></div>' +
      '<div class="overflow-x-auto"><table class="tbl min-w-[640px]"><thead><tr><th>Mata kuliah</th><th class="text-center">SKS</th><th class="text-center">Tugas</th><th class="text-center">Kuis</th><th class="text-center">UTS</th><th class="text-center">UAS</th><th class="text-center">Nilai</th><th class="text-center">Grade</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>' +

      '<section class="card mt-5 overflow-hidden"><div class="p-5 sm:p-6 pb-3"><h2 class="font-extrabold">Riwayat Semester</h2></div>' +
      '<div class="overflow-x-auto"><table class="tbl min-w-[480px]"><thead><tr><th>Semester</th><th>Periode</th><th class="text-center">SKS</th><th class="text-center">IPS</th></tr></thead><tbody>' +
      riwayat.slice().reverse().map(r => '<tr><td class="font-semibold">Semester ' + r.smt + '</td><td class="t-soft">' + r.periode + '</td><td class="text-center">' + r.sks + '</td><td class="text-center font-bold">' + r.ips.toFixed(2) + '</td></tr>').join('') +
      '</tbody></table></div></section></div>';
  }

  /* ---------- Keuangan ---------- */
  function billCard(b) {
    const paid = billPaid(b); const info = billInfo(b);
    const overdue = !paid && b.due < new Date();
    return '<article class="card card-p flex flex-wrap items-center gap-4">' +
      '<span class="chip ' + (paid ? 'chip-ok' : overdue ? 'chip-bad' : 'chip-warn') + ' !p-3 !rounded-2xl">' + ic(paid ? 'circle-check' : 'receipt', 'w-5 h-5') + '</span>' +
      '<div class="flex-1 min-w-[11rem]"><h3 class="font-extrabold leading-snug">' + esc(b.nama) + '</h3>' +
      '<p class="text-xs t-muted mt-1">' + b.kode + ' · ' + (paid ? 'Dibayar ' + fMid(info.paidAt) + ' · ' + esc(info.method) : 'Jatuh tempo ' + fMid(b.due)) + '</p></div>' +
      '<div class="flex items-center gap-4 ml-auto"><div class="text-right"><p class="font-extrabold">' + rp(b.jumlah) + '</p>' +
      '<span class="chip ' + (paid ? 'chip-ok' : overdue ? 'chip-bad' : 'chip-warn') + ' mt-1">' + (paid ? 'Lunas' : overdue ? 'Terlambat' : 'Belum dibayar') + '</span></div>' +
      (paid ? '' : '<button class="btn btn-primary btn-sm" data-act="bill-pay" data-id="' + b.id + '">Bayar</button>') + '</div></article>';
  }

  function viewKeuangan() {
    const paidList = tagihan.filter(billPaid).sort((a, b) => billInfo(b).paidAt - billInfo(a).paidAt);
    const paidTotal = paidList.reduce((a, b) => a + b.jumlah, 0);
    return '<div class="view-enter">' + pageHead('Keuangan', 'Tagihan dan riwayat pembayaran semester ' + user.semester + '.') +
      '<div class="grid sm:grid-cols-3 gap-3 sm:gap-4">' +
      statCard('receipt', 'Belum dibayar', rp(totalUnpaid()), unpaid().length + ' tagihan aktif', totalUnpaid() ? 'chip-bad' : 'chip-ok') +
      statCard('circle-check', 'Sudah dibayar', rp(paidTotal), paidList.length + ' transaksi', 'chip-ok') +
      statCard('wallet', 'Total semester', rp(tagihan.reduce((a, b) => a + b.jumlah, 0)), tagihan.length + ' komponen biaya', 'chip-info') + '</div>' +
      '<h2 class="font-extrabold mt-8 mb-3">Daftar Tagihan</h2><div class="space-y-3" id="bill-list">' +
      tagihan.slice().sort((a, b) => billPaid(a) - billPaid(b) || a.due - b.due).map(billCard).join('') + '</div>' +
      '<section class="card mt-8 overflow-hidden"><div class="p-5 sm:p-6 pb-3"><h2 class="font-extrabold">Riwayat Pembayaran</h2></div>' +
      (paidList.length ? '<div class="overflow-x-auto"><table class="tbl min-w-[520px]"><thead><tr><th>Tanggal</th><th>Keterangan</th><th>Metode</th><th class="text-right">Jumlah</th></tr></thead><tbody>' +
        paidList.map(b => { const i = billInfo(b); return '<tr><td class="t-soft whitespace-nowrap">' + fMid(i.paidAt) + ', ' + fTime(i.paidAt) + '</td><td class="font-semibold">' + esc(b.nama) + '</td><td class="t-soft">' + esc(i.method) + '</td><td class="text-right font-bold">' + rp(b.jumlah) + '</td></tr>'; }).join('') +
        '</tbody></table></div>' : empty('receipt', 'Belum ada pembayaran.')) + '</section></div>';
  }

  const METHODS = [
    { id: 'BCA Virtual Account', icon: 'landmark', code: '39358' },
    { id: 'Mandiri Virtual Account', icon: 'landmark', code: '88908' },
    { id: 'BNI Virtual Account', icon: 'landmark', code: '8277' },
    { id: 'QRIS', icon: 'qr-code', code: '' }
  ];
  let payState = null;

  function payModal() {
    const b = tagihan.find(x => x.id === payState.id);
    let body;
    if (payState.step === 1) {
      body = '<p class="text-sm t-soft mt-1">Pilih metode pembayaran untuk <b class="text-ink">' + esc(b.nama) + '</b>.</p>' +
        '<div class="mt-5 space-y-2.5">' + METHODS.map(m =>
          '<label class="flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer transition ' + (payState.method === m.id ? 'border-ink bg-slate-50' : 'border-slate-200 hover:bg-slate-50') + '">' +
          '<input type="radio" name="method" class="accent-[#1b1b3a]" value="' + m.id + '" data-act="pay-method"' + (payState.method === m.id ? ' checked' : '') + ' />' +
          '<span class="chip !p-2 !rounded-lg">' + ic(m.icon) + '</span><span class="font-semibold text-sm">' + m.id + '</span></label>').join('') + '</div>' +
        '<div class="flex gap-3 mt-6"><button class="btn btn-outline flex-1" data-act="modal-close">Batal</button><button class="btn btn-primary flex-1" data-act="pay-next" ' + (payState.method ? '' : 'disabled') + '>Lanjutkan</button></div>';
    } else {
      const m = METHODS.find(x => x.id === payState.method);
      const va = m.code + user.nim.padStart(12, '0').slice(-12);
      body = '<div class="mt-5 rounded-2xl bg-slate-50 border border-slate-200/70 p-5 text-center">' +
        (m.id === 'QRIS'
          ? '<div class="mx-auto w-40 h-40 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">' + ic('qr-code', 'w-24 h-24 text-ink') + '</div><p class="text-xs t-muted mt-3">Pindai dengan aplikasi e-wallet atau mobile banking</p>'
          : '<p class="text-xs t-muted">Nomor Virtual Account · ' + esc(m.id.replace(' Virtual Account', '')) + '</p><p class="text-2xl font-extrabold tracking-wider tabular-nums mt-2">' + va + '</p>') +
        '<p class="text-xs t-muted mt-4">Total pembayaran</p><p class="text-2xl font-extrabold mt-1">' + rp(b.jumlah) + '</p></div>' +
        '<p class="text-xs t-muted mt-4 leading-relaxed">Ini adalah simulasi. Tekan tombol di bawah untuk menandai tagihan sebagai lunas — pada sistem nyata status berubah otomatis dari notifikasi bank.</p>' +
        '<div class="flex gap-3 mt-5"><button class="btn btn-outline flex-1" data-act="pay-back">Kembali</button><button class="btn btn-brand flex-1" data-act="pay-confirm">Saya sudah membayar</button></div>';
    }
    openModal('<div class="p-5 sm:p-6"><div class="flex items-center justify-between gap-4"><h2 class="text-lg font-extrabold tracking-tight">' + (payState.step === 1 ? 'Metode pembayaran' : 'Selesaikan pembayaran') + '</h2>' +
      '<button class="icon-btn" data-act="modal-close" aria-label="Tutup">' + ic('x') + '</button></div>' + body + '</div>');
  }

  /* ---------- Profil ---------- */
  function viewProfil() {
    const row = (icon, k, v) => '<div class="flex items-start gap-3 py-3">' + ic(icon, 'w-4 h-4 t-muted mt-0.5') + '<div class="min-w-0"><p class="text-xs t-muted">' + k + '</p><p class="text-sm font-semibold mt-0.5 break-words">' + esc(v || '—') + '</p></div></div>';
    return '<div class="view-enter">' + pageHead('Profil', 'Kelola data diri dan keamanan akunmu.') +
      '<div class="grid lg:grid-cols-3 gap-4 sm:gap-5 items-start">' +
      '<section class="card card-p"><div class="text-center"><span class="avatar w-20 h-20 text-2xl">' + initials(user.nama) + '</span>' +
      '<h2 class="font-extrabold text-lg mt-4 leading-snug">' + esc(user.nama) + '</h2><p class="text-sm t-muted mt-0.5">NIM ' + esc(user.nim) + '</p>' +
      '<p class="mt-3"><span class="chip chip-brand">Mahasiswa aktif · Semester ' + user.semester + '</span></p></div>' +
      '<div class="divide-line mt-5">' + row('graduation-cap', 'Program studi', user.prodi + ' · ' + user.fakultas) + row('calendar-days', 'Angkatan', String(user.angkatan)) +
      row('user-round', 'Dosen pembimbing akademik', user.dosenPA) + row('mail', 'Email', user.email) + '</div>' +
      '<button class="btn btn-outline w-full mt-5" data-act="logout">' + ic('log-out') + 'Keluar</button></section>' +

      '<div class="lg:col-span-2 space-y-4 sm:space-y-5">' +
      '<form class="card card-p" data-form="profile" novalidate><h2 class="font-extrabold">Data diri</h2><p class="text-xs t-muted mt-1">Nama, NIM, dan program studi diubah melalui BAAK.</p>' +
      '<div class="grid sm:grid-cols-2 gap-4 mt-5">' +
      '<div><label class="label" for="p-nama">Nama lengkap</label><input id="p-nama" class="input bg-slate-50" value="' + esc(user.nama) + '" disabled /></div>' +
      '<div><label class="label" for="p-nim">NIM</label><input id="p-nim" class="input bg-slate-50" value="' + esc(user.nim) + '" disabled /></div>' +
      '<div><label class="label" for="p-email">Email</label><input id="p-email" type="email" class="input" value="' + esc(user.email) + '" /></div>' +
      '<div><label class="label" for="p-telp">No. telepon</label><input id="p-telp" class="input" value="' + esc(user.telp) + '" placeholder="08xx-xxxx-xxxx" /></div>' +
      '<div class="sm:col-span-2"><label class="label" for="p-alamat">Alamat</label><input id="p-alamat" class="input" value="' + esc(user.alamat) + '" placeholder="Alamat tempat tinggal" /></div></div>' +
      '<p class="field-error hidden mt-3" id="p-err"></p><div class="mt-5"><button class="btn btn-primary" type="submit">' + ic('save') + 'Simpan perubahan</button></div></form>' +

      '<form class="card card-p" data-form="password" novalidate><h2 class="font-extrabold">Ganti kata sandi</h2>' +
      '<div class="grid sm:grid-cols-3 gap-4 mt-5">' +
      '<div><label class="label" for="w-old">Sandi lama</label><input id="w-old" type="password" class="input" autocomplete="current-password" /></div>' +
      '<div><label class="label" for="w-new">Sandi baru</label><input id="w-new" type="password" class="input" autocomplete="new-password" placeholder="Min. 8 karakter" /></div>' +
      '<div><label class="label" for="w-new2">Ulangi sandi baru</label><input id="w-new2" type="password" class="input" autocomplete="new-password" /></div></div>' +
      '<p class="field-error hidden mt-3" id="w-err"></p><div class="mt-5"><button class="btn btn-primary" type="submit">' + ic('lock') + 'Perbarui kata sandi</button></div></form>' +
      '</div></div></div>';
  }

  /* =======================================================
     5. MODAL & AKSI
     ======================================================= */
  function openModal(html) {
    $('#modal-root').innerHTML = '<div class="modal-overlay" data-act="overlay"><div class="modal" role="dialog" aria-modal="true">' + html + '</div></div>';
    paintIcons();
    const first = $('#modal-root input:not([disabled]), #modal-root button.btn-primary');
    if (first && first.type !== 'radio') first.focus({ preventScroll: true });
  }
  function closeModal() { $('#modal-root').innerHTML = ''; payState = null; }

  const closePops = () => { $('#notif').classList.add('hidden'); $('#search-results').classList.add('hidden'); };
  const openNav = () => { $('#sidebar').classList.remove('-translate-x-full'); $('#scrim').classList.remove('hidden'); };
  const closeNav = () => { $('#sidebar').classList.add('-translate-x-full'); $('#scrim').classList.add('hidden'); };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) {
      if (!e.target.closest('#notif') && !e.target.closest('#search-results') && !e.target.closest('#search')) closePops();
      return;
    }
    const act = el.dataset.act; const id = el.dataset.id;

    switch (act) {
      case 'nav-open': openNav(); break;
      case 'nav-close': closeNav(); break;
      case 'logout': Auth.logout(); break;

      case 'notif-toggle': {
        const box = $('#notif'); const show = box.classList.contains('hidden');
        closePops(); if (show) { paintNotifs(); box.classList.remove('hidden'); }
        break;
      }
      case 'notif-readall':
        buildNotifs().forEach(n => { if (!st.baca.includes(n.id)) st.baca.push(n.id); });
        persist(); paintNotifs(); break;
      case 'notif-go':
        if (!st.baca.includes(id)) st.baca.push(id);
        persist(); paintNotifs(); closePops(); location.hash = el.dataset.go; break;
      case 'search-go':
        closePops(); $('#search').value = ''; location.hash = el.dataset.go; break;

      case 'overlay': if (e.target === el) closeModal(); break;
      case 'modal-close': closeModal(); break;

      case 'course-open': courseModal(id); break;

      case 'task-filter':
        taskFilter = id; $('#view').innerHTML = viewTugas(); paintIcons(); break;
      case 'task-submit': submitModal(id); break;

      case 'exam-tab':
        examTab = id; $('#view').innerHTML = viewUjian(); paintIcons(); break;

      case 'bill-pay': payState = { id, step: 1, method: null }; payModal(); break;
      case 'pay-method': payState.method = el.value; payModal(); break;
      case 'pay-next': if (payState.method) { payState.step = 2; payModal(); } break;
      case 'pay-back': payState.step = 1; payModal(); break;
      case 'pay-confirm': {
        st.bayar[payState.id] = { paidAt: new Date().toISOString(), method: payState.method };
        persist(); closeModal(); route(); toast('Pembayaran berhasil dicatat. Terima kasih!', 'ok'); break;
      }

      case 'cal-prev':
      case 'cal-next': {
        calView.m += act === 'cal-next' ? 1 : -1;
        if (calView.m < 0) { calView.m = 11; calView.y--; }
        if (calView.m > 11) { calView.m = 0; calView.y++; }
        $('#cal-box').innerHTML = calendarHTML(); paintIcons(); break;
      }
    }
  });

  /* Radio metode bayar: pakai event 'change' agar terdeteksi benar */
  document.addEventListener('change', (e) => {
    if (e.target.matches('[data-act="pay-method"]')) { payState.method = e.target.value; payModal(); }
  });

  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('[data-form]'); if (!form) return;
    e.preventDefault();
    const type = form.dataset.form;

    if (type === 'submit-task') {
      const file = $('#f-file').files[0];
      if (!file) { $('#f-err').classList.remove('hidden'); return; }
      st.tugas[form.dataset.id] = { status: 'done', file: file.name, note: $('#f-note').value.trim(), at: new Date().toISOString() };
      persist(); closeModal(); route(); toast('Tugas berhasil dikumpulkan.', 'ok');
    }

    if (type === 'profile') {
      const email = $('#p-email').value.trim(); const err = $('#p-err');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = 'Format email tidak valid.'; err.classList.remove('hidden'); return; }
      err.classList.add('hidden');
      user = Auth.update(user.nim, { email, telp: $('#p-telp').value.trim(), alamat: $('#p-alamat').value.trim() });
      paintUser(); route(); toast('Profil berhasil diperbarui.', 'ok');
    }

    if (type === 'password') {
      const o = $('#w-old').value, n = $('#w-new').value, n2 = $('#w-new2').value; const err = $('#w-err');
      const fail = (m) => { err.textContent = m; err.classList.remove('hidden'); };
      if (n.length < 8) return fail('Kata sandi baru minimal 8 karakter.');
      if (n !== n2) return fail('Konfirmasi kata sandi tidak sama.');
      try { await Auth.changePassword(user.nim, o, n); err.classList.add('hidden'); form.reset(); toast('Kata sandi berhasil diperbarui.', 'ok'); }
      catch (ex) { fail(ex.message); }
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'search') runSearch(e.target.value);
    if (e.target.id === 'course-filter') {
      const q = e.target.value.trim().toLowerCase();
      const list = courses.filter(c => (c.nama + c.id + c.dosen).toLowerCase().includes(q));
      $('#course-grid').innerHTML = list.length ? list.map(courseCard).join('') : '<div class="card card-p sm:col-span-2 xl:col-span-3">' + empty('search', 'Mata kuliah tidak ditemukan.') + '</div>';
      paintIcons();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); closePops(); closeNav(); }
  });

  /* =======================================================
     6. ROUTER & INISIALISASI
     ======================================================= */
  const VIEWS = {
    dashboard: viewDashboard, jadwal: viewJadwal, matakuliah: viewMatakuliah, tugas: viewTugas,
    ujian: viewUjian, nilai: viewNilai, keuangan: viewKeuangan, profil: viewProfil
  };

  function route() {
    const raw = (location.hash || '#/dashboard').replace(/^#\/?/, '');
    const [name, query] = raw.split('?');
    const page = VIEWS[name] ? name : 'dashboard';
    const meta = NAV.find(n => n.id === page);

    $('#view').innerHTML = VIEWS[page]();
    document.title = meta.label + ' — ART Learning Management';
    paintNav(page); paintNotifs(); paintIcons(); tick(); closeNav();
    window.scrollTo({ top: 0 });

    // Deep-link dari pencarian: #/matakuliah?open=IF301
    if (page === 'matakuliah' && query) {
      const id = new URLSearchParams(query).get('open');
      if (id) courseModal(id);
    }
  }

  window.addEventListener('hashchange', () => { closeModal(); route(); });

  $('#year').textContent = new Date().getFullYear();
  paintUser();
  route();
  setInterval(tick, 1000);
})();
