/**
 * SISTEM REKRUTMEN TERPADU PRIMA GROUP (CEDC UNPRI) - Config.gs
 * ============================================================
 * Semua pengaturan, ID, nama kolom, dan fungsi bantu bersama ada di file
 * ini. File lain tidak boleh menyalin ulang nilai di sini.
 *
 * Susunan project (v5, dirapikan 9 Okt 2026):
 *   Config.gs    pengaturan + fungsi bantu bersama (file ini)
 *   Code.gs      Lapis 1: Web App RS + Form Permintaan -> Master Permintaan
 *   Lowongan.gs  Lapis 2: Master Permintaan <-> Form Pendaftaran Pelamar,
 *                jumlah pendaftar/diterima, auto-flag, trigger, cek sistem
 *   Rekap.gs     Lapis 3: tab "Rekap per Lowongan", Skor Prioritas,
 *                Status Lamaran
 *   Index.html   tampilan Web App RS
 *
 * Riwayat perubahan lengkap ada di dokumen referensi project
 * (sistem-rekrutmen-prima-group.md) dan repo GitHub, tidak lagi ditulis
 * di dalam kode.
 *
 * Fungsi yang dipanggil trigger/Web App (NAMANYA JANGAN DIUBAH):
 *   doGet, buatLinkFormLanjutan, ambilLinkRekapPelamar, isiMasterPermintaan,
 *   onEditMasterPermintaan, onSubmitPelamarBaru, hitungUlangJumlahPendaftar,
 *   autoFlagStatusLowongan, onEditRekapPelamar
 */

// ===== Spreadsheet Master & Form Permintaan (ID disimpan di Script Properties) =====
var PROP_MASTER_SS_ID = 'MASTER_SS_ID';
var PROP_FORM_PERMINTAAN_ID = 'FORM_ID';

var SHEET_MASTER = 'Master Permintaan';
var SHEET_STAGING = 'Staging Web (mentah)';

// Nama header kolom Master Permintaan. Kolom SELALU dicari lewat nama ini,
// tidak pernah lewat nomor kolom, jadi urutan kolom di sheet boleh berubah.
var KOLOM = {
  KODE: 'Kode Lowongan',
  TANGGAL: 'Tanggal Masuk',
  UNIT: 'Unit RS',
  POSISI: 'Posisi',
  KEBUTUHAN: 'Jumlah Kebutuhan',
  KUALIFIKASI: 'Kualifikasi',
  IPK_MIN: 'IPK Minimal',
  PRODI_REL: 'Program Studi Relevan',
  FAKULTAS_REL: 'Fakultas Relevan',
  DEADLINE: 'Deadline',
  TAG: 'Tag Campus Hiring',
  DOKUMEN: 'Tautan Dokumen',
  PIC: 'PIC Pengaju',
  EMAIL_PIC: 'Email PIC (terverifikasi)',
  STATUS: 'Status',
  PENDAFTAR: 'Jumlah Pendaftar',
  CATATAN: 'Catatan CEDC',
  LINK_DAFTAR: 'Link Pendaftaran',
  LINK_REKAP: 'Link Rekap Pelamar',
  DITERIMA: 'Jumlah Diterima'
};

var STATUS = {
  DITERIMA: 'Diterima',
  DIPROSES: 'Diproses',
  DIPUBLIKASIKAN: 'Dipublikasikan',
  DITUTUP: 'Ditutup',
  PERLU_DICEK: 'Perlu Dicek'
};
var DAFTAR_STATUS = [STATUS.DITERIMA, STATUS.DIPROSES, STATUS.DIPUBLIKASIKAN, STATUS.DITUTUP, STATUS.PERLU_DICEK];

// ===== Staging Web (penampung data Web App sebelum Form Permintaan disubmit) =====
var STAGING_MENUNGGU = 'Menunggu Form';
var STAGING_BATAS_JAM = 48; // staging lebih tua dari ini dianggap basi, tidak dipakai lagi

// ===== Judul pertanyaan Form Permintaan Tenaga Kerja (Lapis 1) =====
var JUDUL_UNIT_RS = 'Unit RS';
var JUDUL_DOKUMEN = 'Unggah Dokumen Pendukung (Surat Permintaan Resmi)';
var JUDUL_PIC = 'Nama PIC Pengaju';
var NILAI_TAG_CAMPUS = 'Pengajuan untuk Campus Hiring';

// ===== Konfigurasi per Unit RS =====
// Cukup ID file. Pertanyaan di dalam Form dicari lewat JUDUL, bukan Item ID,
// jadi tidak ada lagi angka ID yang harus dicatat manual.
var DAFTAR_UNIT_RS = [
  {
    nama: 'RS Royal Prima',
    prefixKode: 'RP',
    formId: '1sJqiTXcBXHbX3M3FoOldlqhOLhBVVvcopNPzg-RXFsk',
    spreadsheetPelamarId: '1TyUlYv07-Pg74c6yegvPAyfc9mlS7K1b_bWPnny5Ir4',
    emailPicRS: 'sdm@royalprima.com'
  },
  {
    nama: 'RS Royal Prima Marelan',
    prefixKode: 'RPM',
    formId: '11_b0anwlRCJ7M623uTMf9lFiLDx0nlxHfFjEovATNu4',
    spreadsheetPelamarId: '1d058_txHn3Zt0hSm0E1P_7xWVmoa_dnXKR1jQh321Sc',
    emailPicRS: 'azzahrasufina@gmail.com'
  }
];

// "...Marelan..." = Royal Prima Marelan, selain itu Royal Prima. Menerima
// "RS Royal Prima Marelan" (Master Permintaan) maupun "Royal Prima Marelan".
function unitRS_(nama) {
  return String(nama).indexOf('Marelan') !== -1 ? DAFTAR_UNIT_RS[1] : DAFTAR_UNIT_RS[0];
}

// ===== Form Pendaftaran Pelamar (Lapis 2) =====
var JUDUL_POSISI = 'Posisi yang Dilamar';
var PLACEHOLDER_BELUM_ADA_POSISI = '(Belum ada posisi dibuka saat ini, hubungi CEDC)';
var JUDUL_PRODI = 'Program Studi';
var JUDUL_PRODI_LAINNYA = 'Program Studi Lainnya (tuliskan manual, isi HANYA jika pilih "Program Studi Saya Tidak Ada di Daftar Ini (Lainnya)" di atas)';
var JUDUL_FAKULTAS = 'Fakultas';
var JUDUL_FAKULTAS_LAINNYA = 'Fakultas Lainnya (tuliskan manual, isi HANYA jika pilih "Fakultas Saya Tidak Ada di Daftar Ini (Lainnya)" di atas)';
var JUDUL_IPK = 'IPK';
var JUDUL_ALUMNI = 'Apakah Anda Alumni UNPRI?';
var NILAI_PRODI_LAINNYA = 'Program Studi Saya Tidak Ada di Daftar Ini (Lainnya)';
var NILAI_FAKULTAS_LAINNYA = 'Fakultas Saya Tidak Ada di Daftar Ini (Lainnya)';

// ===== Tab Rekap per Lowongan (Lapis 3, di tiap Spreadsheet Pelamar) =====
var SHEET_REKAP = 'Rekap per Lowongan';
var SEL_DROPDOWN_REKAP = 'B1';
var BARIS_HEADER_REKAP = 3;
var SHEET_STATUS_LAMARAN = 'Status Lamaran (data)'; // sheet tersembunyi, jangan dihapus
var JUDUL_STATUS_LAMARAN = 'Status Lamaran';
var JUDUL_CATATAN_OTOMATIS = 'Catatan Otomatis Sistem';
var DAFTAR_STATUS_LAMARAN = ['Belum Direview', 'Dipanggil Interview', 'Diterima', 'Ditolak'];
var STATUS_LAMARAN_DEFAULT = DAFTAR_STATUS_LAMARAN[0];
var STATUS_LAMARAN_DITERIMA = 'Diterima';

// ===== Auto-flag harian =====
var JAM_AUTO_FLAG = 1; // sekitar 01.00, zona waktu project

/**
 * Katalog Program Studi UNPRI T.A. 2026/2027 (52 program studi, 9 fakultas).
 * SATU-SATUNYA sumber: dipakai Skor Prioritas di Rekap.gs DAN dikirim ke
 * Index.html saat Web App dibuka (lihat doGet), jadi tidak ada salinan kedua.
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

// ============================================================
// FUNGSI BANTU BERSAMA
// ============================================================

function propWajib_(nama) {
  var nilai = PropertiesService.getScriptProperties().getProperty(nama);
  if (!nilai) throw new Error('Script Property "' + nama + '" kosong. Cek Project Settings > Script Properties.');
  return nilai;
}

function bukaSpreadsheetMaster_() {
  return SpreadsheetApp.openById(propWajib_(PROP_MASTER_SS_ID));
}

function bukaSheet_(ss, nama) {
  var sheet = ss.getSheetByName(nama);
  if (!sheet) throw new Error('Sheet "' + nama + '" tidak ditemukan di "' + ss.getName() + '".');
  return sheet;
}

function bukaSheetMaster_() {
  return bukaSheet_(bukaSpreadsheetMaster_(), SHEET_MASTER);
}

/**
 * Baca satu sheet sekaligus: header, peta kolom (nama -> index 0-based, -1
 * kalau tidak ada), dan semua baris data. Dipakai di mana pun sebuah sheet
 * perlu dibaca, supaya pencarian kolom selalu lewat nama header.
 */
function bacaTabel_(sheet) {
  var jumlahKolom = Math.max(sheet.getLastColumn(), 1);
  var header = sheet.getRange(1, 1, 1, jumlahKolom).getValues()[0];
  var jumlahBaris = Math.max(sheet.getLastRow() - 1, 0);
  var data = jumlahBaris ? sheet.getRange(2, 1, jumlahBaris, jumlahKolom).getValues() : [];
  return { sheet: sheet, header: header, data: data, idx: function (nama) { return indexHeader_(header, nama); } };
}

// Pencocokan judul tahan spasi dan huruf besar/kecil, karena beberapa
// pertanyaan Form dibuat manual lewat UI dan pernah kesisipan spasi.
function samaJudul_(a, b) {
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

function indexHeader_(header, nama) {
  for (var i = 0; i < header.length; i++) {
    if (samaJudul_(header[i], nama)) return i;
  }
  return -1;
}

function kolomWajib_(tabel, nama) {
  var i = tabel.idx(nama);
  if (i === -1) throw new Error('Kolom "' + nama + '" tidak ditemukan di sheet "' + tabel.sheet.getName() + '".');
  return i;
}

// Tulis satu kolom penuh (baris 2 sampai akhir data) dalam SATU panggilan,
// bukan sel per sel. Index kolom 0-based.
function tulisKolom_(tabel, idxKolom, nilai) {
  if (idxKolom === -1 || !nilai.length) return;
  tabel.sheet.getRange(2, idxKolom + 1, nilai.length, 1).setValues(nilai.map(function (v) { return [v]; }));
}

function cariItemForm_(form, judul) {
  var items = form.getItems();
  for (var i = 0; i < items.length; i++) {
    if (samaJudul_(items[i].getTitle(), judul)) return items[i];
  }
  return null;
}

// Sheet pertama di spreadsheet yang punya kolom berjudul `judul`.
function cariSheetDenganKolom_(ss, judul) {
  var semua = ss.getSheets();
  for (var i = 0; i < semua.length; i++) {
    var header = semua[i].getRange(1, 1, 1, Math.max(semua[i].getLastColumn(), 1)).getValues()[0];
    if (indexHeader_(header, judul) !== -1) return semua[i];
  }
  return null;
}

// "Perawat (RSP-RP-2026-003)" -> "RSP-RP-2026-003" (isi kurung paling belakang).
function ekstrakKodeLowongan_(jawabanPosisi) {
  var cocok = String(jawabanPosisi || '').match(/\(([^()]+)\)\s*$/);
  return cocok ? cocok[1].trim() : null;
}

function pecahDaftarKoma_(teks) {
  return String(teks || '').split(',').map(function (s) { return s.trim(); }).filter(String);
}

// Tanggal dari objek Date, "yyyy-mm-dd", atau "m/d/yyyy". null kalau tidak terbaca.
function bacaTanggal_(nilai) {
  if (nilai instanceof Date && !isNaN(nilai.getTime())) return awalHari_(nilai);
  var teks = String(nilai || '').trim();
  var m = teks.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = teks.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
  return null;
}

function awalHari_(tanggal) {
  return new Date(tanggal.getFullYear(), tanggal.getMonth(), tanggal.getDate());
}

// Bilangan bulat >= 1 dari angka/teks seperti 5 atau "5". null kalau bukan.
function bacaBilanganBulat_(nilai) {
  var teks = String(nilai === null || nilai === undefined ? '' : nilai).trim();
  if (!/^\d+$/.test(teks)) return null;
  var n = parseInt(teks, 10);
  return n >= 1 ? n : null;
}

/**
 * Jalankan fungsi dengan kunci project, supaya trigger yang menulis ke sheet
 * yang sama (jam-an, submit pelamar, auto-flag) tidak jalan bersamaan dan
 * saling menimpa.
 */
function denganKunci_(namaProses, fn) {
  var kunci = LockService.getScriptLock();
  if (!kunci.tryLock(30000)) {
    Logger.log(namaProses + ': dilewati, proses lain masih berjalan. Akan tertangani di jadwal berikutnya.');
    return;
  }
  try {
    return fn();
  } finally {
    kunci.releaseLock();
  }
}
