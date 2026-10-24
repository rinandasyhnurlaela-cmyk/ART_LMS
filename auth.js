/* =========================================================
   auth.js — Autentikasi (DEMO, sisi klien)
   ---------------------------------------------------------
   Data akun disimpan di localStorage dan kata sandi di-hash
   (SHA-256 + salt) agar tidak tersimpan polos.
   PENTING: ini hanya untuk prototipe. Untuk produksi, ganti
   dengan autentikasi server (JWT/session cookie + HTTPS).
   ========================================================= */
const Auth = (() => {
  'use strict';

  const USERS = 'pb_users';
  const SESSION = 'pb_session';
  const SALT = 'pelita-bangsa::';
  const DAY = 24 * 60 * 60 * 1000;

  const read = (store, key) => {
    try { return JSON.parse(store.getItem(key)); } catch (e) { return null; }
  };
  const users = () => read(localStorage, USERS) || [];
  const saveUsers = (list) => localStorage.setItem(USERS, JSON.stringify(list));

  async function hash(text) {
    if (window.crypto && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(SALT + text));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Cadangan sederhana bila Web Crypto tidak tersedia (mis. HTTP non-localhost)
    let h = 5381;
    for (const c of SALT + text) h = ((h << 5) + h + c.charCodeAt(0)) | 0;
    return 'f' + (h >>> 0).toString(16);
  }

  // Sinkronisasi/migrasi data akun lama atau akun demo secara langsung (sinkron)
  try {
    const rawUsers = localStorage.getItem(USERS);
    if (rawUsers) {
      let list = JSON.parse(rawUsers);
      let changed = false;
      list.forEach(u => {
        if (u.nim === '2024101234' || u.nama === 'Aditya Pratama') {
          u.nim = '312410511';
          u.nama = 'Rinanda Syah Nurlaela';
          if (!u.email || u.email.includes('aditya')) u.email = 'rinandasyhnurlaela@mhs.pelitabangsa.ac.id';
          if (!u.telp || u.telp.includes('3456')) u.telp = '081296338253';
          if (!u.alamat || u.alamat.includes('Cikarang')) u.alamat = 'Tambun Selatan';
          changed = true;
        }
      });
      if (changed) localStorage.setItem(USERS, JSON.stringify(list));
    }
    ['localStorage', 'sessionStorage'].forEach(stName => {
      try {
        const rawSess = window[stName].getItem(SESSION);
        if (rawSess) {
          const s = JSON.parse(rawSess);
          if (s && s.nim === '2024101234') {
            s.nim = '312410511';
            window[stName].setItem(SESSION, JSON.stringify(s));
          }
        }
      } catch (e) {}
    });
  } catch (e) {}

  /** Buat akun demo bila belum ada */
  const ready = (async () => {
    const list = users();
    const demo = list.find(u => u.nim === '312410511');
    if (!demo) {
      list.push({
        nim: '312410511', nama: 'Rinanda Syah Nurlaela', email: 'rinandasyhnurlaela@mhs.pelitabangsa.ac.id',
        telp: '081296338253', alamat: 'Tambun Selatan',
        prodi: 'Teknik Informatika', fakultas: 'Fakultas Teknik', angkatan: 2024, semester: 5,
        dosenPA: 'Dr. Budi Santoso, M.Kom.',
        passHash: await hash('mahasiswa123')
      });
      saveUsers(list);
    } else {
      // Pastikan nama & data demo terbaru
      demo.nama = 'Rinanda Syah Nurlaela';
      if (!demo.email || demo.email.includes('aditya')) demo.email = 'rinandasyhnurlaela@mhs.pelitabangsa.ac.id';
      if (!demo.telp) demo.telp = '081296338253';
      if (!demo.alamat) demo.alamat = 'Tambun Selatan';
      saveUsers(list);
    }
  })();

  const publicUser = (u) => { if (!u) return null; const { passHash, ...rest } = u; return rest; };

  async function register(data) {
    await ready;
    const list = users();
    if (list.some(u => u.nim === data.nim)) throw new Error('NIM sudah terdaftar. Silakan masuk.');
    const angkatan = Number(String(data.nim).slice(0, 4));
    const tahunIni = new Date().getFullYear();
    const user = {
      nim: data.nim, nama: data.nama, email: data.email, telp: '', alamat: '',
      prodi: data.prodi, fakultas: data.fakultas || 'Fakultas Teknik',
      angkatan: angkatan > 2000 && angkatan <= tahunIni ? angkatan : tahunIni,
      semester: 1, dosenPA: 'Akan ditentukan BAAK',
      passHash: await hash(data.password)
    };
    list.push(user);
    saveUsers(list);
    return publicUser(user);
  }

  async function login(nim, password, remember) {
    await ready;
    const u = users().find(x => x.nim === nim);
    if (!u || u.passHash !== await hash(password)) throw new Error('NIM atau kata sandi salah.');
    const session = { nim: u.nim, exp: Date.now() + (remember ? 7 * DAY : DAY) };
    // "Ingat saya" -> localStorage (tetap ada), jika tidak -> sessionStorage (hilang saat tab ditutup)
    localStorage.removeItem(SESSION); sessionStorage.removeItem(SESSION);
    (remember ? localStorage : sessionStorage).setItem(SESSION, JSON.stringify(session));
    return publicUser(u);
  }

  function session() {
    const s = read(sessionStorage, SESSION) || read(localStorage, SESSION);
    if (!s || s.exp < Date.now()) return null;
    return s;
  }

  function current() {
    const s = session();
    if (!s) return null;
    return publicUser(users().find(u => u.nim === s.nim));
  }

  function logout() {
    localStorage.removeItem(SESSION);
    sessionStorage.removeItem(SESSION);
    location.replace('login.html');
  }

  /** Dipanggil di halaman terproteksi. Mengarahkan ke login bila belum masuk. */
  function requireAuth() {
    const u = current();
    if (!u) { location.replace('login.html'); return null; }
    return u;
  }

  function update(nim, patch) {
    const list = users();
    const i = list.findIndex(u => u.nim === nim);
    if (i < 0) return null;
    list[i] = Object.assign({}, list[i], patch);
    saveUsers(list);
    return publicUser(list[i]);
  }

  async function changePassword(nim, oldPass, newPass) {
    const list = users();
    const u = list.find(x => x.nim === nim);
    if (!u || u.passHash !== await hash(oldPass)) throw new Error('Kata sandi lama tidak sesuai.');
    u.passHash = await hash(newPass);
    saveUsers(list);
  }

  return { ready, register, login, current, logout, requireAuth, update, changePassword };
})();
