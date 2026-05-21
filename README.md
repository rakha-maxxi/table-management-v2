<div align="center">
  
  # 🍽️ Mejaaa (V2)
  **Sistem Manajemen Restoran & Reservasi Modern**
  
  [![Vue 3](https://img.shields.io/badge/Vue.js-3.0-4FC08D?style=for-the-badge&logo=vue.js)](https://vuejs.org/)
  [![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)](https://vitejs.dev/)
  [![Pinia](https://img.shields.io/badge/Pinia-F6D365?style=for-the-badge&logo=vue.js&logoColor=black)](https://pinia.vuejs.org/)
  [![Fastify](https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white)](https://fastify.dev/)
  [![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org/)

  <p align="center">
    Platform manajemen operasional restoran lengkap dengan <strong>Command Center</strong> cerdas, <strong>Interactive Floor Plan</strong>, dan integrasi reservasi multi-channel. Dirancang untuk mempercepat alur kerja Host, Pelayan, dan Manajemen.
  </p>
</div>

---

## ✨ Fitur Utama

- 📊 **Command Center Dashboard**  
  Pantau _Key Performance Indicators_ (KPI) operasional secara _real-time_. Dilengkapi dengan _Ops Banner_ cerdas untuk mengingatkan durasi _cleaning_ meja dan status _waiting list_.
- 🗺️ **Interactive Floor Plan**  
  Visualisasi denah restoran secara interaktif. Mendukung fitur _drag-and-drop_ untuk mengatur tata letak meja dengan kemudahan satu klik untuk mengubah status operasional.
- 📅 **Manajemen Reservasi & Waiting List**  
  Lacak reservasi dari berbagai sumber secara terpusat. Dilengkapi fitur _assignment_ meja dan kemampuan _filtering_ serta _global search_.
- 👥 **Sistem Peran (Role-Based Access)**  
  Tampilan UI yang otomatis menyesuaikan konteks peran (_Owner_, _Admin_, _Waiter_, _Cleaner_, hingga _Guest/Customer View_).
- 🌐 **Full-Stack API Integration**  
  Menggunakan backend API modern yang sangat cepat (Fastify) dan penyimpanan database relasional persisten (SQLite), memastikan semua aktivitas dan konfigurasi restoran Anda tersimpan dengan aman dan tersinkronisasi.
- ✨ **Skeleton Loaders & Empty States**  
  Antarmuka pengguna didukung dengan animasi _skeleton loading_ yang mulus serta ilustrasi _empty state_ interaktif saat data tidak tersedia.

## 🛠️ Tech Stack

**Frontend**

- **Framework:** Vue 3 (Composition API) + Vite
- **State Management:** Pinia
- **Routing:** Vue Router
- **Styling:** Vanilla CSS & Tailwind CSS Integration
- **Icons:** Remix Icons (vue-remix-icons)
- **Notifications:** Vue Sonner

**Backend**

- **Framework:** Fastify v5
- **Database:** SQLite (melalui modul `sqlite` & `sqlite3`)
- **API Documentation:** Swagger (`@fastify/swagger` & `@fastify/swagger-ui`)
- **CORS:** Terkonfigurasi untuk mengizinkan akses dari frontend lokal.

## 🚀 Memulai Proyek (Getting Started)

Proyek ini terbagi menjadi dua bagian: **Frontend** dan **Backend**. Keduanya harus dijalankan agar aplikasi berfungsi penuh.

### 1. Prasyarat

Pastikan Anda telah menginstal **Node.js** (versi 18+) di komputer Anda.

### 2. Instalasi & Menjalankan Backend (API)

Buka terminal baru untuk menjalankan backend:

```bash
cd backend
# Instal dependensi backend
npm install
# Jalankan server backend (dengan nodemon)
npm run dev
```

Backend akan berjalan di `http://localhost:3000`. Anda dapat melihat dokumentasi interaktif API di `http://localhost:3000/docs`.

### 3. Instalasi & Menjalankan Frontend (UI)

Buka terminal baru untuk menjalankan frontend:

```bash
# Kembali ke root folder proyek (jika sebelumnya di backend)
cd ..

# Instal dependensi frontend
npm install
# Jalankan server lokal Vite
npm run dev
```

Aplikasi Frontend akan berjalan secara default di `http://localhost:5173`.

## 📂 Struktur Direktori Utama

```text
table-management/
├── backend/            # Aplikasi Backend API
│   ├── routes/         # Endpoint API (bookings, rooms, tables, dll)
│   ├── database.js     # Konfigurasi dan Skema SQLite
│   ├── server.js       # Entry point Fastify Server
│   └── database.sqlite # File Database Lokal
├── src/                # Aplikasi Frontend UI
│   ├── assets/         # CSS Global & Ilustrasi (SVG)
│   ├── components/     # Komponen Vue reusable (Skeletons, dll)
│   ├── router/         # Konfigurasi Vue Router
│   ├── stores/         # Pinia store untuk manajemen state (mainStore)
│   ├── views/          # Halaman aplikasi utama
│   ├── App.vue         # Root layout
│   └── main.js         # Entry point Vue
```

## 🤝 Kontribusi

Sistem ini didesain sedemikian rupa untuk dapat beradaptasi dengan alur kerja operasional _Food & Beverage_ (F&B) modern. Dengan menggunakan arsitektur frontend (Pinia) dan backend (Fastify + SQLite) yang terpisah, memperluas fitur atau mengintegrasikan API pihak ketiga (seperti Payment Gateway) menjadi sangat mudah.

---

<div align="center">
  Dibuat dengan ❤️ untuk merevolusi manajemen operasional restoran.
</div>
