# ART Learning Management System (Universitas Pelita Bangsa)

Sistem Informasi Pembelajaran Terpadu & Interaktif untuk mahasiswa **Universitas Pelita Bangsa**. Aplikasi ini mencakup pengelolaan jadwal kuliah, mata kuliah & absensi, pengumpulan tugas, kartu ujian, transkrip nilai & grafik IPK, simulasi pembayaran perkuliahan, dan pengaturan profil.

Dibangun dengan arsitektur **Single Page Application (SPA) Vanilla** tanpa ketergantungan build tool kompleks — hanya menggunakan **HTML5, Tailwind CSS (via CDN), CSS3 kustom, dan Vanilla JavaScript**.

---

## 📑 Daftar Isi
1. [Fitur Utama](#-fitur-utama)
2. [Struktur Proyek](#-struktur-proyek)
3. [Panduan Instalasi & Menjalankan](#-panduan-instalasi--menjalankan)
4. [Akun Demo Masuk](#-akun-demo-masuk)
5. [Penjelasan Arsitektur & Kode](#-penjelasan-arsitektur--kode)
   - [Kerangka UI (`index.html` & `login.html`)](#1-kerangka-ui-indexhtml--loginhtml)
   - [Desain & Styling (`css/style.css` & `js/tw-config.js`)](#2-desain--styling-cssstylecss--jstw-configjs)
   - [Autentikasi Sisi Klien (`js/auth.js`)](#3-autentikasi-sisi-klien-jsauthjs)
   - [Database & State Management (`js/data.js`)](#4-database--state-management-jsdatajs)
   - [Router & Interaksi Komponen (`js/app.js`)](#5-router--interaksi-komponen-jsappjs)
6. [Panduan Kustomisasi](#-panduan-kustomisasi)
7. [Catatan Menuju Produksi](#-catatan-menuju-produksi)

---

## 🚀 Fitur Utama

| Modul | Deskripsi & Fungsionalitas |
|---|---|
| **Autentikasi** | Masuk (Login), Pendaftaran (Register), opsi *"Ingat Saya"*, keluar (Logout), ganti kata sandi, dan proteksi rute (`auth guard`). |
| **Bilah Atas (Header)** | Pencarian global real-time (mata kuliah, tugas, halaman), **1 lencana jam & tanggal live WIB** dengan ikon terintegrasi, tombol notifikasi interaktif beserta badge counter, dan avatar profil. |
| **Dashboard (Beranda)** | Ucapan salam dinamis sesuai waktu, ringkasan kelas hari ini, banner interaktif, statistik akademik (SKS, IPK, tugas, tagihan), daftar jadwal harian, tugas mendesak, kalender interaktif, dan pengumuman kampus. |
| **Jadwal Kuliah** | Kalender mingguan visual, filter hari, status kelas hari ini, nama dosen, ruang kelas, dan jam pelaksanaan. |
| **Mata Kuliah** | Kartu mata kuliah semester aktif, detail kehadiran/absensi per pertemuan (1–16), rincian bobot penilaian, dan daftar tugas terkait. |
| **Tugas Kuliah** | Filter status (*Belum*, *Selesai*, *Terlambat*), indikator prioritas (*Tinggi*, *Sedang*, *Rendah*), hitung mundur batas waktu (due date), serta modal pengumpulan tugas (unggah berkas simulasi & tautan). |
| **Ujian (UTS / UAS)** | Jadwal ujian, ruang & kursi ujian, unduh berkas kartu ujian digital, dan validasi prasyarat pembayaran tagihan kuliah untuk cetak kartu ujian. |
| **Nilai & Transkrip** | Ringkasan IPK kumulatif terhitung otomatis, riwayat IPS semester dalam format grafik bar, kartu nilai mata kuliah sementara, dan tabel transkrip akademik. |
| **Keuangan (Tagihan)** | Ringkasan status SPP & UKT, riwayat transaksi, dan simulasi pembayaran instan (Virtual Account Bank & QRIS) dengan pembaruan status real-time. |
| **Profil Pengguna** | Informasi lengkap mahasiswa (NIM, Nama, Prodi, Semester, Angkatan, Dosen PA), formulir pembaruan kontak (Email, No. HP, Alamat), dan formulir ganti kata sandi. |

---

## 📂 Struktur Proyek

```
lms-pelita-bangsa/
├── index.html        # Kerangka utama aplikasi SPA (Sidebar, Header, Kontainer Tampilan)
├── login.html        # Halaman autentikasi login & registrasi responsif
├── README.md         # Dokumentasi teknis proyek
├── css/
│   └── style.css     # CSS Custom: Design system, token CSS variable, komponen & animasi
├── img/
│   ├── logo.png      # Logo resmi aplikasi ART LMS
│   └── thumbnail.jpg # Banner visual pembelajaran pada dashboard
└── js/
    ├── tw-config.js  # Konfigurasi Tailwind (ekstensi warna brand/ink & font family)
    ├── auth.js       # Mesin autentikasi (kriptografi SHA-256 + salt, manajemen sesi)
    ├── data.js       # Data mock akademik, generator tanggal dinamis, & persistensi localStorage
    └── app.js        # Core SPA: Hash router, perenderan antarmuka, event delegator, jam live
```

---

## 💻 Panduan Instalasi & Menjalankan

Aplikasi ini murni frontend statis tanpa memerlukan kompilasi `npm` atau `webpack`. Namun, disarankan dijalankan melalui web server lokal agar fitur API peramban (`localStorage`, `sessionStorage`, dan `crypto.subtle`) berjalan optimal:

### Opsi 1: Menggunakan Python
```bash
# Masuk ke direktori proyek
cd lms-pelita-bangsa

# Jalankan HTTP server bawaan Python
python -m http.server 8080
```
Buka peramban di `http://localhost:8080/login.html` atau `http://localhost:8080/index.html`.

### Opsi 2: Menggunakan Node.js (`npx serve`)
```bash
npx serve .
```

### Opsi 3: Menggunakan VS Code Live Server
1. Buka folder proyek di Visual Studio Code.
2. Pasang ekstensi **Live Server** (oleh Ritwick Dey).
3. Klik kanan pada file [`login.html`](file:///c:/Users/Nanda/Desktop/lms-pelita-bangsa/login.html), pilih **"Open with Live Server"**.

> **Catatan:** Membutuhkan koneksi internet saat pertama kali dimuat untuk mengunduh pustaka Tailwind CSS, Google Font (*Plus Jakarta Sans*), dan ikon Lucide via CDN.

---

## 🔑 Akun Demo Masuk

Data uji coba default yang sudah terdaftar di sistem:

- **NIM:** `312410511`
- **Kata Sandi:** `mahasiswa123`

*(Anda juga dapat membuat akun mahasiswa baru secara langsung melalui tab "Daftar" pada halaman [`login.html`](file:///c:/Users/Nanda/Desktop/lms-pelita-bangsa/login.html)).*

---

## 🔍 Penjelasan Arsitektur & Kode

### 1. Kerangka UI (`index.html` & `login.html`)
- **[`login.html`](file:///c:/Users/Nanda/Desktop/lms-pelita-bangsa/login.html):** Menampilkan form masuk dan daftar dengan layout split (panel branding kiri pada desktop dan formulir di kanan).
- **[`index.html`](file:///c:/Users/Nanda/Desktop/lms-pelita-bangsa/index.html):** 
  - Memiliki *Guard Script* pada baris `<head>` yang mengecek `Auth.current()`. Bila belum login, pengguna otomatis dialihkan ke `login.html`.
  - Struktur layout menggunakan grid fleksibel: `<aside id="sidebar">`, `<header>` di bagian atas, `<main id="view">` sebagai kontainer dinamis halaman SPA, serta `#modal-root` dan `#toasts` untuk interaksi popup.
  - Memiliki satu **lencana jam & tanggal live** di header:
    ```html
    <div class="hidden sm:flex items-center gap-2.5 bg-white border border-slate-200/70 rounded-xl px-3.5 h-10">
      <i data-lucide="clock" class="w-4 h-4 text-brand-600"></i>
      <p class="text-sm font-bold tabular-nums" data-clock>--:--:--</p>
      <span class="w-px h-5 bg-slate-200"></span>
      <p class="text-xs font-medium t-soft hidden md:block" data-date-short>—</p>
      <span class="text-[10px] font-bold t-muted">WIB</span>
    </div>
    ```

### 2. Desain & Styling (`css/style.css` & `js/tw-config.js`)
- **[`js/tw-config.js`](file:///c:/Users/Nanda/Desktop/lms-pelita-bangsa/js/tw-config.js):** Mengonfigurasi Tailwind CSS Runtime CDN dengan palet warna Pelita Bangsa:
  - `brand`: Skala warna hijau tosca/emerald (`#16a34a`, `#15803d`, dsb.).
  - `ink`: Skala warna teks slate gelap (`#0f172a`).
  - Font utama: `'Plus Jakarta Sans'`.
- **[`css/style.css`](file:///c:/Users/Nanda/Desktop/lms-pelita-bangsa/css/style.css):** Mendefinisikan class utilitas modular:
  - `.card`, `.card-p`: Komponen kartu elegan berbayang halus.
  - `.btn`, `.btn-brand`, `.btn-outline`: Komponen tombol berbagai ukuran.
  - `.chip`, `.badge`: Indikator status (Lunas, Menunggu, Selesai, Terlambat).
  - Modal overlay dengan animasi transisi masuk halus (`fade-in`, `zoom-in`).

### 3. Autentikasi Sisi Klien (`js/auth.js`)
- Menggunakan modul `window.Auth`.
- Enkripsi kata sandi menggunakan API bawaan peramban `crypto.subtle.digest('SHA-256', ...)` yang dikombinasikan dengan *salt*.
- Sesi login disimpan secara cerdas:
  - Jika centang *"Ingat saya"* aktif: disimpan di `localStorage` (bertahan hingga 7 hari).
  - Jika tidak dicentang: disimpan di `sessionStorage` (otomatis berakhir saat tab peramban ditutup).

### 4. Database & State Management (`js/data.js`)
- Menggunakan modul `window.DB`.
- Menyediakan dataset bawaan:
  - Profil mahasiswa & dosen pembimbing akademik.
  - Daftar mata kuliah (SKS, dosen, ruang, hari, jam, rekap nilai, presensi pertemuan).
  - Jadwal tugas dengan tenggat waktu relatif (`today(2)`, `today(-1)`, dll.) agar demo selalu terasa aktual kapan pun dijalankan.
  - Tagihan perkuliahan (BPP, SKS, Praktikum, UTS, UAS).
- Fitur **State Persistence**: Menyimpan status interaksi pengguna (misal tugas yang sudah dikumpulkan, notifikasi terbaca, tagihan yang terbayar) ke `localStorage` spesifik per NIM mahasiswa.

### 5. Router & Interaksi Komponen (`js/app.js`)
- **Single Page Hash Router:** Mendengarkan event `hashchange` pada URL (`#/dashboard`, `#/jadwal`, `#/matakuliah`, `#/tugas`, `#/ujian`, `#/nilai`, `#/keuangan`, `#/profil`).
- **Pola Event Delegation:** Seluruh aksi interaktif menggunakan atribut data HTML:
  - `data-act="..."`: Menangani klik aksi (buka modal, bayar tagihan, filter, kumpul tugas, tutup modal).
  - `data-form="..."`: Menangani pengiriman form secara terpusat tanpa reload halaman.
- **Pewaktuan Real-time (`tick`):** Berjalan tiap 1 detik menggunakan `setInterval` untuk memperbarui semua elemen `[data-clock]`, `[data-date]`, dan `[data-date-short]` dengan zona waktu `Asia/Jakarta` (WIB).

---

## 🛠️ Panduan Kustomisasi

Bila Anda ingin memodifikasi atau mengembangkan LMS ini:

| Bagian yang Ingin Diubah | File Target | Baris / Variabel |
|---|---|---|
| **Warna Identitas Kampus** | [`css/style.css`](file:///c:/Users/Nanda/Desktop/lms-pelita-bangsa/css/style.css) & [`js/tw-config.js`](file:///c:/Users/Nanda/Desktop/lms-pelita-bangsa/js/tw-config.js) | Ubah kode warna HEX pada `--brand` dan palet Tailwind `brand`. |
| **Menu Navigasi Sidebar** | [`js/app.js`](file:///c:/Users/Nanda/Desktop/lms-pelita-bangsa/js/app.js) | Sunting array `NAV = [ ... ]` (tambah/kurangi ID, label, atau ikon). |
| **Bobot Penilaian Akademik** | [`js/app.js`](file:///c:/Users/Nanda/Desktop/lms-pelita-bangsa/js/app.js) | Sunting objek `BOBOT = { tugas: 0.25, kuis: 0.15, uts: 0.25, uas: 0.35 }`. |
| **Target SKS Kelulusan** | [`js/data.js`](file:///c:/Users/Nanda/Desktop/lms-pelita-bangsa/js/data.js) | Ubah nilai konstanta `SKS_LULUS_TARGET = 144`. |
| **Zona Waktu Aplikasi** | [`js/app.js`](file:///c:/Users/Nanda/Desktop/lms-pelita-bangsa/js/app.js) & [`login.html`](file:///c:/Users/Nanda/Desktop/lms-pelita-bangsa/login.html) | Ubah konstanta `TZ = 'Asia/Jakarta'`. |

---

## 📌 Catatan Menuju Produksi

Proyek ini dirancang sebagai purwarupa fungsional (*front-end prototype*). Untuk penerapan di lingkungan produksi nyata:
1. **Ganti Penyimpanan Lokal dengan REST API / GraphQL:** Sambungkan fungsi `Auth` dan objek `DB` ke backend server (Laravel, Node.js, Golang, dsb.) dengan autentikasi berbasis JWT atau HTTP-Only cookie.
2. **Kompilasi CSS:** Ganti Tailwind CDN dengan Tailwind CLI atau PostCSS untuk memangkas ukuran bundle CSS akhir (*tree-shaking*).
3. **Gateway Pembayaran:** Ganti simulasi bayar VA/QRIS di modul Keuangan dengan integrasi payment gateway resmi (Midtrans, Xendit, atau DOKU).
