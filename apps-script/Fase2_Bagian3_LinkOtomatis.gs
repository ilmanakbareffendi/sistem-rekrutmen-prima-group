/**
 * FASE 2, BAGIAN 3: Link Pendaftaran Generik + Dropdown Posisi Otomatis +
 * Jumlah Pendaftar Otomatis
 * Sistem Rekrutmen Terpadu Prima Group
 *
 * File ini ditambahkan ke PROJECT APPS SCRIPT YANG SAMA dengan Code.gs (Layer 1)
 * dan Fase2_BuatFormPendaftaranPelamar.gs (Bagian 1), karena perlu membaca dan
 * menulis ke Master Permintaan yang sama, dan mengedit Form Pendaftaran Pelamar
 * yang sama.
 *
 * ------------------------------------------------------------------
 * PERUBAHAN (21 Sep 2026): sebelumnya tiap baris di Master Permintaan
 * menghasilkan LINK PENDAFTARAN SENDIRI SENDIRI (satu link per Kode
 * Lowongan, lewat prefill). Ini menyulitkan kalau satu RS buka banyak
 * posisi sekaligus dan CEDC cuma mau bagikan SATU link di satu
 * poster/broadcast WA.
 *
 * Sekarang: SATU Form Pendaftaran Pelamar per Unit RS punya SATU link
 * generik (form.getPublishedUrl(), sama untuk semua baris Unit RS itu).
 * Pertanyaan "Kode Lowongan" yang dulu tersembunyi lewat prefill sudah
 * TIDAK DIPAKAI LAGI, diganti pertanyaan dropdown "Posisi yang Dilamar",
 * isinya otomatis disinkronkan dari Master Permintaan setiap kali Status
 * berubah, mencakup SEMUA posisi berstatus "Dipublikasikan" di Unit RS
 * itu. Pelamar sendiri yang memilih posisi yang dilamar dari dropdown
 * itu, formatnya "Posisi (Kode Lowongan)", supaya Jumlah Pendaftar tetap
 * bisa dihitung otomatis per Kode Lowongan seperti sebelumnya.
 *
 * LANGKAH SEBELUM MENJALANKAN APA PUN DI FILE INI (kalau baru pertama kali):
 * 1. Tambahkan satu kolom header baru di sheet Master Permintaan, tulis persis
 *    "Link Pendaftaran" (tanpa tanda kutip), taruh di kolom kosong berikutnya
 *    setelah kolom terakhir yang ada sekarang (Catatan CEDC). Posisi persisnya
 *    tidak masalah, kode ini mencari kolom berdasarkan nama header, bukan posisi.
 * 2. Tempel seluruh isi file ini sebagai file baru di project Apps Script yang
 *    sama, beri nama misalnya Fase2_Bagian3.
 *
 * LANGKAH MIGRASI (jalankan SEKALI SAJA, urut dari atas ke bawah):
 * 1. Jalankan migrasiTambahDropdownPosisi. Ini menghapus pertanyaan "Kode
 *    Lowongan" di KEDUA Form Pendaftaran Pelamar (Royal Prima & Marelan),
 *    lalu menambah pertanyaan dropdown "Posisi yang Dilamar" di posisi yang
 *    sama. Buka Execution log setelah selesai, SALIN dua nilai posisiItemId
 *    yang tercetak (satu untuk Royal Prima, satu untuk Marelan), lalu
 *    TEMPEL ke KONFIGURASI_UNIT_RS di bawah ini, gantikan nilai null.
 * 2. Simpan file ini lagi setelah posisiItemId terisi.
 * 3. Jalankan sinkronSemuaDropdownPosisi sekali, supaya dropdown langsung
 *    terisi sesuai kondisi Master Permintaan yang sudah ada sekarang.
 * 4. Jalankan pasangTriggerOnEdit (aman dijalankan ulang, tidak akan dobel
 *    kalau trigger sudah ada dari sebelumnya).
 * 5. Jalankan pasangTriggerHitungPendaftar (sama, aman dijalankan ulang).
 * 6. Jalankan pasangTriggerRealtimePelamar. Ini memasang trigger di KEDUA
 *    Form Pendaftaran Pelamar, supaya Jumlah Pendaftar (dan Link
 *    Pendaftaran) langsung dihitung ulang begitu ada pelamar baru submit,
 *    tidak perlu nunggu jam-an lagi.
 *
 * Kalau mau langsung uji coba tanpa menunggu, jalankan manual
 * hitungUlangJumlahPendaftar kapan saja, aman dijalankan berkali kali.
 *
 * ------------------------------------------------------------------
 * PERUBAHAN (21 Sep 2026): ditambahkan kolom "Link Rekap Pelamar" di
 * Master Permintaan, isinya link ke Spreadsheet Pelamar (yang tertaut
 * ke Responses Form Pendaftaran Pelamar) per Unit RS, supaya CEDC tidak
 * perlu cari cari manual kalau mau rekap pelamar. Beda dengan Link
 * Pendaftaran, link ini TIDAK bergantung Status, selalu terisi begitu
 * Unit RS pada baris itu diketahui, karena tetap berguna dicari CEDC
 * sendiri sekalipun lowongannya sudah Ditutup.
 *
 * LANGKAH TAMBAHAN kalau mengaktifkan fitur ini di sheet yang SUDAH ADA
 * kolom Link Pendaftaran-nya (jalankan sekali saja):
 * 1. Tambahkan satu kolom header baru di sheet Master Permintaan, tulis
 *    persis "Link Rekap Pelamar" (tanpa tanda kutip). Taruh persis di
 *    sebelah kanan kolom "Link Pendaftaran" supaya berdekatan, tapi
 *    posisi persisnya tidak masalah, kode ini mencari kolom berdasarkan
 *    nama header, bukan posisi.
 * 2. Timpa file Fase2_Bagian3 di project Apps Script dengan isi file ini.
 * 3. Simpan, lalu jalankan hitungUlangJumlahPendaftar sekali secara
 *    manual, supaya baris baris yang sudah ada sekarang langsung ikut
 *    terisi Link Rekap Pelamar-nya, tidak perlu menunggu trigger jam-an.
 *
 * ------------------------------------------------------------------
 * PERUBAHAN (21 Sep 2026): ditambahkan tab "Rekap per Lowongan" di DALAM
 * tiap Spreadsheet Pelamar sendiri (bukan di Master Permintaan), supaya RS
 * bisa lihat daftar pelamar per lowongan tanpa perlu belajar Filter atau
 * Pivot Table. RS tinggal buka Spreadsheet Pelamar, tab ini otomatis ada
 * paling depan, pilih Kode Lowongan dari dropdown di sel B1, tabel di
 * bawahnya otomatis menampilkan cuma pelamar untuk lowongan itu (semua
 * kolom aslinya, bukan cuma jumlah). Tidak pakai rumus SUMIF/QUERY manual
 * di sheet supaya tidak gampang rusak kalau kolom sumbernya berubah,
 * semua logikanya dihitung di server lewat perbaruiRekapPelamar_ dan
 * ditulis sebagai nilai biasa.
 *
 * LANGKAH SEKALI SAJA untuk mengaktifkan:
 * 1. Timpa file Fase2_Bagian3 di project Apps Script dengan isi file ini.
 * 2. Jalankan setupRekapPelamarSemuaUnitRS satu kali. Ini membuat tab
 *    "Rekap per Lowongan" di KEDUA Spreadsheet Pelamar (kalau belum ada)
 *    dan langsung mengisi dropdown serta tabelnya dari data yang sudah
 *    ada sekarang.
 * 3. Jalankan pasangTriggerRekapOnEdit satu kali. Ini yang membuat tabel
 *    hasil langsung berubah begitu RS mengganti pilihan di dropdown,
 *    tidak perlu menunggu jam-an. Trigger submit realtime dan jam-an yang
 *    SUDAH ADA dari sebelumnya otomatis ikut menyegarkan tab ini juga
 *    (dropdown pilihan baru + isi tabel), tidak perlu langkah tambahan
 *    untuk itu.
 *
 * ------------------------------------------------------------------
 * PERUBAHAN (21 Sep 2026): tabel hasil di tab "Rekap per Lowongan"
 * sekarang punya dua kolom tambahan, "Catatan Otomatis Sistem" (penanda
 * data belum lengkap dan/atau duplikat pelamar, dihitung otomatis tanpa
 * AI) dan "Status Lamaran" (dropdown 5 tahap yang RS isi sendiri: Belum
 * Direview, Lolos Administrasi, Dipanggil Interview, Diterima, Ditolak).
 * Isian Status Lamaran RS tersimpan permanen (lihat komentar di awal
 * Bagian D untuk detail teknisnya), aman meski tabelnya ditulis ulang
 * berkali kali oleh trigger lain.
 *
 * TIDAK ADA fungsi setup baru yang perlu dijalankan untuk mengaktifkan
 * ini, cukup:
 * 1. Timpa file Fase2_Bagian3 dengan isi file ini.
 * 2. Jalankan setupRekapPelamarSemuaUnitRS sekali lagi (fungsi yang sama
 *    seperti sebelumnya), supaya kedua tab Rekap langsung menampilkan dua
 *    kolom baru itu tanpa menunggu trigger berikutnya.
 *
 * ------------------------------------------------------------------
 * PERUBAHAN (21 Sep 2026): ditambahkan SKOR PRIORITAS. Tab "Rekap per
 * Lowongan" sekarang punya DUA kolom tambahan lagi di ujung kanan ("Skor
 * Prioritas" dan "Rincian Skor"), dihitung dari Lapis 1 (Alumni +
 * duplikat, dicocokkan lewat Email + Nomor WhatsApp Aktif + NIM, BUKAN
 * KTP/NIK), Lapis 2 (IPK pelamar dibandingkan IPK Minimal lowongan,
 * bobot kecil/dibatasi), dan Lapis 3 (relevansi Program Studi/Fakultas
 * pelamar terhadap kebutuhan lowongan, termasuk jawaban "Lainnya" yang
 * diketik manual, dicocokkan lewat kata kunci). Tahap "Lolos
 * Administrasi" di Status Lamaran sudah dihapus sebelumnya karena
 * fungsinya digantikan Skor Prioritas ini. Lapis 4 (pemindaian kata
 * kunci CV) sengaja TIDAK dibuat. Detail lengkap tiap lapis dan bobotnya
 * ada di blok komentar tepat sebelum fungsi hitungSkorPrioritas_.
 *
 * SYARAT SEBELUM Skor Prioritas ini bisa jalan dengan benar:
 *   - Code.gs (Layer 1) sudah menjalankan migrasiTambahKolomSkorPrioritas
 *     satu kali, supaya Master Permintaan punya kolom "IPK Minimal",
 *     "Program Studi Relevan", "Fakultas Relevan".
 *   - Form Pendaftaran Pelamar sudah direstrukturisasi lewat
 *     migrasiRestrukturFormPelamar (lihat komentar di atas fungsi itu),
 *     supaya Form punya pertanyaan "Program Studi", "Fakultas" (dipindah
 *     ke bagian universal), dan "IPK" yang ditanyakan ke SEMUA pelamar.
 *
 * LANGKAH SEKALI SAJA untuk mengaktifkan (urut dari atas ke bawah):
 * 1. Timpa file Fase2_Bagian3 dengan isi file ini.
 * 2. Jalankan migrasiRestrukturFormPelamar satu kali (aman diulang,
 *    idempotent, lihat catatan di atas fungsi itu).
 * 3. Jalankan setupRekapPelamarSemuaUnitRS sekali lagi, supaya kedua tab
 *    Rekap langsung menghitung ulang Skor Prioritas untuk data yang
 *    sudah ada sekarang, tanpa menunggu trigger berikutnya.
 *
 * ------------------------------------------------------------------
 * PERUBAHAN (22 Sep 2026): kolom "Skor Prioritas" dan "Status Lamaran"
 * dipindah dari ujung kanan tabel ke PALING DEPAN (sebelum Timestamp),
 * lalu kolom sampai "Nama Lengkap" di-freeze (setFrozenColumns), supaya
 * keduanya tetap kelihatan berapa pun jauh RS scroll ke kanan untuk
 * lihat jawaban Form lainnya. "Catatan Otomatis Sistem" dan "Rincian
 * Skor" (teks penjelasan panjang) tetap di ujung kanan.
 *
 * Sel "Skor Prioritas" juga sekarang diberi warna latar otomatis (hijau
 * skor kuat >= 15, kuning netral 0-14, merah skor negatif < 0), sekadar
 * sinyal bantu sekilas pandang. SENGAJA TIDAK dibuat kolom "Rekomendasi
 * Lanjut/Ditolak" yang tegas, supaya RS tetap menimbang sendiri lewat
 * Rincian Skor dan Status Lamaran, bukan mengikuti label otomatis begitu
 * saja (skornya sendiri berasal dari data self-reported/pencocokan kata
 * kunci yang tidak sempurna).
 *
 * TIDAK ADA fungsi setup baru yang perlu dijalankan untuk mengaktifkan
 * ini, cukup timpa file ini lagi, lalu jalankan setupRekapPelamarSemuaUnitRS
 * sekali supaya tab Rekap yang sudah ada langsung ikut tertata ulang.
 *
 * ------------------------------------------------------------------
 * PERUBAHAN (22 Sep 2026): penyeimbangan ulang bobot Skor Prioritas.
 * Bonus Alumni diturunkan dari +10 jadi +5 (supaya cuma jadi pemberat
 * tipis kasus seri, bukan faktor yang bisa mengalahkan kualifikasi
 * pelamar non-alumni yang lebih relevan/IPK lebih baik). Penalti
 * Duplikat diturunkan dari -20 jadi -10 (disamakan dengan sinyal negatif
 * Lapis 2/3 lain, sebelumnya terlalu dominan dibanding skor maksimum
 * yang cuma 25-30). Skor maksimum sekarang +25, minimum -30. Detail
 * lengkap dan alasannya ada di blok komentar sebelum hitungSkorPrioritas_.
 * Tidak ada langkah setup tambahan, cukup timpa file ini.
 *
 * ------------------------------------------------------------------
 * PERUBAHAN (22 Sep 2026): tata letak kolom tabel hasil dirapikan lagi.
 * Freeze kolom sekarang cuma sampai 3 kolom paling esensial (Skor
 * Prioritas, Status Lamaran, Nama Lengkap), sebelumnya ikut membekukan
 * Timestamp dan Email Address yang dianggap tidak krusial. Timestamp
 * SENGAJA dipindah dari depan ke paling UJUNG tabel (sejajar Rincian
 * Skor), karena urutan baris sudah ditentukan oleh sort Skor Prioritas,
 * bukan lagi kronologis, jadi Timestamp tidak perlu selalu terlihat.
 * Tidak ada langkah setup tambahan, cukup timpa file ini.
 *
 * ------------------------------------------------------------------
 * PERBAIKAN (22 Sep 2026): setupRekapPelamarSemuaUnitRS sempat gagal
 * dengan error "violates the data validation rules... Please enter one
 * of the following values: Belum Direview, ...". Sebabnya, tabel hasil
 * dulu cuma dibersihkan lewat clearContent() sebelum ditulis ulang,
 * padahal itu TIDAK menghapus validasi dropdown Status Lamaran yang
 * masih menempel di posisi kolom LAMA (dari sebelum kolomnya digeser
 * beberapa kali). Sel yang dulu kolom Status Lamaran tapi sekarang jadi
 * kolom lain (misalnya Catatan Otomatis Sistem) menolak ditulisi teks
 * bebas karena masih terkunci validasi dropdown lama. Sudah diperbaiki
 * dengan menambah clearDataValidations() di langkah pembersihan yang
 * sama. Tidak ada langkah setup tambahan, cukup timpa file ini lagi,
 * lalu jalankan setupRekapPelamarSemuaUnitRS() sekali lagi untuk
 * membersihkan sisa validasi lama itu.
 *
 * ------------------------------------------------------------------
 * PERBAIKAN + FITUR BARU (22 Sep 2026), tiga perubahan sekaligus:
 *
 * 1. PERBAIKAN: kolom Skor Prioritas sempat tampil sebagai tanggal
 *    ("12/30/1899", "12/20/1899") bukan angka. Penyebabnya satu keluarga
 *    dengan bug validasi di atas: clearContent() dan clearDataValidations()
 *    TIDAK ikut menghapus FORMAT ANGKA lama. Kolom paling depan (sekarang
 *    Skor Prioritas) pernah jadi tempat Timestamp (format Date) di posisi
 *    kolom sebelumnya, format itu nempel terus sampai sekarang. Sudah
 *    diperbaiki dengan menambah clearFormat() di langkah pembersihan yang
 *    sama, plus mengunci eksplisit setNumberFormat('0') di kolom Skor
 *    Prioritas setelah ditulis, sebagai lapis kedua jaga jaga.
 *
 * 2. FITUR BARU: kolom "Unggah CV (pdf)" sekarang ditulis sebagai tautan
 *    biru bisa-diklik (RichTextValue + setLinkUrl), labelnya "Lihat CV"
 *    (satu file) atau "CV 1 | CV 2" dst (kalau pelamar upload lebih dari
 *    satu file). CATATAN JUJUR: tampilan "smart chip" bulat khas Google
 *    Sheets adalah fitur render bawaan yang TIDAK BISA dipaksa lewat Apps
 *    Script, jadi ini bukan chip bulat persis, tapi tautan yang perilakunya
 *    konsisten (selalu bisa diklik, tetap memicu pratinjau hover Drive).
 *
 * 3. FITUR BARU: fungsi bagikanFolderCVKeRS() (BARU, belum pernah ada
 *    sebelumnya). Ini memperbaiki masalah RS tidak bisa buka PDF CV walau
 *    sudah punya Viewer di Spreadsheet Pelamar, karena file hasil File Upload
 *    Form disimpan di folder Drive milik akun pembuat Form (CEDC), folder
 *    itu belum pernah dibagikan ke RS, cuma Spreadsheet-nya saja. Fungsi
 *    ini membagikan folder respons file itu (bukan file satu satu) sebagai
 *    Viewer ke email PIC RS (emailPicRS di KONFIGURASI_UNIT_RS), sekali
 *    share folder otomatis mencakup file yang sudah ada MAUPUN yang nanti
 *    baru masuk (submission berikutnya).
 *
 * LANGKAH SETELAH MENIMPA FILE INI:
 * a. Jalankan setupRekapPelamarSemuaUnitRS() sekali untuk langsung
 *    menerapkan perbaikan #1 dan #2 (format angka + tautan CV) ke tabel
 *    yang sudah ada, tidak perlu menunggu trigger jam-an/submit.
 * b. Fitur #3 (share folder CV ke RS) SEKARANG OTOMATIS, ikut terpasang
 *    di trigger onSubmitPelamarBaru yang sudah ada (lihat catatan di
 *    fungsi itu di bawah), TIDAK PERLU dijalankan manual lagi. Kalau mau
 *    langsung berlaku untuk data yang SUDAH ADA sekarang tanpa menunggu
 *    pelamar baru, boleh jalankan bagikanFolderCVKeRS() manual sekali,
 *    tapi ini opsional saja.
 *
 * PERUBAHAN LAGI setelah dites langsung: bagikanFolderCVSatuUnit_ (inti
 * fitur #3) sekarang JUGA dipanggil otomatis dari onSubmitPelamarBaru
 * (trigger yang sudah lama terpasang tiap ada pelamar baru submit, lihat
 * fungsi itu di bawah), bukan cuma bisa lewat bagikanFolderCVKeRS()
 * manual. Jadi share folder CV ke RS jalan sendiri begitu ada pelamar
 * baru, termasuk untuk Unit RS yang sekarang masih kosong sama sekali
 * (baru bisa ketemu folder-nya begitu ada CV pertama masuk). Menjalankan
 * bagikanFolderCVKeRS() manual TETAP BOLEH kapan saja (misalnya mau
 * langsung cek sekarang tanpa menunggu pelamar baru beneran submit),
 * tapi sudah TIDAK WAJIB, semuanya jalan sendiri lewat trigger yang sama
 * dengan penghitung Jumlah Pendaftar.
 *
 * BUG TAMBAHAN YANG KETAHUAN & IKUT DIPERBAIKI saat menguji poin 3 di
 * atas (dites langsung, bukan cuma dibaca kodenya): pencarian kolom
 * "Unggah CV (pdf)" di sheet Pelamar ternyata GAGAL terus dari awal,
 * karena judul kolom itu satu satunya item yang dibuat MANUAL lewat UI
 * Form (Google melarang File Upload dibuat lewat script), dan ternyata
 * judul aslinya kesisipan spasi ekstra di depan/belakang ("  Unggah CV
 * (pdf)  "), tidak persis sama dengan string yang dicari kode
 * ('Unggah CV (pdf)'). Akibatnya sejak awal: (a) status "CV" di Catatan
 * Otomatis Sistem tidak pernah ikut ditandai walau memang belum diisi,
 * (b) tautan CV di poin #2 di atas diam diam tidak akan pernah terpasang.
 * Sudah diperbaiki dengan pencarian kolom CV yang trim + lowercase dulu
 * (cariIndexKolomCV_, cariSheetDenganKolomCV_), jadi tetap ketemu berapa
 * pun variasi spasi/kapitalnya. Tidak perlu langkah tambahan, sudah ikut
 * kepakai begitu setupRekapPelamarSemuaUnitRS() dijalankan lagi.
 *
 * ------------------------------------------------------------------
 * FITUR BARU (22 Sep 2026): bagikanEditorFormKeRS(). Sesuai prinsip
 * desain awal proyek ini (CEDC penyedia infrastruktur, bukan pemilik
 * proses rekrutmen RS), RS seharusnya punya akses edit SUNGGUHAN ke Form
 * Pendaftaran Pelamar milik Unit RS mereka sendiri (supaya bisa menambah
 * pertanyaan khusus di section "Pertanyaan Tambahan dari RS"), bukan cuma
 * akses lihat lewat CEDC. Fungsi ini membagikan Form itu (lewat
 * DriveApp.addEditor, karena Form juga file Drive) ke emailPicRS di
 * KONFIGURASI_UNIT_RS. Beda dengan folder CV, ini TIDAK perlu menunggu
 * ada pelamar, formId sudah pasti ada sejak awal, jadi cukup dijalankan
 * SEKALI SAJA lewat dropdown Run, kapan pun. Field inti (Nama Lengkap,
 * Posisi yang Dilamar, dst) tetap aman dari perubahan RS karena semua
 * pembacaan jawaban Form di file ini pakai Item ID/nama header, bukan
 * posisi tetap.
 *
 * LANGKAH: setelah menimpa file ini, jalankan bagikanEditorFormKeRS()
 * SEKALI lewat dropdown Run.
 */

var NAMA_SHEET_MASTER_PERMINTAAN = 'Master Permintaan';
// Spreadsheet "Master Data Permintaan - RS Prima Group". Dipakai lewat openById,
// bukan getActiveSpreadsheet, supaya kode ini tetap benar dipanggil dari project
// Apps Script mana pun, termasuk yang terikat ke Form, bukan ke Spreadsheet ini.
var ID_SPREADSHEET_MASTER_PERMINTAAN = '1yGRGj-SmhJelHwVoNXSIUuNTXVWIU0JqMAcm1iKVT1Y';

var JUDUL_ITEM_POSISI = 'Posisi yang Dilamar';
var PLACEHOLDER_BELUM_ADA_POSISI = '(Belum ada posisi dibuka saat ini, hubungi CEDC)';

// ===== Judul item baru (restrukturisasi 21 Sep 2026, lihat migrasiRestrukturFormPelamar) =====
var JUDUL_ITEM_PRODI = 'Program Studi';
var JUDUL_ITEM_PRODI_LAINNYA = 'Program Studi Lainnya (tuliskan manual, isi HANYA jika pilih "Program Studi Saya Tidak Ada di Daftar Ini (Lainnya)" di atas)';
var JUDUL_ITEM_FAKULTAS = 'Fakultas';
var JUDUL_ITEM_FAKULTAS_LAINNYA = 'Fakultas Lainnya (tuliskan manual, isi HANYA jika pilih "Fakultas Saya Tidak Ada di Daftar Ini (Lainnya)" di atas)';
var JUDUL_ITEM_IPK = 'IPK';
var NILAI_PRODI_LAINNYA = 'Program Studi Saya Tidak Ada di Daftar Ini (Lainnya)';
var NILAI_FAKULTAS_LAINNYA = 'Fakultas Saya Tidak Ada di Daftar Ini (Lainnya)';

/**
 * Katalog Program Studi UNPRI T.A. 2026/2027 (52 program studi, 9 fakultas).
 * Rujukan TUNGGAL, dipakai untuk: (1) pilihan dropdown "Program Studi" di
 * Form Pendaftaran Pelamar (lewat migrasiRestrukturFormPelamar), (2)
 * pencocokan relevansi Lapis 3 Skor Prioritas (cocokDenganDaftar_).
 * HARUS SAMA dengan KATALOG_PRODI di Index.html (Layer 1, Web App RS).
 * Kalau katalog UNPRI berubah lagi nanti, perbarui KEDUA tempat ini
 * sekaligus, jangan cuma salah satu.
 */
var KATALOG_PRODI_FAKULTAS = [
  {prodi:'Sarjana Pendidikan Dokter',fakultas:'Fakultas Kedokteran dan Kedokteran Gigi'},
  {prodi:'Sarjana Pendidikan Dokter Gigi',fakultas:'Fakultas Kedokteran dan Kedokteran Gigi'},
  {prodi:'Profesi Dokter',fakultas:'Fakultas Kedokteran dan Kedokteran Gigi'},
  {prodi:'Profesi Dokter Gigi',fakultas:'Fakultas Kedokteran dan Kedokteran Gigi'},
  {prodi:'Magister Sains Biomedis',fakultas:'Fakultas Kedokteran dan Kedokteran Gigi'},
  {prodi:'Magister Kedokteran Klinis',fakultas:'Fakultas Kedokteran dan Kedokteran Gigi'},
  {prodi:'Magister Kedokteran Tropis',fakultas:'Fakultas Kedokteran dan Kedokteran Gigi'},
  {prodi:'Magister Kesehatan Masyarakat',fakultas:'Fakultas Kedokteran dan Kedokteran Gigi'},
  {prodi:'Magister Ilmu Kedokteran Gigi',fakultas:'Fakultas Kedokteran dan Kedokteran Gigi'},
  {prodi:'Doktor Ilmu Kedokteran',fakultas:'Fakultas Kedokteran dan Kedokteran Gigi'},
  {prodi:'Spesialis Kedokteran Keluarga Layanan Primer',fakultas:'Fakultas Kedokteran dan Kedokteran Gigi'},
  {prodi:'Spesialis Radiologi',fakultas:'Fakultas Kedokteran dan Kedokteran Gigi'},
  {prodi:'Spesialis Ilmu Kesehatan Mata',fakultas:'Fakultas Kedokteran dan Kedokteran Gigi'},
  {prodi:'Spesialis Jantung dan Pembuluh Darah',fakultas:'Fakultas Kedokteran dan Kedokteran Gigi'},
  {prodi:'Spesialis Obstetri dan Ginekologi',fakultas:'Fakultas Kedokteran dan Kedokteran Gigi'},
  {prodi:'Spesialis Anestesiologi dan Terapi Intensif',fakultas:'Fakultas Kedokteran dan Kedokteran Gigi'},
  {prodi:'Spesialis Penyakit Dalam',fakultas:'Fakultas Kedokteran dan Kedokteran Gigi'},
  {prodi:'Spesialis Bedah',fakultas:'Fakultas Kedokteran dan Kedokteran Gigi'},
  {prodi:'Sarjana Farmasi Klinis',fakultas:'Fakultas Ilmu Kesehatan'},
  {prodi:'Sarjana Kesehatan Masyarakat',fakultas:'Fakultas Ilmu Kesehatan'},
  {prodi:'Sarjana Fisioterapi',fakultas:'Fakultas Ilmu Kesehatan'},
  {prodi:'Pendidikan Profesi Apoteker',fakultas:'Fakultas Ilmu Kesehatan'},
  {prodi:'Sarjana Ilmu Keperawatan',fakultas:'Fakultas Keperawatan dan Kebidanan'},
  {prodi:'Sarjana Kebidanan',fakultas:'Fakultas Keperawatan dan Kebidanan'},
  {prodi:'Profesi Ners',fakultas:'Fakultas Keperawatan dan Kebidanan'},
  {prodi:'Pendidikan Profesi Bidan',fakultas:'Fakultas Keperawatan dan Kebidanan'},
  {prodi:'Magister Keperawatan',fakultas:'Fakultas Keperawatan dan Kebidanan'},
  {prodi:'Sarjana Ilmu Hukum',fakultas:'Fakultas Hukum'},
  {prodi:'Magister Hukum',fakultas:'Fakultas Hukum'},
  {prodi:'Magister Kenotariatan',fakultas:'Fakultas Hukum'},
  {prodi:'Doktor Hukum',fakultas:'Fakultas Hukum'},
  {prodi:'Sarjana Akuntansi',fakultas:'Fakultas Ekonomi dan Bisnis'},
  {prodi:'Sarjana Manajemen',fakultas:'Fakultas Ekonomi dan Bisnis'},
  {prodi:'Magister Akuntansi',fakultas:'Fakultas Ekonomi dan Bisnis'},
  {prodi:'Magister Manajemen',fakultas:'Fakultas Ekonomi dan Bisnis'},
  {prodi:'Doktor Manajemen',fakultas:'Fakultas Ekonomi dan Bisnis'},
  {prodi:'Sarjana Pendidikan Bahasa dan Sastra Indonesia',fakultas:'Fakultas Bahasa dan Komunikasi'},
  {prodi:'Sarjana Pendidikan Bahasa Inggris',fakultas:'Fakultas Bahasa dan Komunikasi'},
  {prodi:'Sarjana Desain Komunikasi Visual',fakultas:'Fakultas Bahasa dan Komunikasi'},
  {prodi:'Sarjana Terapan Bahasa Mandarin untuk Komunikasi Bisnis dan Profesional',fakultas:'Fakultas Bahasa dan Komunikasi'},
  {prodi:'Magister Pendidikan Bahasa Indonesia',fakultas:'Fakultas Bahasa dan Komunikasi'},
  {prodi:'Sarjana Agroteknologi',fakultas:'Fakultas Pertanian'},
  {prodi:'Sarjana Agribisnis',fakultas:'Fakultas Pertanian'},
  {prodi:'Sarjana Psikologi',fakultas:'Fakultas Psikologi'},
  {prodi:'Pendidikan Profesi Psikolog',fakultas:'Fakultas Psikologi'},
  {prodi:'Sarjana Teknik Industri',fakultas:'Fakultas Sains dan Teknologi'},
  {prodi:'Sarjana Sistem Informasi',fakultas:'Fakultas Sains dan Teknologi'},
  {prodi:'Sarjana Teknik Elektro',fakultas:'Fakultas Sains dan Teknologi'},
  {prodi:'Sarjana Teknik Informatika',fakultas:'Fakultas Sains dan Teknologi'},
  {prodi:'Sarjana Arsitektur',fakultas:'Fakultas Sains dan Teknologi'},
  {prodi:'Sarjana Rekayasa Sipil',fakultas:'Fakultas Sains dan Teknologi'},
  {prodi:'Magister Ilmu Komputer',fakultas:'Fakultas Sains dan Teknologi'}
];

// ===== Konfigurasi per Unit RS, diisi dari hasil Bagian 1 =====
var KONFIGURASI_UNIT_RS = {
  royalPrima: {
    formId: '1sJqiTXcBXHbX3M3FoOldlqhOLhBVVvcopNPzg-RXFsk',
    spreadsheetPelamarId: '1TyUlYv07-Pg74c6yegvPAyfc9mlS7K1b_bWPnny5Ir4',
    kodeLowonganItemId: 2079246384, // sudah tidak dipakai lagi setelah migrasi, dibiarkan untuk arsip
    alumniItemId: 1582053876,
    fakultasItemId: 2060429100,
    nimItemId: 33664851,
    posisiItemId: null, // ISI SETELAH menjalankan migrasiTambahDropdownPosisi
    prodiItemId: null, // ISI SETELAH menjalankan migrasiRestrukturFormPelamar (opsional, arsip saja)
    ipkItemId: null, // ISI SETELAH menjalankan migrasiRestrukturFormPelamar (opsional, arsip saja)
    emailPicRS: 'sdm@royalprima.com' // dipakai bagikanFolderCVKeRS(), sama dengan email yang sudah Editor di Form
  },
  royalPrimaMarelan: {
    formId: '11_b0anwlRCJ7M623uTMf9lFiLDx0nlxHfFjEovATNu4',
    spreadsheetPelamarId: '1d058_txHn3Zt0hSm0E1P_7xWVmoa_dnXKR1jQh321Sc',
    kodeLowonganItemId: 1757947033, // sudah tidak dipakai lagi setelah migrasi, dibiarkan untuk arsip
    alumniItemId: 925840698,
    fakultasItemId: 2063448567,
    nimItemId: 1025014989,
    posisiItemId: null, // ISI SETELAH menjalankan migrasiTambahDropdownPosisi
    prodiItemId: null, // ISI SETELAH menjalankan migrasiRestrukturFormPelamar (opsional, arsip saja)
    ipkItemId: null, // ISI SETELAH menjalankan migrasiRestrukturFormPelamar (opsional, arsip saja)
    emailPicRS: 'azzahrasufina@gmail.com' // dipakai bagikanFolderCVKeRS(), sama dengan email yang sudah Editor di Form
  }
};

// Sama persis logikanya dengan prefixUnit di Code.gs (Layer 1): mengandung kata
// "Marelan" berarti Royal Prima Marelan, selain itu dianggap Royal Prima.
function getKonfigurasiUnitRS(unitRS) {
  var adalahMarelan = String(unitRS).indexOf('Marelan') !== -1;
  return adalahMarelan ? KONFIGURASI_UNIT_RS.royalPrimaMarelan : KONFIGURASI_UNIT_RS.royalPrima;
}

// ===== Migrasi satu kali: ganti "Kode Lowongan" dengan dropdown "Posisi yang Dilamar" =====

function migrasiTambahDropdownPosisi() {
  migrasiSatuForm_(KONFIGURASI_UNIT_RS.royalPrima, 'Royal Prima');
  migrasiSatuForm_(KONFIGURASI_UNIT_RS.royalPrimaMarelan, 'Royal Prima Marelan');
}

function migrasiSatuForm_(konfig, namaUnitRS) {
  var form = FormApp.openById(konfig.formId);

  var posisiLamaKodeLowongan = null;
  try {
    var itemKodeLama = form.getItemById(konfig.kodeLowonganItemId);
    posisiLamaKodeLowongan = itemKodeLama.getIndex();
    form.deleteItem(itemKodeLama);
    Logger.log(namaUnitRS + ': item "Kode Lowongan" lama berhasil dihapus.');
  } catch (err) {
    Logger.log(namaUnitRS + ': item "Kode Lowongan" lama tidak ditemukan/sudah terhapus sebelumnya (' + err.message + '), lanjut tanpa menghapus.');
  }

  var itemPosisi = form.addListItem();
  itemPosisi.setTitle(JUDUL_ITEM_POSISI).setRequired(true);
  itemPosisi.setChoiceValues([PLACEHOLDER_BELUM_ADA_POSISI]);

  if (posisiLamaKodeLowongan !== null) {
    form.moveItem(itemPosisi.getIndex(), posisiLamaKodeLowongan);
  }

  form.setDescription(
    'Form pendaftaran pelamar untuk lowongan di ' + namaUnitRS + '. ' +
    'Pilih posisi yang Anda lamar dari daftar yang tersedia. ' +
    'Silakan login dengan akun Google untuk mengisi form ini.'
  );

  Logger.log(namaUnitRS + ': dropdown "' + JUDUL_ITEM_POSISI + '" berhasil ditambahkan. posisiItemId = ' + itemPosisi.getId() + '  <-- SALIN nilai ini ke KONFIGURASI_UNIT_RS di atas.');
}

/**
 * MIGRASI SATU KALI (jalankan SEKALI SAJA, lewat dropdown Run):
 * merestrukturisasi Form Pendaftaran Pelamar supaya Program Studi,
 * Fakultas, dan IPK ditanyakan ke SEMUA pelamar (alumni maupun bukan),
 * bukan cuma di bagian "Data Alumni" seperti sebelumnya. Dibutuhkan
 * supaya Skor Prioritas (Lapis 2 IPK, Lapis 3 relevansi Program
 * Studi/Fakultas, lihat Bagian D) bisa dihitung untuk SEMUA pelamar,
 * bukan cuma alumni.
 *
 * PERUBAHAN STRUKTUR pada tiap Form:
 *   - Item baru "Program Studi" (dropdown, wajib): 52 program studi UNPRI
 *     dari KATALOG_PRODI_FAKULTAS + satu pilihan terakhir "Program Studi
 *     Saya Tidak Ada di Daftar Ini (Lainnya)".
 *   - Item baru "Program Studi Lainnya" (teks bebas, TIDAK wajib): diisi
 *     manual HANYA kalau pelamar pilih "Lainnya" di atas. Tab Rekap per
 *     Lowongan akan menandai lewat Catatan Otomatis Sistem kalau pelamar
 *     pilih Lainnya tapi lupa mengisi teks ini.
 *   - Item "Fakultas" yang SUDAH ADA (dari Bagian 1) dipindah ke bagian
 *     universal ini (sebelumnya cuma muncul kalau Alumni = Ya), dan
 *     ditambah satu pilihan "Fakultas Saya Tidak Ada di Daftar Ini
 *     (Lainnya)".
 *   - Item baru "Fakultas Lainnya" (teks bebas, TIDAK wajib), pola sama
 *     dengan Program Studi Lainnya.
 *   - Item baru "IPK" (validasi angka 0 sampai 4). TIDAK diwajibkan di
 *     level Form, karena Google Forms tidak bisa mewajibkan sebuah
 *     pertanyaan cuma untuk sebagian pengisi (tergantung jawaban Alumni)
 *     selama pertanyaan itu sendiri ada di luar percabangan. Sebagai
 *     gantinya, Catatan Otomatis Sistem di tab Rekap menandai kalau
 *     Alumni = Ya tapi IPK kosong, supaya tetap kelihatan oleh RS/CEDC.
 *   - Section "Data Alumni UNPRI" (setelah pertanyaan Alumni) sekarang
 *     cuma berisi NIM saja, karena Fakultas sudah pindah ke atas.
 *
 * CARA KERJA PEMINDAHAN ITEM: Google Forms tidak punya cara memindahkan
 * banyak item sekaligus. Migrasi ini membuat semua item baru dulu
 * (otomatis nempel di paling akhir Form oleh Apps Script), baru
 * dipindah SATU PER SATU lewat form.moveItem ke posisi tepat sebelum
 * pertanyaan "Apakah Anda Alumni UNPRI?", dengan index tujuan dibaca
 * ULANG di setiap langkah (alumniItem.getIndex()) supaya tetap akurat
 * walau posisi alumniItem sendiri ikut bergeser tiap ada 1 item baru
 * disisipkan di depannya.
 *
 * Idempotent: kalau item berjudul "Program Studi" sudah ada di Form,
 * migrasi ini dilewati (dianggap sudah pernah dijalankan sebelumnya),
 * aman dijalankan ulang tanpa risiko menyisipkan item dobel.
 */
function migrasiRestrukturFormPelamar() {
  migrasiRestrukturSatuFormPelamar_(KONFIGURASI_UNIT_RS.royalPrima, 'Royal Prima');
  migrasiRestrukturSatuFormPelamar_(KONFIGURASI_UNIT_RS.royalPrimaMarelan, 'Royal Prima Marelan');
}

function migrasiRestrukturSatuFormPelamar_(konfig, namaUnitRS) {
  var form = FormApp.openById(konfig.formId);

  var sudahMigrasi = form.getItems().some(function (item) {
    return item.getTitle() === JUDUL_ITEM_PRODI;
  });
  if (sudahMigrasi) {
    Logger.log(namaUnitRS + ': item "' + JUDUL_ITEM_PRODI + '" sudah ada, migrasi ini dilewati (sudah pernah dijalankan sebelumnya).');
    return;
  }

  var alumniItem = form.getItemById(konfig.alumniItemId);
  if (!alumniItem) {
    throw new Error(namaUnitRS + ': item Alumni (alumniItemId) tidak ditemukan lewat ID di KONFIGURASI_UNIT_RS, migrasi dibatalkan supaya tidak salah taruh posisi item baru.');
  }

  // ---- 1. Item baru "Program Studi" (otomatis nempel di akhir Form dulu) ----
  var namaProdiSaja = KATALOG_PRODI_FAKULTAS.map(function (p) { return p.prodi; });
  var itemProdi = form.addListItem();
  itemProdi.setTitle(JUDUL_ITEM_PRODI).setRequired(true);
  itemProdi.setChoiceValues(namaProdiSaja.concat([NILAI_PRODI_LAINNYA]));

  var itemProdiLainnya = form.addTextItem();
  itemProdiLainnya.setTitle(JUDUL_ITEM_PRODI_LAINNYA).setRequired(false);

  // ---- 2. Item "Fakultas" SUDAH ADA sejak Bagian 1, tambah pilihan Lainnya ----
  var fakultasItem = form.getItemById(konfig.fakultasItemId).asListItem();
  var pilihanFakultasSekarang = fakultasItem.getChoices().map(function (c) { return c.getValue(); });
  if (pilihanFakultasSekarang.indexOf(NILAI_FAKULTAS_LAINNYA) === -1) {
    fakultasItem.setChoiceValues(pilihanFakultasSekarang.concat([NILAI_FAKULTAS_LAINNYA]));
  }

  var itemFakultasLainnya = form.addTextItem();
  itemFakultasLainnya.setTitle(JUDUL_ITEM_FAKULTAS_LAINNYA).setRequired(false);

  // ---- 3. Item baru "IPK" (lihat alasan tidak wajib di komentar atas fungsi ini) ----
  var itemIPK = form.addTextItem();
  itemIPK.setTitle(JUDUL_ITEM_IPK)
      .setRequired(false)
      .setHelpText('Wajib diisi untuk Alumni UNPRI. Opsional untuk pelamar dari luar UNPRI. Format contoh: 3.45 (skala 0 sampai 4).')
      .setValidation(FormApp.createTextValidation()
          .setHelpText('IPK harus berupa angka antara 0 dan 4.')
          .requireNumberBetween(0, 4)
          .build());

  // ---- 4. Pindahkan lima item ini ke posisi tepat SEBELUM pertanyaan Alumni ----
  // (fakultasItem ikut dipindah, keluar dari section "Data Alumni UNPRI" lama.)
  [itemProdi, itemProdiLainnya, fakultasItem, itemFakultasLainnya, itemIPK].forEach(function (item) {
    var idxAlumniSekarang = alumniItem.getIndex();
    form.moveItem(item.getIndex(), idxAlumniSekarang);
  });

  form.setDescription(
    'Form pendaftaran pelamar untuk lowongan di ' + namaUnitRS + '. ' +
    'Pilih posisi yang Anda lamar dari daftar yang tersedia. Program Studi, ' +
    'Fakultas, dan IPK ditanyakan ke semua pelamar (alumni maupun bukan). ' +
    'Silakan login dengan akun Google untuk mengisi form ini.'
  );

  Logger.log(namaUnitRS + ': restrukturisasi selesai. prodiItemId = ' + itemProdi.getId() +
      ', ipkItemId = ' + itemIPK.getId() + '  <-- opsional, SALIN ke KONFIGURASI_UNIT_RS kalau mau diarsipkan seperti item ID lain.');
}

/**
 * Bagikan akses folder CV ke RS.
 *
 * OTOMATIS: fungsi ini (lewat bagikanFolderCVSatuUnit_) SEKARANG SUDAH
 * ikut dipanggil sendiri dari trigger onSubmitPelamarBaru setiap ada
 * pelamar baru submit (lihat fungsi itu di bawah), jadi TIDAK PERLU lagi
 * dijalankan manual berulang ulang, termasuk untuk Unit RS yang belum
 * ada pelamarnya sekarang, folder itu otomatis kebagi begitu pelamar
 * pertamanya nanti submit dengan CV. Dropdown Run di bawah ini tetap
 * bisa dipakai kapan saja kalau mau langsung berlaku untuk data yang
 * SUDAH ADA sekarang tanpa menunggu submission baru.
 *
 * MASALAH: jawaban item File Upload di Google Form disimpan Google ke
 * sebuah folder Drive yang otomatis dibuat dan DIMILIKI oleh akun pembuat
 * Form (akun CEDC/Ilman), bukan akun RS. Selama ini yang dibagikan ke RS
 * cuma Spreadsheet Pelamar (lewat share manual di Bagian 1), padahal itu
 * layer izin yang TERPISAH dari folder file nya sendiri, jadi RS bisa
 * lihat baris datanya tapi kalau klik/sorot link CV, Drive bilang perlu
 * minta akses dulu (baru terlihat sebagai "You are the owner" di sisi
 * pembuat Form).
 *
 * FIX: cari satu file CV yang sudah pernah diunggah (dari kolom "Unggah
 * CV (pdf)" di sheet Pelamar), telusuri folder induknya lewat
 * DriveApp.getFileById(...).getParents(), lalu bagikan folder itu (bukan
 * file satu satu) sebagai Viewer ke email PIC RS. Karena ini share di
 * level FOLDER, semua file yang SUDAH ada di situ langsung ikut kebuka,
 * dan file BARU yang nanti masuk ke folder yang sama (submission
 * berikutnya) otomatis ikut ke-cover juga, tanpa perlu dibagikan ulang
 * tiap kali ada pelamar baru.
 *
 * CARA PAKAI (opsional, cuma untuk cek/berlaku segera): jalankan fungsi
 * bagikanFolderCVKeRS() ini lewat dropdown Run di Apps Script (butuh
 * minimal satu pelamar yang sudah pernah upload CV di tiap Unit RS,
 * supaya ada file yang bisa dijadikan acuan folder, kalau belum ada
 * cukup tunggu pelamar pertama submit, nanti otomatis kebagi sendiri).
 * Email tujuan diambil dari emailPicRS di KONFIGURASI_UNIT_RS di atas,
 * ganti nilainya dulu di situ kalau PIC RS berubah.
 */
function bagikanFolderCVKeRS() {
  bagikanFolderCVSatuUnit_(KONFIGURASI_UNIT_RS.royalPrima, 'Royal Prima');
  bagikanFolderCVSatuUnit_(KONFIGURASI_UNIT_RS.royalPrimaMarelan, 'Royal Prima Marelan');
}

function bagikanFolderCVSatuUnit_(konfig, namaUnitRS) {
  if (!konfig.emailPicRS) {
    Logger.log(namaUnitRS + ': emailPicRS belum diisi di KONFIGURASI_UNIT_RS, dilewati.');
    return;
  }

  var ss = SpreadsheetApp.openById(konfig.spreadsheetPelamarId);
  var sheetPelamar = cariSheetDenganKolomCV_(ss);
  if (!sheetPelamar) {
    Logger.log(namaUnitRS + ': tidak ketemu sheet dengan kolom "Unggah CV (pdf)" (pencarian sudah abaikan spasi/kapital berlebih). Pastikan item File Upload sudah dibuat manual di Form sesuai instruksi Bagian 1.');
    return;
  }
  var headerPelamar = sheetPelamar.getRange(1, 1, 1, sheetPelamar.getLastColumn()).getValues()[0];
  var kolomCV = cariIndexKolomCV_(headerPelamar) + 1;
  var jumlahBaris = Math.max(sheetPelamar.getLastRow() - 1, 0);
  if (!jumlahBaris) {
    Logger.log(namaUnitRS + ': belum ada data pelamar sama sekali, belum ada folder CV untuk dibagikan. Jalankan ulang fungsi ini nanti setelah ada pelamar pertama yang upload CV.');
    return;
  }

  // Cukup cari SATU file CV yang valid (baris mana pun), karena semua
  // jawaban File Upload dari Form yang sama jatuh ke folder respons yang
  // SAMA. Tidak perlu cari file per baris.
  var nilaiKolomCV = sheetPelamar.getRange(2, kolomCV, jumlahBaris, 1).getValues();
  var fileId = null;
  for (var i = 0; i < nilaiKolomCV.length && !fileId; i++) {
    var satuSel = String(nilaiKolomCV[i][0] || '').split(',')[0].trim();
    fileId = ekstrakFileIdDrive_(satuSel);
  }
  if (!fileId) {
    Logger.log(namaUnitRS + ': tidak menemukan link Drive yang valid di kolom "Unggah CV (pdf)", belum ada yang bisa dibagikan. Coba lagi nanti setelah ada pelamar yang upload CV.');
    return;
  }

  var daftarFolderInduk = DriveApp.getFileById(fileId).getParents();
  var jumlahFolderDibagikan = 0;
  while (daftarFolderInduk.hasNext()) {
    var folder = daftarFolderInduk.next();
    folder.addViewer(konfig.emailPicRS);
    jumlahFolderDibagikan++;
    Logger.log(namaUnitRS + ': folder "' + folder.getName() + '" (folder respons File Upload milik Form ini) berhasil dibagikan sebagai Viewer ke ' + konfig.emailPicRS + '.');
  }
  if (!jumlahFolderDibagikan) {
    Logger.log(namaUnitRS + ': file CV ditemukan tapi tidak punya folder induk yang bisa dibagikan (kemungkinan file langsung di My Drive tanpa folder).');
  }
}

// Judul kolom "Unggah CV (pdf)" itu SATU SATUNYA item yang dibuat MANUAL
// lewat UI Google Forms (Google melarang File Upload dibuat lewat script,
// lihat catatan Bagian 1), jadi rawan beda spasi/kapital dari yang diketik
// CEDC dulu (ketahuan lewat error "kolom tidak ditemukan" saat migrasi
// bagikanFolderCVKeRS: judul aslinya ternyata ada spasi nyempil di
// depan/belakang, "  Unggah CV (pdf)  "). Supaya tetap ketemu berapa pun
// variasi spasi/kapitalnya, pencariannya trim + lowercase dulu, BEDA dari
// header.indexOf(...) exact-match biasa yang dipakai kolom lain (yang
// semuanya dibuat otomatis lewat script, jadi judulnya pasti persis).
function cariIndexKolomCV_(header) {
  for (var i = 0; i < header.length; i++) {
    if (String(header[i]).trim().toLowerCase() === 'unggah cv (pdf)') return i;
  }
  return -1;
}

function cariSheetDenganKolomCV_(spreadsheet) {
  var semuaSheet = spreadsheet.getSheets();
  for (var i = 0; i < semuaSheet.length; i++) {
    var header = semuaSheet[i].getRange(1, 1, 1, semuaSheet[i].getLastColumn()).getValues()[0];
    if (cariIndexKolomCV_(header) !== -1) return semuaSheet[i];
  }
  return null;
}

// Ekstrak File ID Drive dari teks URL, dukung dua format URL yang umum
// muncul di jawaban File Upload Form: ".../open?id=FILEID" dan
// ".../file/d/FILEID/view...". Mengembalikan null kalau tidak ketemu pola
// yang cocok (misalnya sel kosong atau isinya bukan URL Drive).
function ekstrakFileIdDrive_(teks) {
  var s = String(teks || '');
  var cocok = s.match(/[?&]id=([a-zA-Z0-9_-]+)/) || s.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return cocok ? cocok[1] : null;
}

/**
 * Bagikan akses co-editor RS ke Form Pendaftaran Pelamar mereka sendiri.
 *
 * PRINSIP DESAIN (sudah disepakati sejak awal proyek ini): CEDC berperan
 * sebagai penyedia infrastruktur, bukan pemilik proses rekrutmen RS. RS
 * yang benar-benar membutuhkan lowongan diedarkan dan melakukan seleksi
 * harus diberi akses edit SUNGGUHAN atas Form mereka sendiri (misalnya
 * menambah pertanyaan khusus di section "Pertanyaan Tambahan dari RS"),
 * bukan cuma jadi kanal usul lewat CEDC. Field inti (Nama Lengkap, Posisi
 * yang Dilamar, dst) tetap aman dari perubahan RS karena semua pembacaan
 * jawaban Form di file ini pakai Item ID / nama header, bukan posisi
 * tetap, jadi RS boleh menambah/menyusun ulang pertanyaan tambahan mereka
 * tanpa merusak sistem.
 *
 * Beda dengan bagikanFolderCVKeRS() di atas, fungsi ini TIDAK perlu
 * menunggu ada pelamar dulu, formId sudah pasti ada sejak Form dibuat
 * (lihat KONFIGURASI_UNIT_RS), jadi cukup dijalankan SEKALI kapan saja,
 * tidak perlu ditempel ke trigger submit seperti folder CV.
 * DriveApp.addEditor(...) idempotent, aman dijalankan ulang kapan saja
 * kalau suatu saat emailPicRS berubah.
 */
function bagikanEditorFormKeRS() {
  bagikanEditorFormSatuUnit_(KONFIGURASI_UNIT_RS.royalPrima, 'Royal Prima');
  bagikanEditorFormSatuUnit_(KONFIGURASI_UNIT_RS.royalPrimaMarelan, 'Royal Prima Marelan');
}

function bagikanEditorFormSatuUnit_(konfig, namaUnitRS) {
  if (!konfig.emailPicRS) {
    Logger.log(namaUnitRS + ': emailPicRS belum diisi di KONFIGURASI_UNIT_RS, dilewati.');
    return;
  }
  if (!konfig.formId) {
    Logger.log(namaUnitRS + ': formId belum diisi di KONFIGURASI_UNIT_RS, dilewati.');
    return;
  }
  DriveApp.getFileById(konfig.formId).addEditor(konfig.emailPicRS);
  Logger.log(namaUnitRS + ': Form Pendaftaran Pelamar berhasil dibagikan sebagai Editor ke ' + konfig.emailPicRS + '.');
}

// ===== Bagian A: Trigger On Edit, sinkronkan Link + Dropdown Posisi =====

function pasangTriggerOnEdit() {
  var sudahAda = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'onEditMasterPermintaan';
  });
  if (sudahAda) {
    Logger.log('Trigger onEditMasterPermintaan sudah terpasang, tidak dipasang ulang.');
    return;
  }
  ScriptApp.newTrigger('onEditMasterPermintaan')
    .forSpreadsheet(SpreadsheetApp.openById(ID_SPREADSHEET_MASTER_PERMINTAAN))
    .onEdit()
    .create();
  Logger.log('Trigger onEditMasterPermintaan berhasil dipasang.');
}

/**
 * Terpicu setiap ada edit apa pun di Master Permintaan. Cuma bereaksi
 * kalau kolom yang diedit adalah kolom Status (nilai apa pun, bukan cuma
 * "Dipublikasikan" saja seperti sebelumnya), supaya dropdown ikut
 * disinkronkan juga saat sebuah posisi DITUTUP, bukan cuma saat dibuka.
 */
function onEditMasterPermintaan(e) {
  var sheet = e.range.getSheet();
  if (sheet.getName() !== NAMA_SHEET_MASTER_PERMINTAAN) return;

  var kolomStatus = getKolomIndex(sheet, 'Status');
  if (e.range.getColumn() !== kolomStatus) return;

  var baris = e.range.getRow();
  var statusBaru = e.range.getValue();
  var kolomUnitRS = getKolomIndex(sheet, 'Unit RS');
  var kolomLink = getKolomIndex(sheet, 'Link Pendaftaran');
  var kolomRekap = getKolomIndex(sheet, 'Link Rekap Pelamar');
  var unitRS = sheet.getRange(baris, kolomUnitRS).getValue();

  if (!unitRS) {
    Logger.log('Baris ' + baris + ' belum punya Unit RS, dilewati.');
    return;
  }

  var konfig = getKonfigurasiUnitRS(unitRS);

  // Link Pendaftaran sekarang generik (sama untuk semua baris Unit RS ini),
  // cukup ditulis ulang tiap kali statusnya "Dipublikasikan", dikosongkan
  // lagi kalau statusnya berubah jadi bukan itu.
  if (statusBaru === 'Dipublikasikan') {
    sheet.getRange(baris, kolomLink).setValue(FormApp.openById(konfig.formId).getPublishedUrl());
  } else {
    sheet.getRange(baris, kolomLink).setValue('');
  }

  // Link Rekap Pelamar (Spreadsheet jawaban) TIDAK bergantung Status, selalu
  // ditulis begitu Unit RS pada baris ini diketahui.
  sheet.getRange(baris, kolomRekap).setValue(linkSpreadsheetPelamar_(konfig));

  sinkronDropdownPosisi_(unitRS);
}

// URL Spreadsheet Pelamar (yang tertaut ke Responses Form Pendaftaran
// Pelamar) untuk satu Unit RS, dari spreadsheetPelamarId di
// KONFIGURASI_UNIT_RS. Kalau tab "Rekap per Lowongan" (Bagian D) sudah
// dibuat, link ini langsung menjorok ke tab itu (pakai #gid=) supaya RS
// begitu klik dari Master Permintaan langsung sampai di tab yang berguna,
// bukan tab pertama yang kebetulan aktif terakhir. Kalau tab itu belum ada
// (Bagian D belum di-setup), otomatis jatuh ke link dasar spreadsheetnya.
function linkSpreadsheetPelamar_(konfig) {
  var linkDasar = 'https://docs.google.com/spreadsheets/d/' + konfig.spreadsheetPelamarId + '/edit';
  try {
    var sheetRekap = SpreadsheetApp.openById(konfig.spreadsheetPelamarId).getSheetByName(NAMA_SHEET_REKAP_PELAMAR);
    if (sheetRekap) return linkDasar + '#gid=' + sheetRekap.getSheetId();
  } catch (err) {
    Logger.log('Gagal ambil gid tab Rekap per Lowongan, link Rekap Pelamar pakai link dasar saja: ' + err.message);
  }
  return linkDasar;
}

/**
 * Sinkronkan dropdown "Posisi yang Dilamar" di Form Unit RS tertentu,
 * supaya isinya persis sama dengan semua baris berstatus "Dipublikasikan"
 * untuk Unit RS itu di Master Permintaan sekarang. Dipanggil otomatis
 * dari onEditMasterPermintaan, dan bisa dipanggil manual lewat
 * sinkronSemuaDropdownPosisi kalau perlu memaksa sinkron ulang.
 */
function sinkronDropdownPosisi_(unitRS) {
  var konfig = getKonfigurasiUnitRS(unitRS);
  if (!konfig.posisiItemId) {
    Logger.log('posisiItemId untuk ' + unitRS + ' belum diisi di KONFIGURASI_UNIT_RS, lewati sinkron dropdown. Jalankan migrasiTambahDropdownPosisi dulu.');
    return;
  }

  var sheet = SpreadsheetApp.openById(ID_SPREADSHEET_MASTER_PERMINTAAN).getSheetByName(NAMA_SHEET_MASTER_PERMINTAAN);
  var kolomUnitRS = getKolomIndex(sheet, 'Unit RS');
  var kolomPosisi = getKolomIndex(sheet, 'Posisi');
  var kolomKode = getKolomIndex(sheet, 'Kode Lowongan');
  var kolomStatus = getKolomIndex(sheet, 'Status');

  var jumlahBaris = Math.max(sheet.getLastRow() - 1, 0);
  var pilihan = [];
  if (jumlahBaris > 0) {
    var data = sheet.getRange(2, 1, jumlahBaris, sheet.getLastColumn()).getValues();
    data.forEach(function (baris) {
      if (baris[kolomUnitRS - 1] !== unitRS) return;
      if (baris[kolomStatus - 1] !== 'Dipublikasikan') return;
      var posisi = baris[kolomPosisi - 1];
      var kode = baris[kolomKode - 1];
      if (!posisi || !kode) return;
      pilihan.push(posisi + ' (' + kode + ')');
    });
  }

  if (!pilihan.length) pilihan = [PLACEHOLDER_BELUM_ADA_POSISI];

  var form = FormApp.openById(konfig.formId);
  var itemPosisi = form.getItemById(konfig.posisiItemId).asListItem();
  itemPosisi.setChoiceValues(pilihan);

  Logger.log('Dropdown Posisi untuk ' + unitRS + ' disinkronkan, ' + pilihan.length + ' pilihan: ' + pilihan.join(' | '));
}

// Jalankan manual kalau perlu memaksa sinkron ulang kedua dropdown sekaligus,
// misalnya setelah migrasi pertama kali, atau setelah ada perubahan data
// Master Permintaan yang tidak lewat edit langsung di kolom Status (jarang
// terjadi, tapi aman untuk jaga jaga).
function sinkronSemuaDropdownPosisi() {
  sinkronDropdownPosisi_('RS Royal Prima');
  sinkronDropdownPosisi_('RS Royal Prima Marelan');
}

// ===== Bagian B: Trigger berbasis waktu, hitung ulang Jumlah Pendaftar =====

function pasangTriggerHitungPendaftar() {
  var sudahAda = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'hitungUlangJumlahPendaftar';
  });
  if (sudahAda) {
    Logger.log('Trigger hitungUlangJumlahPendaftar sudah terpasang, tidak dipasang ulang.');
    return;
  }
  ScriptApp.newTrigger('hitungUlangJumlahPendaftar')
    .timeBased()
    .everyHours(1)
    .create();
  Logger.log('Trigger hitungUlangJumlahPendaftar berhasil dipasang, jalan tiap 1 jam.');
}

// ===== Bagian C: Trigger realtime, hitung ulang begitu ada pelamar baru =====

/**
 * Pasang trigger onFormSubmit di KEDUA Form Pendaftaran Pelamar (Royal
 * Prima dan Marelan), supaya Jumlah Pendaftar (dan Link Pendaftaran)
 * langsung dihitung ulang begitu ada pelamar baru submit, tidak perlu
 * nunggu jam-an lagi. Jalankan SEKALI SAJA, aman diulang (tidak akan
 * pasang dobel per Form).
 */
function pasangTriggerRealtimePelamar() {
  pasangTriggerRealtimeSatuForm_(KONFIGURASI_UNIT_RS.royalPrima.formId, 'Royal Prima');
  pasangTriggerRealtimeSatuForm_(KONFIGURASI_UNIT_RS.royalPrimaMarelan.formId, 'Royal Prima Marelan');
}

function pasangTriggerRealtimeSatuForm_(formId, namaUnitRS) {
  var sudahAda = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'onSubmitPelamarBaru' && t.getTriggerSourceId() === formId;
  });
  if (sudahAda) {
    Logger.log(namaUnitRS + ': trigger onSubmitPelamarBaru sudah terpasang di Form ini, tidak dipasang ulang.');
    return;
  }
  ScriptApp.newTrigger('onSubmitPelamarBaru')
    .forForm(FormApp.openById(formId))
    .onFormSubmit()
    .create();
  Logger.log(namaUnitRS + ': trigger onSubmitPelamarBaru berhasil dipasang di Form Pendaftaran Pelamar.');
}

/**
 * Terpicu tiap ada pelamar baru submit Form Pendaftaran Pelamar, Royal
 * Prima maupun Marelan (dua duanya pakai fungsi yang sama, karena
 * hitungUlangJumlahPendaftar() sekali jalan sudah menghitung ulang
 * kedua Unit RS sekaligus). Sengaja TIDAK membaca e.response sama
 * sekali, cuma dipakai sebagai sinyal "ada submission baru", supaya
 * tidak kena masalah e.response yang sempat gagal terus menerus di
 * Form Permintaan Tenaga Kerja (isiMasterPermintaan), yang kebetulan
 * sama sama punya pertanyaan File Upload.
 *
 * bagikanFolderCVSatuUnit_ SENGAJA ikut dipanggil di sini juga (bukan
 * cuma lewat bagikanFolderCVKeRS() manual), supaya share folder CV ke RS
 * berjalan OTOMATIS begitu ada pelamar baru, tidak perlu CEDC ingat
 * ingat menjalankan ulang manual, termasuk untuk Unit RS yang tadinya
 * belum punya pelamar sama sekali (baru bisa ketemu folder-nya begitu
 * ada file CV pertama). folder.addViewer(...) idempotent, aman dipanggil
 * berkali kali tanpa efek samping kalau memang sudah pernah dibagikan
 * sebelumnya, jadi tidak masalah dipanggil di SETIAP submission. Dibungkus
 * try/catch supaya kalau ada masalah di sisi Drive (jaringan, dsb),
 * penghitungan Jumlah Pendaftar dan Rekap Pelamar di atas tetap jalan
 * normal, tidak ikut gagal gara gara ini.
 */
function onSubmitPelamarBaru(e) {
  hitungUlangJumlahPendaftar();
  perbaruiRekapPelamar_(KONFIGURASI_UNIT_RS.royalPrima.spreadsheetPelamarId);
  perbaruiRekapPelamar_(KONFIGURASI_UNIT_RS.royalPrimaMarelan.spreadsheetPelamarId);
  try {
    bagikanFolderCVSatuUnit_(KONFIGURASI_UNIT_RS.royalPrima, 'Royal Prima');
    bagikanFolderCVSatuUnit_(KONFIGURASI_UNIT_RS.royalPrimaMarelan, 'Royal Prima Marelan');
  } catch (err) {
    Logger.log('Gagal membagikan folder CV otomatis: ' + err);
  }
}

/**
 * Jalan tiap 1 jam (dan aman dipanggil manual kapan saja). Selain hitung
 * ulang Jumlah Pendaftar, sekalian merapikan kolom Link Pendaftaran untuk
 * SEMUA baris (bukan cuma baris yang baru diedit), supaya baris baris
 * yang sudah berstatus "Dipublikasikan" dari sebelumnya tapi belum
 * sempat kena trigger onEdit tetap ikut terisi linknya. Link Pendaftaran
 * sekarang generik per Unit RS, sama untuk semua baris Unit RS yang sama.
 */
function hitungUlangJumlahPendaftar() {
  var sheet = SpreadsheetApp.openById(ID_SPREADSHEET_MASTER_PERMINTAAN).getSheetByName(NAMA_SHEET_MASTER_PERMINTAAN);
  var kolomKode = getKolomIndex(sheet, 'Kode Lowongan');
  var kolomUnitRS = getKolomIndex(sheet, 'Unit RS');
  var kolomStatus = getKolomIndex(sheet, 'Status');
  var kolomJumlah = getKolomIndex(sheet, 'Jumlah Pendaftar');
  var kolomLink = getKolomIndex(sheet, 'Link Pendaftaran');
  var kolomRekap = getKolomIndex(sheet, 'Link Rekap Pelamar');

  var jumlahBaris = sheet.getLastRow() - 1;
  if (jumlahBaris <= 0) return;

  var data = sheet.getRange(2, 1, jumlahBaris, sheet.getLastColumn()).getValues();

  var hitunganRoyalPrima = hitungKodeLowonganDiSheetPelamar(KONFIGURASI_UNIT_RS.royalPrima.spreadsheetPelamarId);
  var hitunganMarelan = hitungKodeLowonganDiSheetPelamar(KONFIGURASI_UNIT_RS.royalPrimaMarelan.spreadsheetPelamarId);

  var linkRoyalPrima = FormApp.openById(KONFIGURASI_UNIT_RS.royalPrima.formId).getPublishedUrl();
  var linkMarelan = FormApp.openById(KONFIGURASI_UNIT_RS.royalPrimaMarelan.formId).getPublishedUrl();

  var linkRekapRoyalPrima = linkSpreadsheetPelamar_(KONFIGURASI_UNIT_RS.royalPrima);
  var linkRekapMarelan = linkSpreadsheetPelamar_(KONFIGURASI_UNIT_RS.royalPrimaMarelan);

  data.forEach(function (baris, i) {
    var unitRS = baris[kolomUnitRS - 1];
    if (!unitRS) return;

    var konfig = getKonfigurasiUnitRS(unitRS);
    var adalahMarelan = (konfig === KONFIGURASI_UNIT_RS.royalPrimaMarelan);

    var kodeLowongan = baris[kolomKode - 1];
    if (kodeLowongan) {
      var hitungan = adalahMarelan ? hitunganMarelan : hitunganRoyalPrima;
      var jumlah = hitungan[kodeLowongan] || 0;
      sheet.getRange(i + 2, kolomJumlah).setValue(jumlah);
    }

    var statusBaris = baris[kolomStatus - 1];
    var linkSeharusnya = (statusBaris === 'Dipublikasikan') ? (adalahMarelan ? linkMarelan : linkRoyalPrima) : '';
    if (baris[kolomLink - 1] !== linkSeharusnya) {
      sheet.getRange(i + 2, kolomLink).setValue(linkSeharusnya);
    }

    var linkRekapSeharusnya = adalahMarelan ? linkRekapMarelan : linkRekapRoyalPrima;
    if (baris[kolomRekap - 1] !== linkRekapSeharusnya) {
      sheet.getRange(i + 2, kolomRekap).setValue(linkRekapSeharusnya);
    }
  });

  perbaruiRekapPelamar_(KONFIGURASI_UNIT_RS.royalPrima.spreadsheetPelamarId);
  perbaruiRekapPelamar_(KONFIGURASI_UNIT_RS.royalPrimaMarelan.spreadsheetPelamarId);

  Logger.log('Jumlah Pendaftar, Link Pendaftaran, Link Rekap Pelamar, dan tab Rekap per Lowongan selesai dirapikan untuk ' + jumlahBaris + ' baris.');
}

/**
 * PERUBAHAN: sebelumnya menghitung dari kolom "Kode Lowongan" di sheet
 * Pelamar (yang dulu terisi otomatis lewat prefill). Sekarang kolom itu
 * sudah tidak ada, diganti kolom jawaban dropdown "Posisi yang Dilamar",
 * formatnya "Posisi (Kode Lowongan)". Kode Lowongan diambil dari isi
 * tanda kurung PALING BELAKANG pada teks jawaban itu.
 */
function hitungKodeLowonganDiSheetPelamar(spreadsheetId) {
  var ss = SpreadsheetApp.openById(spreadsheetId);
  var sheetPelamar = cariSheetDenganKolom(ss, JUDUL_ITEM_POSISI);
  var kolomPosisi = getKolomIndex(sheetPelamar, JUDUL_ITEM_POSISI);

  var jumlahBaris = sheetPelamar.getLastRow() - 1;
  var hasil = {};
  if (jumlahBaris <= 0) return hasil;

  var data = sheetPelamar.getRange(2, kolomPosisi, jumlahBaris, 1).getValues();
  data.forEach(function (row) {
    var kode = ekstrakKodeLowongan_(row[0]);
    if (!kode) return; // jawaban tidak sesuai format "Posisi (Kode)", dilewati
    hasil[kode] = (hasil[kode] || 0) + 1;
  });
  return hasil;
}

/**
 * Ekstrak Kode Lowongan dari satu jawaban dropdown "Posisi yang Dilamar",
 * formatnya "Posisi (Kode Lowongan)". Kode diambil dari isi tanda kurung
 * PALING BELAKANG pada teksnya. Dipakai bersama oleh
 * hitungKodeLowonganDiSheetPelamar (Bagian B, hitung Jumlah Pendaftar) dan
 * perbaruiRekapPelamar_ (Bagian D, tab Rekap per Lowongan), supaya
 * logikanya persis sama di dua tempat, tidak dobel ditulis.
 */
function ekstrakKodeLowongan_(jawabanPosisi) {
  if (!jawabanPosisi) return null;
  var cocok = String(jawabanPosisi).match(/\(([^()]+)\)\s*$/);
  return cocok ? cocok[1].trim() : null;
}

// ===== Pembantu Skor Prioritas (Lapis 1, 2, 3) =====
//
// PERUBAHAN (21 Sep 2026): tab "Rekap per Lowongan" sekarang juga
// menghitung "Skor Prioritas" per pelamar (dua kolom baru: "Skor
// Prioritas" angka, dan "Rincian Skor" penjelasan teks), lalu
// mengurutkan tabel hasil dari skor TERTINGGI ke TERENDAH. Ini
// menggantikan tahap "Lolos Administrasi" yang dulu diisi manual RS
// (lihat komentar di atas DAFTAR_STATUS_LAMARAN), sekarang penyaringan
// administrasi awal dilakukan lewat skor ini, tapi datanya tetap
// ditampilkan (tidak disembunyikan), supaya RS tetap bisa lihat semua
// pelamar dan menimbang sendiri, bukan black box.
//
// Rincian bobotnya (sengaja kecil dan dijelaskan lewat teks, bukan cuma
// angka, supaya RS paham alasannya). Skor maksimum +25 (Alumni +5, IPK
// +5, Relevan +15), skor minimum -30 (bukan alumni +0, duplikat -10,
// IPK di bawah minimal -10, tidak relevan -10):
//   Lapis 1 (Alumni + duplikat, dicocokkan lewat Email + Nomor WhatsApp
//     Aktif + NIM, BUKAN nomor KTP/NIK, sesuai keputusan soal UU PDP):
//       Alumni UNPRI: +5 (PERUBAHAN 22 Sep 2026, sebelumnya +10, sengaja
//       diperkecil supaya jadi pemberat tipis untuk kasus seri, bukan
//       faktor yang bisa mengalahkan kualifikasi nyata pelamar
//       non-alumni yang lebih relevan/IPK lebih baik, lihat perhitungan
//       di percakapan terkait "fair chance" non-alumni)
//       Duplikat (pernah submit untuk posisi yang sama sebelumnya,
//       submission PALING AWAL yang dianggap sah, submission berikutnya
//       yang kena penalti): -10 (PERUBAHAN 22 Sep 2026, sebelumnya -20,
//       diturunkan supaya sama beratnya dengan sinyal negatif Lapis 2/3
//       lain, tidak lagi mendominasi secara tidak proporsional cuma
//       karena submit dobel belum tentu itikad buruk, bisa juga salah
//       klik)
//   Lapis 2 (IPK, dibandingkan ke IPK Minimal lowongan ybs dari Master
//     Permintaan, sengaja dibuat kecil dan dibatasi/capped karena IPK
//     yang diisi sendiri oleh pelamar tidak reliable):
//       IPK >= minimal: +1 poin tiap kelebihan 0,1 IPK, MAKSIMAL +5
//       IPK < minimal: -10 (gagal syarat minimal)
//       IPK/minimal tidak diisi salah satu: dilewati, +0
//   Lapis 3 (relevansi Program Studi + Fakultas terhadap yang dibutuhkan
//     lowongan, dari kolom Program Studi Relevan/Fakultas Relevan di
//     Master Permintaan; kalau pelamar pilih "Lainnya" dan menuliskan
//     manual, dicocokkan lewat kata kunci, BUKAN exact match):
//       Program Studi DAN Fakultas cocok ("Relevan"): +15
//       Salah satu saja yang cocok ("Mungkin Relevan"): +5
//       Tidak ada yang cocok ("Tidak Relevan"): -10
//       Data pembanding di lowongan kosong (baris lama, belum migrasi):
//       dilewati, +0
//   Lapis 4 (pemindaian kata kunci CV) SENGAJA TIDAK dibuat, sesuai
//   keputusan karena SDM RS maupun pendaftar belum tentu paham istilah
//   kata kunci yang tepat.
//
// CATATAN SOAL "FAIR CHANCE" NON-ALUMNI: bonus Alumni (+5) sengaja
// dibuat lebih kecil dari SATU tingkat perbedaan relevansi (10-15 poin)
// atau dari selisih IPK di atas/di bawah minimal (15 poin), supaya
// pelamar non-alumni yang relevan dan IPK-nya baik SELALU bisa
// mengungguli alumni yang kualifikasinya lemah. Bonus Alumni cuma jadi
// penentu kalau dua pelamar benar-benar setara di semua faktor lain,
// bukan faktor yang bisa menutupi kualifikasi yang lebih lemah.

// Stopword jenjang/kata penghubung, dibuang saat mencocokkan kata kunci
// supaya "Sarjana Manajemen" dan "manajemen" (ketikan manual Lainnya)
// bisa tetap dianggap cocok.
var TOKEN_STOPWORD_PRODI_ = ['sarjana', 'magister', 'profesi', 'doktor', 'doktoral', 'spesialis', 'pendidikan', 'dan', 'untuk'];

function tokenSignifikan_(teks) {
  return String(teks || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(function (t) { return t && TOKEN_STOPWORD_PRODI_.indexOf(t) === -1; });
}

// True kalau ADA setidaknya satu kata kunci signifikan yang sama antara
// teksBebas (ketikan manual pelamar di pilihan Lainnya) dengan salah satu
// string di daftarTarget (Program Studi Relevan/Fakultas Relevan lowongan).
function cocokKeyword_(teksBebas, daftarTarget) {
  var tokenBebas = tokenSignifikan_(teksBebas);
  if (!tokenBebas.length) return false;
  return daftarTarget.some(function (target) {
    var tokenTarget = tokenSignifikan_(target);
    return tokenBebas.some(function (t) { return tokenTarget.indexOf(t) !== -1; });
  });
}

// Cocokkan satu jawaban pelamar (Program Studi ATAU Fakultas) terhadap
// daftar yang dibutuhkan lowongan. Kalau pelamar pilih dari katalog resmi
// (bukan Lainnya), dicocokkan EXACT (string sama persis, karena sama sama
// diambil dari katalog UNPRI yang sama). Kalau pelamar pilih "Lainnya" dan
// menuliskan manual, dicocokkan lewat kata kunci (cocokKeyword_). Return
// true/false, atau null kalau tidak bisa dinilai (data lowongan kosong,
// biasanya baris lama sebelum kolom ini ada).
function cocokDenganDaftar_(nilaiPilihan, teksLainnya, nilaiLainnyaMarker, daftarTarget) {
  if (!daftarTarget || !daftarTarget.length) return null;
  if (!nilaiPilihan) return null;
  if (nilaiPilihan !== nilaiLainnyaMarker) {
    return daftarTarget.indexOf(nilaiPilihan) !== -1;
  }
  return cocokKeyword_(teksLainnya, daftarTarget);
}

// Normalisasi nomor WhatsApp untuk pencocokan duplikat: buang semua
// karakter selain digit, lalu samakan awalan (0xxx dan +62xxx/62xxx
// dianggap nomor yang sama).
function normalisasiWA_(nomor) {
  var digit = String(nomor || '').replace(/\D/g, '');
  if (!digit) return '';
  if (digit.charAt(0) === '0') digit = '62' + digit.substring(1);
  return digit;
}

function pecahDaftarKoma_(teks) {
  return String(teks || '').split(',')
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s; });
}

// Ambil IPK Minimal + Program Studi Relevan + Fakultas Relevan untuk SATU
// Kode Lowongan, dibaca dari Master Permintaan (Layer 1). Dipanggil sekali
// per refresh tab Rekap (bukan per baris pelamar), karena tab itu memang
// sudah difilter ke satu Kode Lowongan saja lewat dropdown B1.
function ambilDataLowongan_(kodeLowongan) {
  if (!kodeLowongan) return null;
  var sheet = SpreadsheetApp.openById(ID_SPREADSHEET_MASTER_PERMINTAAN).getSheetByName(NAMA_SHEET_MASTER_PERMINTAAN);
  var kolomKode = getKolomIndex(sheet, 'Kode Lowongan');
  var kolomIPK = getKolomIndex(sheet, 'IPK Minimal');
  var kolomProdi = getKolomIndex(sheet, 'Program Studi Relevan');
  var kolomFakultas = getKolomIndex(sheet, 'Fakultas Relevan');

  var jumlahBaris = Math.max(sheet.getLastRow() - 1, 0);
  if (!jumlahBaris) return null;

  var data = sheet.getRange(2, 1, jumlahBaris, sheet.getLastColumn()).getValues();
  for (var i = 0; i < data.length; i++) {
    if (data[i][kolomKode - 1] === kodeLowongan) {
      var ipkMinimalMentah = data[i][kolomIPK - 1];
      var ipkMinimal = (ipkMinimalMentah !== '' && ipkMinimalMentah !== null && !isNaN(parseFloat(ipkMinimalMentah)))
          ? parseFloat(ipkMinimalMentah) : null;
      return {
        ipkMinimal: ipkMinimal,
        programStudiRelevan: pecahDaftarKoma_(data[i][kolomProdi - 1]),
        fakultasRelevan: pecahDaftarKoma_(data[i][kolomFakultas - 1])
      };
    }
  }
  return null;
}

// Inti Lapis 1+2+3: hitung Skor Prioritas + rincian teksnya untuk SATU
// baris pelamar. `i` adalah index baris itu di array `data` UTUH (bukan
// index di hasil filter), dipakai untuk lookup konteks.indexDuplikat.
function hitungSkorPrioritas_(baris, i, konteks, dataLowongan) {
  var skor = 0;
  var rincian = [];

  // ---- Lapis 1: Alumni + Duplikat ----
  var alumni = konteks.idxAlumni !== -1 ? baris[konteks.idxAlumni] : '';
  if (alumni === 'Ya') {
    skor += 5;
    rincian.push('Alumni UNPRI: +5');
  } else {
    rincian.push('Bukan alumni UNPRI: +0');
  }

  if (konteks.indexDuplikat[i]) {
    skor -= 10;
    rincian.push('Duplikat, pernah melamar posisi ini sebelumnya: -10');
  }

  // ---- Lapis 2: IPK (capped, lihat catatan di atas kenapa dibuat kecil) ----
  var ipkMentah = konteks.idxIPK !== -1 ? baris[konteks.idxIPK] : '';
  var ipkPelamar = (ipkMentah !== '' && ipkMentah !== null) ? parseFloat(ipkMentah) : NaN;
  if (dataLowongan && dataLowongan.ipkMinimal !== null && !isNaN(ipkPelamar)) {
    var selisih = ipkPelamar - dataLowongan.ipkMinimal;
    if (selisih >= 0) {
      var bonusIPK = Math.min(Math.round(selisih * 10), 5);
      skor += bonusIPK;
      rincian.push('IPK ' + ipkPelamar + ' (minimal ' + dataLowongan.ipkMinimal + '): +' + bonusIPK);
    } else {
      skor -= 10;
      rincian.push('IPK ' + ipkPelamar + ' di bawah minimal ' + dataLowongan.ipkMinimal + ': -10');
    }
  } else {
    rincian.push('IPK tidak dibandingkan (data belum lengkap): +0');
  }

  // ---- Lapis 3: Relevansi Program Studi + Fakultas ----
  var prodiPelamar = konteks.idxProdi !== -1 ? baris[konteks.idxProdi] : '';
  var prodiLainnyaTeks = konteks.idxProdiLainnya !== -1 ? baris[konteks.idxProdiLainnya] : '';
  var fakultasPelamar = konteks.idxFakultas !== -1 ? baris[konteks.idxFakultas] : '';
  var fakultasLainnyaTeks = konteks.idxFakultasLainnya !== -1 ? baris[konteks.idxFakultasLainnya] : '';

  var cocokProdi = dataLowongan ? cocokDenganDaftar_(prodiPelamar, prodiLainnyaTeks, NILAI_PRODI_LAINNYA, dataLowongan.programStudiRelevan) : null;
  var cocokFakultas = dataLowongan ? cocokDenganDaftar_(fakultasPelamar, fakultasLainnyaTeks, NILAI_FAKULTAS_LAINNYA, dataLowongan.fakultasRelevan) : null;

  if (cocokProdi === null || cocokFakultas === null) {
    rincian.push('Relevansi Program Studi/Fakultas tidak diketahui (data lowongan belum lengkap): +0');
  } else if (cocokProdi && cocokFakultas) {
    skor += 15;
    rincian.push('Program Studi & Fakultas relevan: +15');
  } else if (cocokProdi || cocokFakultas) {
    skor += 5;
    rincian.push('Mungkin relevan (' + (cocokProdi ? 'Program Studi cocok, Fakultas tidak' : 'Fakultas cocok, Program Studi tidak') + '): +5');
  } else {
    skor -= 10;
    rincian.push('Program Studi & Fakultas tidak relevan: -10');
  }

  rincian.push('Skor Total: ' + skor);
  return { skor: skor, rincian: rincian.join(' | ') };
}

// ===== Bagian D: Tab "Rekap per Lowongan" di tiap Spreadsheet Pelamar =====
//
// PERUBAHAN (21 Sep 2026): tabel hasil di tab ini sekarang punya EMPAT
// kolom tambahan di ujung kanan, di luar kolom asli dari Form Responses:
//   - "Catatan Otomatis Sistem": penanda data belum lengkap, dan/atau
//     duplikat pernah melamar posisi yang sama, dihitung ulang dari data
//     terstruktur yang sudah ada, tanpa AI, tanpa biaya.
//   - "Status Lamaran": dropdown 4 tahap yang RS isi sendiri langsung di
//     tab ini (Belum Direview / Dipanggil Interview / Diterima / Ditolak).
//     Tahap "Lolos Administrasi" sengaja TIDAK ada lagi, karena
//     penyaringan administrasi awal sekarang digantikan Skor Prioritas
//     (bukan status manual yang RS pilih sendiri).
//   - "Skor Prioritas" dan "Rincian Skor": hasil Lapis 1 (Alumni +
//     duplikat), Lapis 2 (IPK), dan Lapis 3 (relevansi Program
//     Studi/Fakultas), lihat blok komentar di atas hitungSkorPrioritas_
//     untuk rincian bobotnya. Tabel diurutkan dari skor TERTINGGI ke
//     TERENDAH tiap kali disegarkan.
// Nilai Status Lamaran TIDAK disimpan di sel tabel ini saja, karena
// tabelnya ditulis ulang total tiap ada trigger lain jalan (submit baru,
// jam-an, ganti dropdown Kode Lowongan), yang akan menimpa isian RS kalau
// cuma disimpan di situ. Nilainya disimpan permanen di sheet tersembunyi
// "Status Lamaran (data)" (bukan di sheet Form Responses, supaya sheet
// bawaan Google Forms itu tidak pernah disentuh sama sekali), dikunci
// lewat kombinasi Timestamp + Email tiap pelamar, lalu "ditempel" lagi ke
// tabel hasil setiap kali tab ini disegarkan.

var NAMA_SHEET_REKAP_PELAMAR = 'Rekap per Lowongan';
var SEL_DROPDOWN_REKAP = 'B1'; // sel tempat RS memilih Kode Lowongan
var BARIS_AWAL_TABEL_REKAP = 3; // baris header tabel hasil filter mulai di sini

var NAMA_SHEET_STATUS_LAMARAN = 'Status Lamaran (data)'; // sheet tersembunyi, jangan dihapus
var JUDUL_KOLOM_CATATAN_OTOMATIS = 'Catatan Otomatis Sistem';
var JUDUL_KOLOM_STATUS_LAMARAN = 'Status Lamaran';
var DAFTAR_STATUS_LAMARAN = ['Belum Direview', 'Dipanggil Interview', 'Diterima', 'Ditolak'];
var STATUS_LAMARAN_DEFAULT = DAFTAR_STATUS_LAMARAN[0];

// Jalankan SEKALI SAJA untuk setup awal (lihat langkah di komentar atas file).
function setupRekapPelamarSemuaUnitRS() {
  perbaruiRekapPelamar_(KONFIGURASI_UNIT_RS.royalPrima.spreadsheetPelamarId);
  perbaruiRekapPelamar_(KONFIGURASI_UNIT_RS.royalPrimaMarelan.spreadsheetPelamarId);
  Logger.log('Tab "Rekap per Lowongan" siap dan terisi di kedua Spreadsheet Pelamar.');
}

function pasangTriggerRekapOnEdit() {
  pasangTriggerRekapOnEditSatuSpreadsheet_(KONFIGURASI_UNIT_RS.royalPrima.spreadsheetPelamarId, 'Royal Prima');
  pasangTriggerRekapOnEditSatuSpreadsheet_(KONFIGURASI_UNIT_RS.royalPrimaMarelan.spreadsheetPelamarId, 'Royal Prima Marelan');
}

function pasangTriggerRekapOnEditSatuSpreadsheet_(spreadsheetId, namaUnitRS) {
  var sudahAda = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'onEditRekapPelamar' && t.getTriggerSourceId() === spreadsheetId;
  });
  if (sudahAda) {
    Logger.log(namaUnitRS + ': trigger onEditRekapPelamar sudah terpasang di Spreadsheet Pelamar ini, tidak dipasang ulang.');
    return;
  }
  ScriptApp.newTrigger('onEditRekapPelamar')
    .forSpreadsheet(SpreadsheetApp.openById(spreadsheetId))
    .onEdit()
    .create();
  Logger.log(namaUnitRS + ': trigger onEditRekapPelamar berhasil dipasang di Spreadsheet Pelamar.');
}

/**
 * Terpicu tiap ada edit apa pun di SALAH SATU Spreadsheet Pelamar (Royal
 * Prima atau Marelan, tergantung mana yang sedang diedit RS), tapi cuma
 * bereaksi kalau editnya di tab "Rekap per Lowongan", dan cuma untuk dua
 * kasus: (1) sel dropdown Kode Lowongan (B1) diganti, tabel hasil filter
 * di bawahnya langsung disegarkan; (2) sel Status Lamaran di salah satu
 * baris tabel hasil diubah, nilainya langsung disimpan permanen (lihat
 * prosesEditStatusLamaran_).
 */
function onEditRekapPelamar(e) {
  var sheet = e.range.getSheet();
  if (sheet.getName() !== NAMA_SHEET_REKAP_PELAMAR) return;

  if (e.range.getA1Notation() === SEL_DROPDOWN_REKAP) {
    perbaruiRekapPelamar_(e.source.getId());
    return;
  }

  if (e.range.getRow() > BARIS_AWAL_TABEL_REKAP) {
    prosesEditStatusLamaran_(e);
  }
}

/**
 * Simpan satu perubahan Status Lamaran secara permanen ke sheet
 * tersembunyi "Status Lamaran (data)", dikunci lewat Timestamp + Email
 * baris yang diedit itu. Cuma bereaksi kalau kolom yang diedit persis
 * kolom "Status Lamaran" (dicari lewat nama header di baris header tabel
 * hasil, BUKAN posisi tetap, supaya tidak gampang rusak kalau RS menambah
 * pertanyaan baru di Form yang menggeser posisi kolom ini ke kanan).
 */
function prosesEditStatusLamaran_(e) {
  var sheet = e.range.getSheet();
  var headerBaris = sheet.getRange(BARIS_AWAL_TABEL_REKAP, 1, 1, sheet.getLastColumn()).getValues()[0];
  var kolomStatus = headerBaris.indexOf(JUDUL_KOLOM_STATUS_LAMARAN) + 1;
  var kolomTimestamp = headerBaris.indexOf('Timestamp') + 1;
  var kolomEmail = headerBaris.indexOf('Email Address') + 1;

  if (!kolomStatus || e.range.getColumn() !== kolomStatus) return;
  if (!kolomTimestamp || !kolomEmail) return;

  var baris = e.range.getRow();
  var timestampBaris = sheet.getRange(baris, kolomTimestamp).getValue();
  var emailBaris = sheet.getRange(baris, kolomEmail).getValue();
  if (!timestampBaris || !emailBaris) return;

  var kunci = kunciStatusLamaran_(timestampBaris, emailBaris);
  simpanStatusLamaran_(e.source.getId(), kunci, e.range.getValue());
}

// ---- Pembantu Status Lamaran (baca/tulis ke sheet tersembunyi) ----

function ambilSheetStatusLamaran_(ss) {
  var sheet = ss.getSheetByName(NAMA_SHEET_STATUS_LAMARAN);
  if (!sheet) {
    sheet = ss.insertSheet(NAMA_SHEET_STATUS_LAMARAN);
    sheet.getRange(1, 1, 1, 3)
        .setValues([['Kunci (Timestamp + Email)', 'Status Lamaran', 'Terakhir Diubah']])
        .setFontWeight('bold');
    sheet.hideSheet();
  }
  return sheet;
}

// Kunci unik per pelamar, dari Timestamp (dikonversi ke angka epoch ms,
// supaya tidak bergantung format tanggal/zona waktu tampilan) digabung
// Email. Dua duanya sudah pasti ada di tiap baris (Timestamp otomatis dari
// Google Forms, Email wajib lewat login terverifikasi).
function kunciStatusLamaran_(timestampValue, email) {
  var ms = (timestampValue instanceof Date) ? timestampValue.getTime() : String(timestampValue);
  return ms + '||' + String(email || '').trim().toLowerCase();
}

function bacaPetaStatusLamaran_(sheetStatus) {
  var jumlahBaris = Math.max(sheetStatus.getLastRow() - 1, 0);
  var peta = {};
  if (jumlahBaris > 0) {
    var data = sheetStatus.getRange(2, 1, jumlahBaris, 2).getValues();
    data.forEach(function (baris, i) {
      if (baris[0]) peta[baris[0]] = { status: baris[1], baris: i + 2 };
    });
  }
  return peta;
}

function simpanStatusLamaran_(spreadsheetId, kunci, statusBaru) {
  var ss = SpreadsheetApp.openById(spreadsheetId);
  var sheetStatus = ambilSheetStatusLamaran_(ss);
  var peta = bacaPetaStatusLamaran_(sheetStatus);
  var ada = peta[kunci];
  if (ada) {
    sheetStatus.getRange(ada.baris, 2, 1, 2).setValues([[statusBaru, new Date()]]);
  } else {
    sheetStatus.appendRow([kunci, statusBaru, new Date()]);
  }
}

// ---- Pembantu Catatan Otomatis Sistem (kelengkapan) + Lapis 1 (duplikat) ----

/**
 * PERUBAHAN (21 Sep 2026): deteksi dobel sekarang dicocokkan lewat 3
 * identitas sekaligus (Email + Nomor WhatsApp Aktif + NIM khusus untuk
 * Alumni), BUKAN cuma Email seperti sebelumnya, dan BUKAN nomor KTP/NIK
 * (sengaja dihindari karena UU PDP). Dua baris dianggap pelamar yang sama
 * untuk Kode Lowongan yang sama kalau SALAH SATU dari tiga identitas itu
 * cocok. Dari tiap kelompok yang cocok, submission PALING AWAL (Timestamp
 * paling kecil) dianggap yang sah/asli, submission berikutnya yang
 * ditandai duplikat (kena penalti skor, lihat hitungSkorPrioritas_),
 * supaya bukan submission pertamanya yang malah dirugikan.
 *
 * Return: objek { indexDiArrayData: true, ... } berisi index baris (di
 * array `data` utuh) mana saja yang berstatus duplikat.
 */
function bangunPetaDuplikat_(data, konteks) {
  var grup = {};
  function tambah(tipe, kode, nilaiMentah, i) {
    var nilai = String(nilaiMentah || '').trim().toLowerCase();
    if (!nilai || !kode) return;
    var kunci = tipe + '||' + kode + '||' + nilai;
    if (!grup[kunci]) grup[kunci] = [];
    grup[kunci].push(i);
  }

  data.forEach(function (baris, i) {
    var kode = ekstrakKodeLowongan_(baris[konteks.idxPosisi]);
    if (konteks.idxEmail !== -1) tambah('email', kode, baris[konteks.idxEmail], i);
    if (konteks.idxWA !== -1) tambah('wa', kode, normalisasiWA_(baris[konteks.idxWA]), i);
    var alumni = konteks.idxAlumni !== -1 ? baris[konteks.idxAlumni] : '';
    if (alumni === 'Ya' && konteks.idxNIM !== -1) tambah('nim', kode, baris[konteks.idxNIM], i);
  });

  var indexDuplikat = {};
  Object.keys(grup).forEach(function (kunci) {
    var daftarIndex = grup[kunci];
    if (daftarIndex.length < 2) return;

    var indexPalingAwal = daftarIndex[0];
    daftarIndex.forEach(function (i) {
      var tsIni = konteks.idxTimestamp !== -1 ? data[i][konteks.idxTimestamp] : 0;
      var tsAwal = konteks.idxTimestamp !== -1 ? data[indexPalingAwal][konteks.idxTimestamp] : 0;
      if (tsIni < tsAwal) indexPalingAwal = i;
    });
    daftarIndex.forEach(function (i) {
      if (i !== indexPalingAwal) indexDuplikat[i] = true;
    });
  });

  return indexDuplikat;
}

/**
 * Ubah isi sel kolom "Unggah CV (pdf)" (berisi satu atau beberapa URL
 * Drive, dipisah koma kalau lebih dari satu file) jadi RichTextValue
 * dengan tautan yang bisa diklik. Ini dipakai karena tampilan "smart
 * chip" bulat khas Sheets adalah fitur render bawaan yang tidak bisa
 * dipaksa lewat Apps Script; RichTextValue + setLinkUrl adalah cara paling
 * dekat dan PALING konsisten yang bisa dijamin lewat kode (tautan biru
 * bergaris bawah, bisa diklik, dan tetap memicu pratinjau hover Drive
 * bawaan Sheets), meski bentuk visualnya bukan pil/chip bulat persis.
 * Selalu mengembalikan RichTextValue (tidak pernah null), supaya aman
 * dipakai langsung di setRichTextValues() untuk seluruh kolom sekaligus.
 */
function buatRichTextCV_(nilaiSel) {
  var daftarLink = String(nilaiSel || '')
      .split(',')
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s; });

  if (!daftarLink.length) {
    return SpreadsheetApp.newRichTextValue().setText('').build();
  }

  if (daftarLink.length === 1) {
    var teksTunggal = 'Lihat CV';
    return SpreadsheetApp.newRichTextValue()
        .setText(teksTunggal)
        .setLinkUrl(0, teksTunggal.length, daftarLink[0])
        .build();
  }

  var label = daftarLink.map(function (_, idx) { return 'CV ' + (idx + 1); });
  var teksGabung = label.join(' | ');
  var builder = SpreadsheetApp.newRichTextValue().setText(teksGabung);
  var posisi = 0;
  label.forEach(function (satuLabel, idx) {
    builder.setLinkUrl(posisi, posisi + satuLabel.length, daftarLink[idx]);
    posisi += satuLabel.length + 3; // panjang ' | ' pemisah antar label
  });
  return builder.build();
}

function buatCatatanOtomatis_(baris, i, konteks) {
  var catatan = [];

  var kurang = [];
  if (konteks.idxNama !== -1 && !baris[konteks.idxNama]) kurang.push('Nama Lengkap');
  if (konteks.idxWA !== -1 && !baris[konteks.idxWA]) kurang.push('Nomor WhatsApp');
  if (konteks.idxCV !== -1 && !baris[konteks.idxCV]) kurang.push('CV');
  var alumni = konteks.idxAlumni !== -1 ? baris[konteks.idxAlumni] : '';
  if (alumni === 'Ya') {
    if (konteks.idxNIM !== -1 && !baris[konteks.idxNIM]) kurang.push('NIM');
    if (konteks.idxIPK !== -1 && !baris[konteks.idxIPK]) kurang.push('IPK (wajib untuk Alumni)');
  }
  if (konteks.idxProdi !== -1 && baris[konteks.idxProdi] === NILAI_PRODI_LAINNYA &&
      konteks.idxProdiLainnya !== -1 && !baris[konteks.idxProdiLainnya]) {
    kurang.push('Program Studi Lainnya (dipilih "Lainnya" tapi belum dituliskan manual)');
  }
  if (konteks.idxFakultas !== -1 && baris[konteks.idxFakultas] === NILAI_FAKULTAS_LAINNYA &&
      konteks.idxFakultasLainnya !== -1 && !baris[konteks.idxFakultasLainnya]) {
    kurang.push('Fakultas Lainnya (dipilih "Lainnya" tapi belum dituliskan manual)');
  }
  if (kurang.length) catatan.push('Data belum lengkap (' + kurang.join(', ') + ')');

  if (konteks.indexDuplikat[i]) {
    catatan.push('Duplikat, pernah melamar posisi ini sebelumnya');
  }

  return catatan.join('; ');
}

/**
 * Inti Bagian D. Untuk SATU Spreadsheet Pelamar: pastikan tab "Rekap per
 * Lowongan" ada (dibuat kalau belum), perbarui daftar pilihan dropdown
 * Kode Lowongan supaya mencakup semua kode yang pernah muncul di data
 * pelamar, lalu tulis ulang tabel hasil filter sesuai kode yang SEDANG
 * terpilih di dropdown itu sekarang. Idempotent, aman dipanggil berkali
 * kali (dipanggil dari setup awal, trigger submit realtime, trigger
 * jam-an, dan trigger onEdit dropdown).
 */
function perbaruiRekapPelamar_(spreadsheetId) {
  var ss = SpreadsheetApp.openById(spreadsheetId);
  var sheetRekap = ss.getSheetByName(NAMA_SHEET_REKAP_PELAMAR);
  if (!sheetRekap) sheetRekap = buatSheetRekapPelamar_(ss);

  var sheetPelamar = cariSheetDenganKolom(ss, JUDUL_ITEM_POSISI);
  var kolomPosisi = getKolomIndex(sheetPelamar, JUDUL_ITEM_POSISI);
  var jumlahKolomAsli = sheetPelamar.getLastColumn();
  var jumlahBarisData = Math.max(sheetPelamar.getLastRow() - 1, 0);

  var header = sheetPelamar.getRange(1, 1, 1, jumlahKolomAsli).getValues()[0];
  var data = jumlahBarisData > 0 ? sheetPelamar.getRange(2, 1, jumlahBarisData, jumlahKolomAsli).getValues() : [];

  // ---- Kumpulkan Kode Lowongan unik yang pernah muncul, untuk isi dropdown ----
  var daftarKodeSet = {};
  data.forEach(function (baris) {
    var kode = ekstrakKodeLowongan_(baris[kolomPosisi - 1]);
    if (kode) daftarKodeSet[kode] = true;
  });
  var daftarKode = Object.keys(daftarKodeSet).sort();

  var selDropdown = sheetRekap.getRange(SEL_DROPDOWN_REKAP);
  if (daftarKode.length) {
    selDropdown.setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(daftarKode, true).setAllowInvalid(false).build()
    );
  } else {
    selDropdown.clearDataValidations();
  }

  // ---- Siapkan konteks Catatan Otomatis Sistem + Skor Prioritas ----
  var konteks = {
    idxTimestamp: header.indexOf('Timestamp'),
    idxEmail: header.indexOf('Email Address'),
    idxNama: header.indexOf('Nama Lengkap'),
    idxWA: header.indexOf('Nomor WhatsApp Aktif'),
    idxCV: cariIndexKolomCV_(header),
    idxAlumni: header.indexOf('Apakah Anda Alumni UNPRI?'),
    idxFakultas: header.indexOf(JUDUL_ITEM_FAKULTAS),
    idxFakultasLainnya: header.indexOf(JUDUL_ITEM_FAKULTAS_LAINNYA),
    idxProdi: header.indexOf(JUDUL_ITEM_PRODI),
    idxProdiLainnya: header.indexOf(JUDUL_ITEM_PRODI_LAINNYA),
    idxIPK: header.indexOf(JUDUL_ITEM_IPK),
    idxNIM: header.indexOf('NIM'),
    idxPosisi: kolomPosisi - 1
  };
  konteks.indexDuplikat = bangunPetaDuplikat_(data, konteks);

  // ---- Peta Status Lamaran yang sudah pernah diisi RS sebelumnya ----
  var sheetStatus = ambilSheetStatusLamaran_(ss);
  var petaStatus = bacaPetaStatusLamaran_(sheetStatus);

  // ---- Data lowongan yang SEDANG terpilih (sekali saja per refresh, bukan per baris) ----
  var kodeTerpilih = selDropdown.getValue();
  var dataLowongan = ambilDataLowongan_(kodeTerpilih);

  // ---- Filter baris sesuai kode yang SEDANG terpilih, sambil bawa index aslinya ----
  // (index asli di array `data` utuh dibutuhkan konteks.indexDuplikat, karena
  // duplikat dideteksi lintas SELURUH data, bukan cuma yang lolos filter.)
  var hasilDenganIndex = [];
  data.forEach(function (baris, i) {
    if (ekstrakKodeLowongan_(baris[konteks.idxPosisi]) === kodeTerpilih) {
      hasilDenganIndex.push({ baris: baris, i: i });
    }
  });

  // Urutan kolom tabel hasil (PERUBAHAN 22 Sep 2026, supaya freeze panes
  // cuma mencakup yang esensial): Skor Prioritas, Status Lamaran, Nama
  // Lengkap ditaruh PALING DEPAN (tiga ini saja yang di-freeze, lihat
  // setFrozenColumns di bawah). Timestamp SENGAJA digeser ke paling
  // UJUNG (bukan lagi di depan), karena urutan tabel ini sudah dipakai
  // untuk sort by Skor Prioritas, jadi Timestamp tidak lagi krusial
  // untuk selalu terlihat. Kolom asli lain (Email Address, Kode
  // Lowongan lama kalau masih ada, Nomor WhatsApp Aktif, dst., MINUS
  // Nama Lengkap dan Timestamp yang sudah dipindah) tetap urut seperti
  // header asli Form Responses. Catatan Otomatis Sistem dan Rincian
  // Skor (teks penjelasan panjang) tetap di ujung, sebelum Timestamp.
  // Index kolom asli (dari `header`), MINUS Nama Lengkap dan Timestamp
  // (dua duanya ditangani terpisah), urutan aslinya tetap dipertahankan.
  var kolomSisaDariHeader = header
      .map(function (_, idx) { return idx; })
      .filter(function (idx) { return idx !== konteks.idxNama && idx !== konteks.idxTimestamp; });

  var jumlahKolomTabel = jumlahKolomAsli + 4; // + Skor Prioritas + Status Lamaran + Catatan Otomatis Sistem + Rincian Skor
  var barisHasilDenganSkor = hasilDenganIndex.map(function (item) {
    var baris = item.baris, i = item.i;
    var catatan = buatCatatanOtomatis_(baris, i, konteks);
    var kunci = (konteks.idxTimestamp !== -1 && konteks.idxEmail !== -1)
        ? kunciStatusLamaran_(baris[konteks.idxTimestamp], baris[konteks.idxEmail])
        : null;
    var status = (kunci && petaStatus[kunci]) ? petaStatus[kunci].status : STATUS_LAMARAN_DEFAULT;
    var skorInfo = hitungSkorPrioritas_(baris, i, konteks, dataLowongan);
    var namaLengkap = konteks.idxNama !== -1 ? baris[konteks.idxNama] : '';
    var timestampBelakang = konteks.idxTimestamp !== -1 ? baris[konteks.idxTimestamp] : '';
    var sisaKolomAsli = kolomSisaDariHeader.map(function (idx) { return baris[idx]; });
    return {
      baris: [skorInfo.skor, status, namaLengkap]
          .concat(sisaKolomAsli)
          .concat([catatan, skorInfo.rincian, timestampBelakang]),
      skor: skorInfo.skor
    };
  });

  // Urutkan pelamar dari Skor Prioritas TERTINGGI ke TERENDAH, supaya RS
  // langsung lihat kandidat yang paling relevan/lengkap di paling atas,
  // tanpa perlu Sort manual.
  barisHasilDenganSkor.sort(function (a, b) { return b.skor - a.skor; });
  var barisHasil = barisHasilDenganSkor.map(function (item) { return item.baris; });

  // Bersihkan tabel hasil yang lama dulu, supaya kalau hasil filter baru
  // lebih pendek/lebih sempit dari sebelumnya, tidak ada baris atau kolom
  // sisa yang nyangkut. clearDataValidations() SENGAJA ikut dipanggil di
  // sini (bukan cuma clearContent), karena kolom tabel ini beberapa kali
  // bergeser posisi (Status Lamaran pernah di ujung kanan, sekarang di
  // kolom 2), dan clearContent() TIDAK menghapus validasi dropdown lama
  // yang masih menempel di sel dari posisi kolom sebelumnya. Kalau
  // dibiarkan, sel yang dulu jadi tempat dropdown Status Lamaran tapi
  // sekarang jadi kolom lain (misalnya Catatan Otomatis Sistem) akan
  // menolak ditulisi teks bebas karena masih terkunci validasi dropdown
  // lama, persis error "violates the data validation rules" yang pernah
  // muncul. clearFormat() SENGAJA juga ikut dipanggil (bukan cuma
  // clearContent + clearDataValidations), karena ketiganya independen di
  // Apps Script, clearContent() TIDAK menghapus format angka lama. Kolom
  // paling depan (sekarang Skor Prioritas) pernah jadi tempat Timestamp
  // (format Date) di posisi kolom sebelumnya, jadi kalau formatnya tidak
  // ikut dibersihkan, angka Skor Prioritas yang baru ditulis di situ
  // (termasuk 0 dan angka negatif) ikut dibaca sebagai serial tanggal dan
  // tampil sebagai "12/30/1899" dst, bukan angka biasa.
  var totalBarisSheet = sheetRekap.getMaxRows();
  var totalKolomSheet = Math.max(sheetRekap.getMaxColumns(), jumlahKolomTabel);
  if (totalBarisSheet >= BARIS_AWAL_TABEL_REKAP) {
    var rangeBersih = sheetRekap.getRange(BARIS_AWAL_TABEL_REKAP, 1, totalBarisSheet - BARIS_AWAL_TABEL_REKAP + 1, totalKolomSheet);
    rangeBersih.clearContent();
    rangeBersih.clearDataValidations();
    rangeBersih.clearFormat();
  }

  var namaLengkapHeader = konteks.idxNama !== -1 ? header[konteks.idxNama] : 'Nama Lengkap';
  var timestampHeader = konteks.idxTimestamp !== -1 ? header[konteks.idxTimestamp] : 'Timestamp';
  var sisaHeaderAsli = kolomSisaDariHeader.map(function (idx) { return header[idx]; });
  var headerTabel = ['Skor Prioritas', JUDUL_KOLOM_STATUS_LAMARAN, namaLengkapHeader]
      .concat(sisaHeaderAsli)
      .concat([JUDUL_KOLOM_CATATAN_OTOMATIS, 'Rincian Skor', timestampHeader]);
  sheetRekap.getRange(BARIS_AWAL_TABEL_REKAP, 1, 1, jumlahKolomTabel)
      .setValues([headerTabel])
      .setFontWeight('bold')
      .setBackground('#f3f3f3');

  // Posisi kolom dicari lewat nama header (bukan angka tetap), sama
  // seperti prinsip di seluruh file ini, supaya tidak gampang rusak kalau
  // urutan kolom berubah lagi nanti.
  var kolomSkorPrioritas = headerTabel.indexOf('Skor Prioritas') + 1;
  var kolomStatusLamaran = headerTabel.indexOf(JUDUL_KOLOM_STATUS_LAMARAN) + 1;
  var kolomNamaLengkap = headerTabel.indexOf(namaLengkapHeader) + 1;
  // Posisi kolom CV dihitung dari urutan kolomSisaDariHeader (bukan lewat
  // headerTabel.indexOf teks judul), supaya tetap benar walau ada judul
  // kolom lain yang kebetulan sama persis.
  var kolomCV = konteks.idxCV !== -1 ? kolomSisaDariHeader.indexOf(konteks.idxCV) + 4 : -1;

  // Freeze cuma sampai kolom Nama Lengkap (Skor Prioritas, Status
  // Lamaran, Nama Lengkap saja), sengaja dibatasi ke yang esensial saja
  // supaya tidak memakan terlalu banyak lebar layar RS. Timestamp
  // SENGAJA tidak ikut di-freeze, sudah dipindah ke ujung tabel (lihat
  // catatan di atas jumlahKolomTabel), karena urutan baris sudah
  // ditentukan lewat sort Skor Prioritas, bukan lagi Timestamp.
  if (kolomNamaLengkap > 0) sheetRekap.setFrozenColumns(kolomNamaLengkap);

  // Warna latar sel Skor Prioritas (hijau = skor kuat, kuning = netral,
  // merah = skor negatif), sekadar sinyal bantu sekilas pandang, BUKAN
  // keputusan Lanjut/Ditolak yang tegas, RS tetap yang menimbang lewat
  // Rincian Skor dan Status Lamaran. Dibersihkan dan dipasang ulang tiap
  // refresh, supaya tetap benar kalau posisi kolom ini berubah lagi nanti.
  sheetRekap.clearConditionalFormatRules();
  var rangeWarnaSkor = sheetRekap.getRange(BARIS_AWAL_TABEL_REKAP + 1, kolomSkorPrioritas, 1000, 1);
  sheetRekap.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
        .whenNumberGreaterThanOrEqualTo(15)
        .setBackground('#d9ead3') // hijau muda: skor kuat
        .setRanges([rangeWarnaSkor])
        .build(),
    SpreadsheetApp.newConditionalFormatRule()
        .whenNumberBetween(0, 14)
        .setBackground('#fff2cc') // kuning muda: netral/borderline
        .setRanges([rangeWarnaSkor])
        .build(),
    SpreadsheetApp.newConditionalFormatRule()
        .whenNumberLessThan(0)
        .setBackground('#f4cccc') // merah muda: skor negatif
        .setRanges([rangeWarnaSkor])
        .build()
  ]);

  if (barisHasil.length) {
    sheetRekap.getRange(BARIS_AWAL_TABEL_REKAP + 1, 1, barisHasil.length, jumlahKolomTabel).setValues(barisHasil);
    sheetRekap.getRange(BARIS_AWAL_TABEL_REKAP + 1, kolomStatusLamaran, barisHasil.length, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(DAFTAR_STATUS_LAMARAN, true).setAllowInvalid(false).build()
    );

    // Lapis kedua jaga-jaga selain clearFormat() di atas: kunci eksplisit
    // kolom Skor Prioritas sebagai format angka biasa, supaya tidak
    // pernah lagi kebaca sebagai tanggal walau suatu saat clearFormat()
    // di atas terlewat/berubah.
    sheetRekap.getRange(BARIS_AWAL_TABEL_REKAP + 1, kolomSkorPrioritas, barisHasil.length, 1).setNumberFormat('0');

    // Ubah kolom Unggah CV (pdf) jadi tautan yang bisa diklik langsung
    // (RichTextValue + setLinkUrl), supaya render nya konsisten untuk RS,
    // tidak tergantung smart chip otomatis Sheets yang tidak bisa dipaksa
    // lewat Apps Script. Kalau satu sel berisi lebih dari satu file
    // (dipisah koma, kasus multi upload), tiap file dapat label sendiri
    // "CV 1 | CV 2" dst; kalau cuma satu file, labelnya "Lihat CV".
    if (kolomCV > 0) {
      var richTextCV = barisHasil.map(function (baris) {
        return [buatRichTextCV_(baris[kolomCV - 1])];
      });
      sheetRekap.getRange(BARIS_AWAL_TABEL_REKAP + 1, kolomCV, barisHasil.length, 1).setRichTextValues(richTextCV);
    }
  }

  sheetRekap.getRange('A2').setValue(
    kodeTerpilih
      ? ('Menampilkan ' + barisHasil.length + ' pelamar untuk Kode Lowongan "' + kodeTerpilih + '", diurutkan dari Skor Prioritas tertinggi.')
      : 'Pilih Kode Lowongan di sel B1 untuk melihat daftar pelamarnya di sini.'
  );
}

function buatSheetRekapPelamar_(ss) {
  var sheet = ss.insertSheet(NAMA_SHEET_REKAP_PELAMAR, 0); // taruh di tab paling depan, langsung terlihat
  sheet.getRange('A1').setValue('Pilih Kode Lowongan:').setFontWeight('bold');
  sheet.getRange('A2').setValue('Pilih Kode Lowongan di sel B1 untuk melihat daftar pelamarnya di sini.');
  sheet.setFrozenRows(BARIS_AWAL_TABEL_REKAP);
  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 220);
  return sheet;
}

// ===== Pembantu umum =====

// Cari kolom berdasarkan teks header, bukan posisi tetap. Prinsip yang sama
// dengan pencocokan Item ID di Bagian 1, supaya tidak gampang rusak kalau
// urutan atau posisi kolom sedikit berubah.
function getKolomIndex(sheet, namaHeader) {
  var headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idx = headerRow.indexOf(namaHeader);
  if (idx === -1) {
    throw new Error('Kolom "' + namaHeader + '" tidak ditemukan di sheet ' + sheet.getName());
  }
  return idx + 1;
}

function cariSheetDenganKolom(spreadsheet, namaHeader) {
  var semuaSheet = spreadsheet.getSheets();
  for (var i = 0; i < semuaSheet.length; i++) {
    var header = semuaSheet[i].getRange(1, 1, 1, semuaSheet[i].getLastColumn()).getValues()[0];
    if (header.indexOf(namaHeader) !== -1) return semuaSheet[i];
  }
  throw new Error('Tidak ada sheet dengan kolom "' + namaHeader + '" di spreadsheet ' + spreadsheet.getId());
}
