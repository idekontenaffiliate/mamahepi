# Mamahepi — Toko Online (Next.js)

Versi Next.js dari toko `toko-bumbu.html` kamu, dengan:

- **Toko publik** (`/`) — pelanggan pilih produk, checkout, pesanan otomatis tercatat.
- **Login admin** (`/admin/login`) — pemilik toko ("administrator", 1 akun lewat `.env`) *atau* banyak akun "admin" yang daftar sendiri lewat `/admin/register` bisa masuk ke `/admin`.
- **Daftar sebagai admin** (`/admin/register`) — siapa pun bisa mendaftar jadi akun "admin" (nama, email, password, no. telepon, tanggal lahir, jenis kelamin). Begitu daftar, langsung bisa masuk ke dashboard — tidak ada proses verifikasi OTP/SMS terpisah untuk nomor telepon.
- **Password akun admin di-hash pakai bcrypt** (bukan teks polos). Akun admin bisa **ganti password** sendiri lewat menu (wajib masukkan password lama), dan kalau lupa bisa **reset lewat email** — sistem kirim kode OTP 6 digit ke email terdaftar (pakai SMTP yang sama dengan notifikasi pesanan), berlaku 10 menit.
- **Data pesanan & produk disimpan di Google Sheets** — jadi kamu tidak perlu database terpisah, dan pesanan langsung bisa dibuka lewat HP di app Google Sheets.
- **Notifikasi email otomatis** ke pemilik toko setiap ada pesanan baru.
- **Tombol WhatsApp** otomatis tersedia buat pembeli konfirmasi pesanan (bukan API berbayar — cukup link `wa.me` dengan pesan yang sudah terisi otomatis, gratis).

---

## 1. Kenapa bukan WhatsApp API resmi?

WhatsApp API resmi (Meta Business API) butuh verifikasi bisnis dan berbayar per pesan,
jadi kurang cocok untuk toko UMKM kecil. Solusi yang dipakai di sini:

1. **Email otomatis** ke kamu (pemilik toko) setiap ada pesanan baru — gratis, instan, tidak perlu approval apa pun.
2. **Link WhatsApp siap kirim** (`wa.me/...`) yang otomatis muncul untuk pembeli setelah checkout, isi pesannya sudah terisi otomatis (nama, produk, total). Pembeli tinggal tap "Konfirmasi via WhatsApp".

3. **(Opsional) Notifikasi WhatsApp otomatis ke HP kamu** lewat [Fonnte](https://fonnte.com) — WA API pihak ketiga
   Indonesia, pakai nomor WA kamu sendiri lewat scan QR, biaya pay-as-you-go (bukan API resmi Meta, jadi tidak
   perlu verifikasi bisnis). Ini **sudah tersambung** di kode (`lib/whatsapp.js`), tinggal aktifkan:
   1. Daftar di https://fonnte.com, hubungkan device WA kamu, lalu ambil **Token**.
   2. Isi `FONNTE_TOKEN` di environment variable.
   3. Di **Admin → Pengaturan**, isi "Nomor WhatsApp pemilik toko".
   4. Selesai — setiap ada pesanan baru, kamu otomatis dapat WA ke nomor itu, selain email.

   Kalau `FONNTE_TOKEN` tidak diisi, langkah ini otomatis dilewati tanpa mengganggu proses checkout — jadi aman
   dibiarkan kosong kalau kamu cukup dengan notifikasi email dulu.

---

## 2. Setup Google Sheets (sebagai "database")

### a) Buat Google Sheet baru
Buat 1 spreadsheet baru, lalu buat **6 tab (sheet)** dengan nama PERSIS seperti ini:

**Tab `Settings`** — kolom A: `key`, kolom B: `value` (baris 1 = header, isi mulai baris 2, boleh kosong dulu — akan otomatis terisi default saat pertama kali diakses lalu disimpan dari halaman admin).

**Tab `Products`** — baris 1 diisi header ini (urutan harus sama):
```
id | name | category | priceNormal | priceDiskon | sold | emoji | color | image | bundle | active | order
```

**Tab `Coupons`**:
```
code | percent | active
```

**Tab `Orders`**:
```
timestamp | orderId | status | customerName | phone | address | notes | items | subtotal | discount | total | couponCode
```

**Tab `Visits`** (dipakai untuk hitung jumlah pengunjung di Dashboard admin):
```
timestamp | path
```

**Tab `Admins`** (akun admin yang daftar sendiri lewat `/admin/register`):
```
id | name | email | passwordHash | phone | phoneVerified | birthDate | gender | createdAt | active | resetCode | resetCodeExpiry
```
Dua kolom terakhir (`resetCode`, `resetCodeExpiry`) dipakai otomatis oleh fitur **lupa password** (kode OTP 6 digit yang dikirim ke email) — biarkan kosong, terisi sendiri saat dibutuhkan.

Baris 2 dan seterusnya akan otomatis terisi oleh aplikasi. Kamu tidak perlu isi manual (kecuali mau nambah produk langsung dari Sheets). Tab `Visits` juga bersifat opsional — kalau belum kamu buat, toko tetap jalan normal, hanya saja angka pengunjung di Dashboard akan kosong sampai tab-nya dibuat. Tab `Admins` sebaiknya tetap dibuat kalau kamu mau fitur daftar-mandiri admin dipakai; password disimpan sudah di-hash (bukan teks polos), jangan diedit manual dari Sheets.

### b) Buat Service Account di Google Cloud
1. Buka https://console.cloud.google.com/ → buat project baru (atau pakai yang sudah ada).
2. Aktifkan **Google Sheets API** (Enable APIs & Services → cari "Google Sheets API" → Enable).
3. Buka **IAM & Admin → Service Accounts → Create Service Account**. Isi nama bebas (mis. `mamahepi-bot`).
4. Setelah dibuat, buka service account itu → tab **Keys → Add Key → Create new key → JSON**. File JSON akan terdownload.
5. Dari file JSON itu, ambil:
   - `client_email` → isi ke `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → isi ke `GOOGLE_PRIVATE_KEY` (biarkan tanda `\n` apa adanya, jangan diubah jadi baris baru asli)
6. Buka Google Sheet yang kamu buat tadi → klik **Share** → tempel email service account (`...iam.gserviceaccount.com`) → beri akses **Editor**.
7. Ambil ID sheet dari URL: `docs.google.com/spreadsheets/d/`**`INI_ID_NYA`**`/edit` → isi ke `GOOGLE_SHEET_ID`.

---

## 3. Setup email notifikasi (Gmail contoh termudah)

1. Aktifkan 2-Step Verification di akun Gmail kamu.
2. Buka https://myaccount.google.com/apppasswords → buat **App Password** baru.
3. Isi environment variable:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=emailkamu@gmail.com
   SMTP_PASS=App Password 16 digit dari langkah 2 (bukan password Gmail biasa)
   ```
4. Di halaman **Admin → Pengaturan**, isi kolom "Email pemilik toko" dengan alamat email tujuan notifikasi.

---

## 4. Setup login admin

Isi di environment variable:
```
ADMIN_EMAIL=emailkamu@contoh.com
ADMIN_PASSWORD=password_yang_kuat
SESSION_SECRET=string_acak_panjang
```
`SESSION_SECRET` bisa digenerate lewat `openssl rand -hex 32` di terminal, atau situs generator token acak mana saja. Ini dipakai untuk menandatangani sesi login, jangan dibagikan ke siapa pun.

---

## 5. Dashboard admin

Halaman **Admin → Dashboard** (`/admin/dashboard`, ini juga halaman pertama yang muncul setelah login)
menampilkan ringkasan toko:

- **Jumlah transaksi** (total & hari ini), dihitung dari tab `Orders`.
- **Omzet** — total nilai pesanan yang belum dibatalkan, dan yang sudah berstatus "Selesai".
- **Jumlah pengunjung** — dihitung dari tab `Visits` (lihat langkah 2a di atas), tercatat otomatis
  sekali per sesi browser saat seseorang membuka halaman toko.
- **Produk terlaris** — dihitung langsung dari isi pesanan asli (bukan angka yang diketik manual),
  jadi selalu akurat.
- **Tren 14 hari terakhir** — grafik batang transaksi & pengunjung per hari.
- **Status pesanan** (Baru / Diproses / Selesai / Batal) dan daftar pesanan terbaru.

### Ganti foto produk langsung dari admin

Di **Admin → Produk**, setiap produk sekarang punya tombol **"Ganti foto"** untuk unggah foto dari HP
atau komputer (tidak perlu lagi cari-cari URL gambar). Foto otomatis dikecilkan & dikompres di
browser, lalu disimpan langsung sebagai bagian dari data produk di Google Sheets — jadi tidak perlu
layanan hosting gambar tambahan. Kolom URL manual tetap tersedia kalau kamu lebih suka menempel link
gambar dari tempat lain (mis. Google Drive/Imgur).

---

## 6. Menjalankan di komputer sendiri

```bash
npm install
cp .env.example .env.local   # lalu isi semua nilainya
npm run dev
```
Buka http://localhost:3000 untuk toko, dan http://localhost:3000/admin untuk login admin.

---

## 7. Deploy ke Vercel (gratis untuk skala UMKM)

1. Push folder ini ke GitHub.
2. Buka https://vercel.com → **Add New Project** → pilih repo tadi.
3. Di bagian **Environment Variables**, masukkan semua isi `.env.example` dengan nilai aslinya.
4. Klik **Deploy**. Setelah selesai, toko kamu online di `namatoko.vercel.app` (atau domain sendiri yang bisa dihubungkan nanti).

---

## Struktur singkat

```
app/
  page.js                 → halaman toko (publik)
  admin/login/page.js     → login admin
  admin/dashboard/page.js → dashboard ringkasan toko
  admin/orders/page.js    → daftar pesanan
  admin/products/page.js  → kelola produk (termasuk upload foto)
  admin/coupons/page.js   → kelola kupon
  admin/settings/page.js  → pengaturan toko
  api/track/route.js      → catat kunjungan toko (dipakai dashboard)
  api/admin/dashboard/route.js → agregasi data untuk dashboard
  api/...                 → endpoint backend lainnya
lib/
  sheets.js    → semua fungsi baca/tulis ke Google Sheets (termasuk Visits)
  auth.js      → login & sesi admin
  mailer.js    → kirim email notifikasi pesanan baru
  whatsapp.js  → (opsional) kirim WA notifikasi otomatis ke pemilik via Fonnte
proxy.js       → melindungi halaman/API admin dari akses tanpa login
```

## Catatan keamanan
- Ganti `ADMIN_PASSWORD` secara berkala dan jangan pakai password yang gampang ditebak.
- Jangan commit file `.env.local` ke Git (sudah otomatis diabaikan lewat `.gitignore`).
- Harga produk selalu dihitung ulang di server saat checkout (`app/api/orders/route.js`), jadi pembeli tidak bisa mengubah harga lewat browser.
