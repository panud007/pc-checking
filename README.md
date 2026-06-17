# 💻 PC Quick Diagnostic Tool (Hardware Checker APP)

[![React Version](https://img.shields.io/badge/react-v18.3.1-blue.svg?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/vite-v5.4.10-purple.svg?logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/tailwindcss-v3.4.19-38bdf8.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## 🔗 Repositori Terkait

* **Repository Backend API (Laravel):** [panud007/pc-checking-api](https://github.com/panud007/pc-checking-api)

---

PC Quick Diagnostic Tool adalah aplikasi berbasis web yang dirancang khusus untuk teknisi komputer dalam melakukan pengetesan komponen perangkat keras (hardware) secara interaktif, cepat, dan terstandarisasi sebelum melakukan penerimaan servis perangkat (*Service Intake*).

Aplikasi ini menggunakan teknologi modern client-side dengan dukungan sinkronisasi basis data Laravel API jarak jauh (*Remote Laravel API Database Sync*) dan fallback penyimpanan lokal otomatis (*LocalStorage Fallback*).

---

## ✨ Fitur Utama (Core Features)

### 1. 🛠️ Modul Diagnosa Interaktif (Interactive Diagnostic Modules)

* **Keyboard Matrix Test**: Menyediakan tata letak visual keyboard ANSI 104-key interaktif. Berguna untuk mendeteksi penekanan tombol bermasalah, merekam tombol mati (*dead keys*), dan menguji *key roll-over* (anti-ghosting).
* **Mouse Switch & Sensor Test**: Menguji tombol klik kiri, klik kanan, klik tengah, perputaran scroll wheel, dan dilengkapi dengan pendeteksi chatter/kontak bouncing tombol (*double-click alert*).
* **Audio & Microphone Test**: Menguji saluran suara stereo (kiri/kanan) dan *real-time microphone loopback* dengan opsi filter peredam bising (*noise suppression*) dan pengatur sensitivitas otomatis (*auto gain control*).
* **Display Calibration & Screen Test**: Menyediakan mode satu warna murni (Solid Colors) dan kisi geometri (Geometry Grid) untuk mencari piksel mati (*dead/stuck pixels*), garis layar, dan backlight bleeding.

### 2. 🔀 Mode Pengetesan Beruntun (Sequential Test Mode)

* Fitur **"Sequential Run"** memandu teknisi melakukan pengetesan terstruktur langkah-demi-langkah mulai dari Keyboard → Mouse → Audio → Layar secara otomatis agar tidak ada bagian tes yang terlewat.

### 3. 📝 Catatan Diagnosa Otomatis (Auto-Generated Reports)

* Aplikasi membaca hasil pengujian secara real-time dan secara otomatis menyusun ringkasan diagnosis teknis (misalnya mendeteksi tombol mati atau masalah layar) untuk dimasukkan ke dalam catatan unit tanpa perlu mengetik manual.

### 4. 📄 Form Penerimaan Servis & Cetak PDF (Service Intake Form & PDF Printing)

* Formulir input data pelanggan lengkap dengan nomor seri unit otomatis, model perangkat, nama teknisi, spesifikasi komputer, dan hasil diagnosa.
* Dukungan penuh untuk cetak langsung ke printer atau ekspor ke **PDF Diagnostic Report Card** resmi sebagai nota penerimaan servis pelanggan.

### 5. 🔄 Penyimpanan Sinkronisasi Ganda (Dual-Sync Database System)

* **Online Mode**: Secara otomatis mengirimkan riwayat diagnosa dan formulir penerimaan servis ke REST API Laravel Database secara real-time.
* **Offline Mode (Fallback)**: Jika koneksi internet terputus atau API server mati, data akan disimpan ke `LocalStorage` browser sehingga pekerjaan teknisi tidak akan hilang dan akan disinkronkan kembali saat terhubung.

---

## 🛠️ Spesifikasi Teknologi (Tech Stack)

Aplikasi dibangun menggunakan kombinasi pustaka (*libraries*) berkinerja tinggi:

* **Framework**: [React.js v18 (Functional Components & Hooks)](https://react.dev/)
* **Bundler**: [Vite v5](https://vitejs.dev/) (cepat, ringan dengan Hot Module Replacement)
* **Styling**: [Tailwind CSS v3](https://tailwindcss.com/) & custom CSS glassmorphism.
* **Icons**: [Lucide React](https://lucide.dev/) (ikon modern yang tajam).
* **State Management**: React Context / Hooks Local State terpadu.

---

## 📂 Struktur Direktori Proyek

```bash
Hardware_Checker_APP/
├── public/                 # Aset publik statis (favicon, logo, dll)
├── src/
│   ├── assets/             # Aset gambar dan styling tambahan
│   ├── components/         # Komponen pengujian hardware modular
│   │   ├── AudioTest.jsx         # Modul pengujian audio stereo & mikrofon
│   │   ├── DisplayTest.jsx       # Modul pengujian layar (Dead pixel/Bleed)
│   │   ├── KeyboardTest.jsx      # Modul pengujian respon tombol keyboard
│   │   ├── MouseTest.jsx         # Modul pengujian switch & chatter mouse
│   │   └── ServiceIntakeForm.jsx # Formulir registrasi unit & spesifikasi
│   ├── App.css             # Custom styling dan tata letak print report
│   ├── App.jsx             # File utama / Dashboard & Logika Telemetri
│   ├── index.css           # Sistem desain dasar Tailwind & utility tokens
│   └── main.jsx            # Entry point React root rendering
├── package.json            # Daftar dependensi & script proyek
├── tailwind.config.js      # Konfigurasi utility framework TailwindCSS
└── vite.config.js          # Konfigurasi build pipeline Vite
```

---

## 🚀 Panduan Instalasi dan Menjalankan Proyek

Ikuti langkah-langkah di bawah ini untuk menjalankan aplikasi ini di komputer lokal Anda:

### 1. Prasyarat (Prerequisites)

Ensure Node.js is installed.

### 2. Instalasi Dependensi

Buka terminal/command prompt di direktori proyek ini, kemudian jalankan:

```bash
npm install
```

### 3. Konfigurasi Variabel Lingkungan (Environment Variables)

Salin konfigurasi backend API dengan membuat file `.env` atau mengonfigurasinya langsung. Secara default, aplikasi mengarah ke endpoint remote produksi:

```env
VITE_API_BASE_URL=http://pc-checking-api-production.up.railway.app:8080/public/api
```

### 4. Menjalankan Server Pengembangan (Local Dev Server)

Jalankan perintah berikut untuk membuka aplikasi dalam mode pengembangan lokal:

```bash
npm run dev
```

Buka browser Anda dan akses alamat yang tertera di terminal (biasanya `http://localhost:5173`).

### 5. Membangun Proyek untuk Produksi (Production Build)

Untuk melakukan kompilasi proyek menjadi file statis yang siap dideploy to server web:

```bash
npm run build
```

Hasil kompilasi akan berada di folder `/dist` yang siap dipindahkan ke web server Anda.

---

## 🔒 Lisensi

Proyek ini dilindungi di bawah lisensi **MIT License**. Anda bebas menggunakan dan memodifikasi proyek ini untuk kebutuhan personal maupun komersil di toko/layanan servis Anda.
