# Buku Giling: Panduan Pasang (Login Google + Simpan di Google Drive)

Buku Giling adalah aplikasi web yang bisa dipasang di HP seperti aplikasi biasa (PWA).
Setiap orang masuk dengan akun Google masing-masing, dan datanya disimpan di Google Drive
orang itu sendiri sebagai file `buku-giling.json`. Jadi data Anda dan data teman Anda
terpisah, tanpa perlu membuat salinan aplikasi lagi.

Panduan ini ditulis untuk orang yang belum pernah membuat aplikasi. Perkiraan waktu: 30 sampai 45 menit.
Semua langkah gratis.

## Isi folder

| File | Fungsi |
|---|---|
| `index.html`, `style.css`, `app.js` | Aplikasinya |
| `config.js` | Tempat mengisi Client ID Google (satu-satunya file yang Anda ubah) |
| `manifest.json`, `sw.js`, `icons/` | Supaya bisa dipasang di HP dan tetap terbuka saat sinyal lemah |
| `data-awal.json` | Data dari Excel Anda (26 pembelian, 110 penjualan, 9 gaji), untuk diimpor sekali. Stok dan profit per batch dihitung otomatis setelah diimpor |

## Bagian 1. Taruh aplikasi di internet (GitHub Pages)

Google hanya mau menerima login dari alamat web yang resmi, jadi aplikasi harus ada di sebuah alamat.
GitHub Pages memberi alamat gratis.

1. Buka https://github.com dan buat akun (atau masuk jika sudah punya). Ingat **username** Anda.
2. Klik tanda **+** di kanan atas, pilih **New repository**.
3. Isi nama: `buku-giling`. Pilih **Public**. Klik **Create repository**.
4. Di halaman repository yang kosong, klik **uploading an existing file**.
5. Tarik semua file dan folder `icons` dari folder proyek ini ke halaman itu. **Jangan** ikut mengunggah `data-awal.json` jika repository Anda dibagikan ke orang lain; file ini berisi data usaha Anda. Simpan saja di HP atau laptop.
6. Klik **Commit changes**.
7. Buka tab **Settings**, lalu menu **Pages** di kiri.
8. Di bagian **Build and deployment**, pilih **Source: Deploy from a branch**. Pilih branch **main** dan folder **/ (root)**, klik **Save**.
9. Tunggu 1 sampai 3 menit, muat ulang halaman Settings > Pages. Akan muncul alamat:
   `https://USERNAME.github.io/buku-giling/`
   Catat alamat ini. Alamat inilah yang nanti dibagikan ke teman.

## Bagian 2. Siapkan proyek di Google Cloud

1. Buka https://console.cloud.google.com dan masuk dengan akun Google Anda. Setujui syarat jika diminta.
2. Di bagian atas, klik pemilih proyek lalu **New project**. Nama: `Buku Giling`. Klik **Create**, lalu pastikan proyek itu terpilih.
3. Buka menu **APIs & Services** > **Library**. Cari **Google Drive API**, klik, lalu **Enable**.
4. Buka **APIs & Services** > **OAuth consent screen** (di tampilan baru bernama **Google Auth Platform**). Klik **Get started** jika ada.
   - **App name**: Buku Giling
   - **User support email**: email Anda
   - **Audience**: pilih **External**
   - **Contact information**: email Anda
   - Setujui kebijakan, klik **Create**.
5. Buka **Data Access** (atau **Scopes**) > **Add or remove scopes**. Cari dan centang:
   `.../auth/drive.file`
   Simpan. Scope ini hanya mengizinkan aplikasi melihat file yang dibuatnya sendiri. Aplikasi **tidak bisa** membaca file Drive Anda yang lain.
6. Buka **Audience**. Ada dua pilihan:
   - **Disarankan: klik Publish app** (status In production). Karena scope `drive.file` termasuk aman, tidak perlu proses verifikasi dari Google. Semua orang dengan akun Google bisa masuk.
   - Atau biarkan **Testing**, lalu tambahkan email teman Anda di **Test users** (maksimal 100 orang). Orang di luar daftar akan ditolak.
7. Buka **Clients** (atau **Credentials**) > **Create client** (atau **Create credentials** > **OAuth client ID**).
   - **Application type**: **Web application**
   - **Name**: Buku Giling Web
   - **Authorized JavaScript origins** > **Add URI**: `https://USERNAME.github.io`
     (hanya sampai `.github.io`, **tanpa** `/buku-giling` dan **tanpa** garis miring di akhir)
   - Kolom **Authorized redirect URIs** biarkan kosong.
   - Klik **Create**.
8. Salin **Client ID** yang muncul. Bentuknya: `1234567890-abcdefg.apps.googleusercontent.com`.

## Bagian 3. Isi Client ID di aplikasi

1. Di GitHub, buka repository `buku-giling`, klik file `config.js`.
2. Klik ikon pensil (Edit this file).
3. Ganti `GANTI-DENGAN-CLIENT-ID.apps.googleusercontent.com` dengan Client ID Anda. Tanda kutip jangan dihapus.
   ```js
   window.APP_CONFIG={CLIENT_ID:'1234567890-abcdefg.apps.googleusercontent.com'};
   ```
4. Klik **Commit changes**. Tunggu 1 sampai 2 menit sampai GitHub Pages memperbarui halaman.

## Bagian 4. Coba pertama kali

1. Buka `https://USERNAME.github.io/buku-giling/` di Chrome atau Safari.
2. Klik **Masuk dengan Google** dan pilih akun Anda.
3. Jika muncul peringatan "Google hasn't verified this app", klik **Advanced** > **Go to Buku Giling**. Peringatan ini wajar untuk aplikasi buatan sendiri.
4. Pada layar izin, setujui akses ke file yang dibuat aplikasi ini.
5. Aplikasi terbuka dalam keadaan kosong, dan file `buku-giling.json` otomatis dibuat di **My Drive** Anda.

## Bagian 5. Masukkan data dari Excel Anda (sekali saja)

1. Pindahkan `data-awal.json` ke HP atau laptop yang Anda pakai.
2. Di aplikasi, buka tab **Ringkasan**, turun ke bagian **Cadangan**.
3. Ketuk **Impor JSON**, ketuk lagi untuk menyetujui, lalu pilih `data-awal.json`.
4. Cek: **Kas** harus Rp6.026.070 dan **Kas bersih** Rp1.226.070.

Teman Anda **tidak** perlu langkah ini; aplikasinya mulai dari kosong.

## Bagian 6. Pasang di layar utama HP

- **Android (Chrome):** menu titik tiga > **Install app** atau **Add to Home screen**.
- **iPhone (Safari):** tombol Bagikan > **Add to Home Screen**.

## Bagian 7. Membagikan ke teman

Kirim alamat `https://USERNAME.github.io/buku-giling/` saja. Teman Anda masuk dengan Google miliknya sendiri,
dan datanya masuk ke Google Drive-nya. Anda tidak bisa melihat datanya, dan sebaliknya.
Jika Anda memilih mode **Testing** di Bagian 2 langkah 6, tambahkan email teman di Test users lebih dulu.

## Cara kerja data

- File `buku-giling.json` ada di My Drive masing-masing orang. Jangan ganti namanya, karena aplikasi mencari file dengan nama itu. Memindahkan ke folder lain tidak masalah.
- Jika file terhapus, aplikasi membuat file kosong baru. Cek **Tempat sampah** Drive untuk memulihkannya.
- Sesi login Google berlaku sekitar 1 jam. Aplikasi mencoba memperbarui sendiri. Jika gagal, ketuk **Masuk dengan Google** lagi. Perubahan yang belum terkirim tetap aman di HP dan dikirim setelah login.
- Tanpa sinyal, aplikasi tetap terbuka memakai data terakhir di HP. Perubahan dikirim ke Drive saat sinyal kembali.
- Dua perangkat milik akun yang sama boleh dipakai, tetapi jangan mengedit di keduanya pada saat yang sama. Yang menyimpan terakhir yang menang.
- **Ekspor JSON** di tab Ringkasan membuat salinan cadangan yang bisa Anda simpan di tempat lain.

## Stok beras dan cara profit dihitung

Aplikasi mencatat stok beras per batch dan menghitung profit dari modal batch yang beras-nya benar-benar dijual.

- **Satu pembelian gabah = satu batch.** Modal per kg batch = (harga gabah + biaya produksi) / beras jadi.
- **Penjualan dalam karung 10 kg.** Isi jumlah karung dan harga per kg. Aplikasi menghitung kg, total, dan harga per karung. Penjualan yang melebihi stok ditolak.
- **Dari batch mana?** Pilihan "Otomatis" mengambil dari batch tertua dulu (FIFO). Kalau satu batch tidak cukup, sisanya diambil dari batch berikutnya, dan kolom "Dari batch" menampilkan rinciannya. Bisa juga memilih batch tertentu di kolom "Ambil dari".
- **Profit** = penjualan dikurangi modal beras yang diambil dari batch-batch itu. Satu penjualan bisa berasal dari beberapa batch dengan modal berbeda, dan profitnya mengikuti.
- **Tab Stok** menampilkan sisa tiap batch (kg dan karung), nilai stok, dan tombol untuk menampilkan batch yang sudah habis.
- **Susut atau pemakaian.** Beras yang keluar tanpa dijual (susut, rusak, dipakai sendiri, koreksi stok fisik) dicatat di tab Stok. Nilai modalnya dihitung sebagai pengurang laba.
- **Belum digiling.** Pembelian tanpa angka beras jadi belum masuk stok. Isi angkanya nanti lewat tombol **Isi** di tab Pembelian.
- **Laba setelah gaji** = profit penjualan dikurangi susut dan gaji. Stok yang belum terjual bukan kerugian, nilainya ada di Nilai stok.

Catatan untuk data dari Excel: hasil hitungan ini berbeda dari kolom Profit di Excel, karena Excel memakai satu modal per kg rata-rata untuk beberapa batch. Stok juga berbeda dari kolom BERAS di Excel (sekitar 54 kg), karena kolom itu mencatat beras masuk dan keluar yang tidak sama dengan jumlah di tabel pembelian dan penjualan. Hitungan aplikasi memakai angka di kedua tabel tersebut. Jika stok fisik di gudang berbeda, catat selisihnya sebagai susut atau pemakaian.

## Fitur harian (tambahan)

- **Piutang pembeli:** di form penjualan, isi kolom **Dibayar** jika pembeli belum membayar penuh. Kosong berarti lunas. Sisa tagihan muncul di baris penjualan dengan tombol **Bayar** (cicilan) dan **Lunas**. Panel **Piutang pembeli** merangkum sisa tagihan per nama. Kas hanya bertambah sebesar uang yang sudah diterima.
- **Ubah data:** tombol **Ubah** ada di setiap baris pembelian, penjualan, susut, dan gaji. Data lama masuk ke formulir di atas, ubah lalu ketuk **Simpan perubahan**, atau **Batal**. Penjualan yang diubah tetap dicek terhadap stok.
- **Filter bulan:** pilih bulan di panel Bulan (tab Ringkasan, Pembelian, dan Penjualan). Tabel Pembelian dan Penjualan beserta totalnya mengikuti bulan yang dipilih.
- **Ekspor Excel:** tombol **Ekspor ke Excel** membuat file `.xlsx` berisi sheet Ringkasan, Per bulan, Pembelian, Penjualan, Stok, Susut, dan Gaji. Sheet Pembelian dan Penjualan mengikuti filter bulan. File dibuat langsung di HP atau laptop Anda, tanpa internet dan tanpa library tambahan.
- **Laporan bulanan:** tabel di tab Ringkasan berisi gabah, beras, rendemen, modal beli, penjualan, profit, dan piutang per bulan.

## Jika ada masalah

| Gejala | Penyebab dan solusi |
|---|---|
| "CLIENT_ID Google belum diisi" | Bagian 3 belum dikerjakan, atau GitHub belum selesai memperbarui. Tunggu 2 menit lalu muat ulang. |
| `Error 400: origin_mismatch` | Alamat di **Authorized JavaScript origins** salah. Harus persis `https://USERNAME.github.io` (huruf kecil, tanpa path, tanpa `/` di akhir). Perubahan di Google bisa butuh beberapa menit. |
| "Access blocked: app has not completed verification" | Aplikasi masih mode Testing dan email Anda belum ada di Test users. Tambahkan email, atau klik **Publish app** (Bagian 2 langkah 6). |
| Jendela login tidak muncul | Browser memblokir popup. Izinkan popup untuk situs ini lalu ketuk tombol lagi. |
| Data kosong padahal sudah pernah isi | Anda masuk dengan akun Google lain. Keluar lalu masuk dengan akun yang benar. |
| Perubahan tidak muncul setelah mengubah file di GitHub | GitHub Pages butuh 1 sampai 3 menit. Muat ulang keras, atau tutup dan buka lagi aplikasi (Cache disimpan oleh service worker). |
| Ingin ganti Client ID | Ubah `config.js`, commit, tunggu, lalu muat ulang. |

## Catatan keamanan

- Client ID boleh terlihat orang lain; itu bukan rahasia. Yang membatasi akses adalah daftar alamat di **Authorized JavaScript origins**.
- Aplikasi memakai scope `drive.file`: hanya file yang dibuat aplikasi ini yang bisa dibaca.
- Orang bisa mencabut izin kapan saja di https://myaccount.google.com/permissions.
- Data usaha di `data-awal.json` bersifat pribadi. Jangan unggah ke repository publik.

## Catatan dari pembuat

Alur login, pembuatan file, penyimpanan, dan pemulihan setelah muat ulang sudah diuji dengan Google dan Drive
tiruan. Pengujian dengan akun Google sungguhan belum bisa dilakukan, jadi kemungkinan ada penyesuaian kecil
saat Anda mencoba pertama kali, terutama pada tampilan layar izin Google yang sering berubah.
