/**
 * FORM PERMINTAAN TENAGA KERJA - RS PRIMA GROUP (v4)
 * ============================================================
 * Pembagian tugas:
 *   - WEB APP: Unit RS, Deadline, Tag Campus Hiring, dan daftar posisi
 *     (tombol "+ Tambah Posisi" tanpa batas). Tidak perlu sign in.
 *   - GOOGLE FORM: hanya bagian identitas/administratif, yaitu Unit RS
 *     (otomatis terisi dari Web App, tinggal dikonfirmasi, TIDAK perlu
 *     diisi ulang), Email (wajib login akun Google, terverifikasi
 *     otomatis), Unggah Dokumen Pendukung (PDF), dan Nama PIC Pengaju.
 *     Deadline, Tag, dan daftar posisi TIDAK muncul lagi di Form.
 *
 * KENAPA UNIT RS TETAP MUNCUL DI FORM (BUKAN DIISI ULANG, HANYA
 * DIKONFIRMASI):
 *   Karena Deadline/Tag/daftar posisi disimpan dulu di sheet "Staging
 *   Web" saat submit dari Web App, dan baru digabungkan ke Master
 *   Permintaan saat Form disubmit, sistem perlu tahu baris staging
 *   mana yang cocok dengan submission Form yang mana. Unit RS dipakai
 *   sebagai kunci pencocokan itu. Ini penting karena Royal Prima dan
 *   Royal Prima Marelan kemungkinan mengisi berbarengan, jadi kalau
 *   tidak ada kunci pencocokan, posisi dari satu RS bisa salah
 *   tertaut ke submission RS lain. Nilainya sudah otomatis terisi
 *   dari Web App, jadi tidak dianggap "isi ulang", cuma ikut terbawa
 *   sebagai konfirmasi.
 *
 * FILE PROYEK YANG DIBUTUHKAN
 * ----------------------------
 *   - Code.gs   (file ini)
 *   - Index.html (sudah ada dari setup sebelumnya, tidak perlu diubah
 *                 kecuali label checkbox Campus Hiring)
 *
 * DUA LANGKAH MANUAL YANG TETAP DIPERLUKAN (keterbatasan Google, bukan
 * kode ini):
 *   1. Pertanyaan "File upload" harus ditambahkan manual lewat editor
 *      Form. Google Forms API/Apps Script tidak punya perintah untuk
 *      membuat pertanyaan tipe ini secara terprogram (dikonfirmasi
 *      lewat dokumentasi resminya).
 *   2. Setting "Collect email addresses" harus diubah manual ke
 *      "Verified" lewat Settings > Responses di editor Form.
 *      form.setCollectEmail(true) di Apps Script hanya menghasilkan
 *      mode "Responder input" (email diketik manual), bukan
 *      "Verified", sesuai yang terjadi saat dicoba.
 *
 * CARA MENJALANKAN
 * -----------------
 * 1. Timpa Code.gs dengan isi file ini.
 * 2. Jalankan fungsi "setupFormPermintaanRS", izinkan akses.
 * 3. Buka link edit Form dari Execution log, lalu:
 *      a. Add question > tipe "File upload" > judul persis:
 *         "Unggah Dokumen Pendukung (Surat Permintaan Resmi)" >
 *         wajib diisi > batasi ke PDF kalau mau.
 *      b. Settings (ikon gerigi) > Responses > Collect email addresses
 *         > pilih "Verified".
 * 4. Deploy > New deployment > Web app, Execute as Me, Who has access
 *    Anyone. Salin URL Web App, itu yang dibagikan ke HR RS.
 * 5. Jangan bagikan link Spreadsheet maupun link edit Form ke RS.
 *
 * Jalankan setupFormPermintaanRS() HANYA SEKALI per pembuatan Form baru.
 *
 * ------------------------------------------------------------------
 * PERBAIKAN (21 Sep 2026): fungsi isiMasterPermintaan(e) sebelumnya
 * membaca e.namedValues, padahal trigger-nya dipasang lewat
 * .forForm(form).onFormSubmit() (trigger di Form, bukan di
 * Spreadsheet). Untuk trigger jenis itu, event object HANYA berisi
 * e.response, tidak ada e.namedValues, sehingga selalu error
 * "Cannot read properties of undefined" begitu Form disubmit.
 * Sudah diganti untuk membaca jawaban lewat e.response.getItemResponses()
 * (sama seperti yang sudah dipakai ambilLinkDokumen), cocok dengan
 * jenis trigger yang terpasang.
 * ------------------------------------------------------------------
 * PERBAIKAN (22 Sep 2026): bug ditemukan langsung lewat uji coba nyata
 * (bukan cuma dibaca kodenya) oleh Ilman. Sebelumnya, daftar posisi dari
 * Web App dikirim sebagai SATU string, tiap posisi dipisah ENTER ('\n'),
 * dan tiap kolom dalam satu posisi dipisah TITIK-KOMA (';') lewat
 * buatLinkFormLanjutan, lalu dibelah balik dengan cara yang sama di
 * isiMasterPermintaan.
 *
 * MASALAHNYA: pemisah itu (enter dan titik-koma) bisa juga muncul secara
 * SAH di dalam isi field bebas seperti Kualifikasi (contoh nyata: RS
 * mengetik kualifikasi sebagai daftar bernomor dengan Enter di antara
 * tiap poin, bukan koma). Karena parser tidak bisa membedakan "enter di
 * dalam Kualifikasi" dari "enter yang memisahkan posisi", SATU posisi
 * dengan Kualifikasi multi-baris pecah jadi BEBERAPA baris salah di
 * Master Permintaan, dan kolom-kolom di baris terakhir ikut bergeser
 * (Program Studi Relevan nyasar ke kolom Kualifikasi, dst).
 *
 * PERBAIKAN: daftar posisi sekarang dikodekan sebagai JSON
 * (JSON.stringify di buatLinkFormLanjutan, JSON.parse di
 * isiMasterPermintaan lewat helper parseDaftarPosisiMentah_). JSON
 * otomatis meng-escape ENTER, TITIK-KOMA, KOMA, dan karakter apa pun
 * lain di dalam teks bebas, sehingga tidak mungkin lagi ketuker dengan
 * pemisah antar-posisi, seberapa pun kompleks isi Kualifikasi yang
 * diketik RS. parseDaftarPosisiMentah_ tetap bisa membaca format LAMA
 * (pemisah ';'/enter) sebagai fallback, cuma untuk jaga-jaga kalau ada
 * baris Staging Web lama yang masih berstatus "Menunggu Form" saat
 * perbaikan ini di-deploy (staging baru selalu memakai format JSON).
 *
 * TIDAK ADA langkah setup tambahan untuk mengaktifkan perbaikan ini,
 * cukup timpa Code.gs dengan isi file ini. Deploy ulang Web App (Deploy >
 * Manage deployments > edit deployment yang aktif > Version: New,
 * Deploy) supaya Web App yang dipakai RS memakai kode buatLinkFormLanjutan
 * yang baru.
 * ------------------------------------------------------------------
 * FITUR BARU (23 Sep 2026): "Master Gate" — Fase 1 dari rencana Web App
 * jadi satu pintu akses untuk RS (lihat Bagian 12 dokumen referensi
 * project). Begitu RS memilih Unit RS di Web App (dropdown yang sudah
 * ada), sekarang muncul tombol "Buka Rekap Pelamar" yang langsung
 * mengarah ke Spreadsheet Pelamar milik Unit RS itu, supaya RS tidak
 * perlu lagi mencari sendiri, dan CEDC tidak perlu manual bagikan
 * linknya satu-satu.
 *
 * Fungsi baru ambilLinkRekapPelamar(unitRS) di bawah ini memanggil
 * getKonfigurasiUnitRS() dan linkSpreadsheetPelamar_() yang SUDAH ADA
 * di Fase2_Bagian3_LinkOtomatis.gs (dipakai juga oleh alur Master
 * Permintaan -> kolom "Link Rekap Pelamar"). Ini AMAN dipanggil dari
 * file Code.gs meski definisinya ada di file lain, karena semua file
 * .gs dalam satu project Apps Script berbagi scope global yang sama
 * (bukan modul terpisah seperti Node.js). Konsekuensinya: fungsi ini
 * BARU BISA JALAN kalau Fase2_Bagian3_LinkOtomatis.gs versi yang sudah
 * berisi getKonfigurasiUnitRS/linkSpreadsheetPelamar_ juga sudah
 * ter-paste di project yang sama (sudah terpenuhi per 23 Sep 2026,
 * kedua fungsi itu sudah dipakai fitur lain yang sudah live).
 *
 * RS sudah otomatis Viewer di Spreadsheet Pelamar ini (lihat
 * bagikanFolderCVKeRS() di Fase2_Bagian3_LinkOtomatis.gs), jadi link ini
 * akan langsung bisa dibuka begitu RS login dengan akun Google yang
 * sudah di-share, tidak perlu langkah share tambahan.
 * ------------------------------------------------------------------
 */

var JUDUL_UNIT_RS = 'Unit RS';
var JUDUL_ITEM_DOKUMEN = 'Unggah Dokumen Pendukung (Surat Permintaan Resmi)';
var JUDUL_PIC = 'Nama PIC Pengaju';
var NILAI_TAG_CAMPUS = 'Pengajuan untuk Campus Hiring';

var NAMA_SHEET_MASTER = 'Master Permintaan';
var NAMA_SHEET_STAGING = 'Staging Web (mentah)';
var STATUS_MENUNGGU = 'Menunggu Form';

function setupFormPermintaanRS() {

  // ---------- 1. BUAT FORM (hanya bagian identitas/administratif) ----------
  var form = FormApp.create('Form Permintaan Tenaga Kerja - RS Prima Group');
  form.setDescription(
    'Form ini adalah langkah terakhir pengajuan kebutuhan tenaga kerja dari RS ' +
    'Prima Group ke CEDC UNPRI. Unit RS sudah terisi otomatis dari halaman ' +
    'sebelumnya, tinggal dikonfirmasi. Form ini meminta unggahan dokumen, ' +
    'sehingga Anda akan diminta masuk (sign in) dengan akun Google sebelum ' +
    'bisa mengirim jawaban.'
  );
  form.setCollectEmail(true); // catatan: perlu diubah manual ke "Verified", lihat langkah 3b

  form.addListItem()
      .setTitle(JUDUL_UNIT_RS)
      .setChoiceValues(['RS Royal Prima', 'RS Royal Prima Marelan'])
      .setRequired(true);

  // Pertanyaan "File upload" TIDAK dibuat di sini, tambahkan manual
  // (lihat catatan di atas file ini), judul harus persis JUDUL_ITEM_DOKUMEN.

  form.addTextItem()
      .setTitle(JUDUL_PIC)
      .setRequired(true);

  // ---------- 2. BUAT SPREADSHEET & SAMBUNGKAN KE FORM ----------
  var ss = SpreadsheetApp.create('Master Data Permintaan - RS Prima Group');
  var namaSheetAwal = ss.getSheets().map(function (s) { return s.getName(); });

  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  SpreadsheetApp.flush();

  var semuaSheet = ss.getSheets();
  var sheetRespon = null;
  semuaSheet.forEach(function (s) {
    if (namaSheetAwal.indexOf(s.getName()) === -1) sheetRespon = s;
  });
  if (!sheetRespon) sheetRespon = semuaSheet[semuaSheet.length - 1];
  sheetRespon.setName('Respon Mentah (otomatis)');

  var sheetMaster = ss.getSheetByName(namaSheetAwal[0]);
  sheetMaster.setName(NAMA_SHEET_MASTER);

  // ---------- 3. FORMAT SHEET "Master Permintaan" ----------
  var header = [
    'Kode Lowongan', 'Tanggal Masuk', 'Unit RS', 'Posisi', 'Jumlah Kebutuhan',
    'Kualifikasi', 'IPK Minimal', 'Program Studi Relevan', 'Fakultas Relevan',
    'Deadline', 'Tag Campus Hiring', 'Tautan Dokumen',
    'PIC Pengaju', 'Email PIC (terverifikasi)', 'Status', 'Jumlah Pendaftar', 'Catatan CEDC'
  ];
  var rangeHeader = sheetMaster.getRange(1, 1, 1, header.length);
  rangeHeader.setValues([header])
      .setFontWeight('bold')
      .setBackground('#f3f3f3');
  rangeHeader.setBorder(null, null, true, null, null, null, 'black', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sheetMaster.setFrozenRows(1);
  sheetMaster.autoResizeColumns(1, header.length);

  var validasiStatus = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Diterima', 'Diproses', 'Dipublikasikan', 'Ditutup', 'Perlu Dicek'], true)
      .setAllowInvalid(false)
      .build();
  sheetMaster.getRange(2, 15, 999, 1).setDataValidation(validasiStatus); // kolom Status, geser dari 12 ke 15 sejak IPK Minimal/Program Studi Relevan/Fakultas Relevan ditambahkan

  // ---------- 4. BUAT SHEET "Staging Web" (penampung sementara data dari Web App) ----------
  var sheetStaging = ss.insertSheet(NAMA_SHEET_STAGING);
  var headerStaging = ['Timestamp', 'Unit RS', 'Deadline', 'Tag Campus Hiring', 'Daftar Posisi (mentah)', 'Status'];
  var rangeHeaderStaging = sheetStaging.getRange(1, 1, 1, headerStaging.length);
  rangeHeaderStaging.setValues([headerStaging])
      .setFontWeight('bold')
      .setBackground('#f3f3f3');
  sheetStaging.setFrozenRows(1);
  sheetStaging.autoResizeColumns(1, headerStaging.length);

  // ---------- 5. SIMPAN ID SPREADSHEET & FORM UNTUK DIPAKAI WEB APP/TRIGGER ----------
  var props = PropertiesService.getScriptProperties();
  props.setProperty('MASTER_SS_ID', ss.getId());
  props.setProperty('FORM_ID', form.getId());

  // ---------- 6. PASANG TRIGGER OTOMATIS SETIAP ADA RESPON BARU ----------
  ScriptApp.newTrigger('isiMasterPermintaan')
      .forForm(form)
      .onFormSubmit()
      .create();

  // ---------- 7. TAMPILKAN LINK DI LOG ----------
  Logger.log('Form (untuk diedit CEDC): ' + form.getEditUrl());
  Logger.log('Spreadsheet (jangan dibagikan ke RS): ' + ss.getUrl());
  Logger.log('PENTING langkah 3a: tambahkan manual pertanyaan "File upload" berjudul persis: ' + JUDUL_ITEM_DOKUMEN);
  Logger.log('PENTING langkah 3b: Settings > Responses > Collect email addresses > pilih "Verified".');
  Logger.log('Setelah itu, jalankan Deploy > New deployment > Web app untuk mendapatkan link utama yang dibagikan ke RS.');
}

/**
 * MIGRASI SATU KALI (jalankan SEKALI SAJA, lewat dropdown Run) untuk
 * menambahkan 3 kolom baru (IPK Minimal, Program Studi Relevan, Fakultas
 * Relevan) ke sheet "Master Permintaan" yang SUDAH LIVE/terisi data,
 * disisipkan tepat setelah kolom "Kualifikasi". Dibuat idempoten: kalau
 * tidak sengaja dijalankan dua kali, percobaan kedua akan berhenti
 * sendiri karena header 'IPK Minimal' sudah ada, tidak akan menyisipkan
 * kolom dobel.
 *
 * Kenapa perlu migrasi terpisah (bukan cukup mengubah array `header` di
 * setupFormPermintaanRS): array `header` di setupFormPermintaanRS cuma
 * dipakai saat SETUP AWAL (Form/Spreadsheet baru dari nol), sama sekali
 * tidak menyentuh Master Permintaan yang sekarang sudah live dan sudah
 * berisi data pengajuan dari RS.
 *
 * Setelah migrasi ini, baris data LAMA tetap ada, cuma 3 kolom barunya
 * kosong (karena diajukan sebelum Web App meminta IPK Minimal/Program
 * Studi Relevan/Fakultas Relevan). Baris BARU (yang masuk lewat Web App
 * setelah Index.html terbaru dipasang) akan otomatis terisi lewat
 * isiMasterPermintaan(e).
 */
function migrasiTambahKolomSkorPrioritas() {
  var ssId = PropertiesService.getScriptProperties().getProperty('MASTER_SS_ID');
  if (!ssId) {
    throw new Error('MASTER_SS_ID tidak ditemukan di Script Properties, cek ulang setup awal.');
  }
  var ss = SpreadsheetApp.openById(ssId);
  var sheetMaster = ss.getSheetByName(NAMA_SHEET_MASTER);
  if (!sheetMaster) {
    throw new Error('Sheet "' + NAMA_SHEET_MASTER + '" tidak ditemukan.');
  }

  var jumlahKolomSekarang = sheetMaster.getLastColumn();
  var headerSekarang = sheetMaster.getRange(1, 1, 1, jumlahKolomSekarang).getValues()[0];

  if (headerSekarang.indexOf('IPK Minimal') !== -1) {
    Logger.log('Migrasi dilewati: kolom "IPK Minimal" sudah ada di header, migrasi ini sudah pernah dijalankan sebelumnya.');
    return;
  }

  var kolomKualifikasi = headerSekarang.indexOf('Kualifikasi') + 1; // 1-based
  if (kolomKualifikasi === 0) {
    throw new Error('Kolom "Kualifikasi" tidak ditemukan di header Master Permintaan, migrasi dibatalkan supaya tidak salah sisip kolom.');
  }

  // Sisipkan 3 kolom baru persis setelah kolom Kualifikasi.
  sheetMaster.insertColumnsAfter(kolomKualifikasi, 3);

  var headerBaru = ['IPK Minimal', 'Program Studi Relevan', 'Fakultas Relevan'];
  var rangeHeaderBaru = sheetMaster.getRange(1, kolomKualifikasi + 1, 1, 3);
  rangeHeaderBaru.setValues([headerBaru])
      .setFontWeight('bold')
      .setBackground('#f3f3f3');

  sheetMaster.autoResizeColumns(kolomKualifikasi + 1, 3);

  // Kolom Status ikut bergeser 3 posisi ke kanan, jadi validasi
  // dropdown-nya perlu dipasang ulang di posisi barunya (dicari lewat
  // nama header, bukan angka tetap, supaya tidak meleset).
  var headerSetelahSisip = sheetMaster.getRange(1, 1, 1, sheetMaster.getLastColumn()).getValues()[0];
  var kolomStatus = headerSetelahSisip.indexOf('Status') + 1;
  if (kolomStatus > 0) {
    var validasiStatus = SpreadsheetApp.newDataValidation()
        .requireValueInList(['Diterima', 'Diproses', 'Dipublikasikan', 'Ditutup', 'Perlu Dicek'], true)
        .setAllowInvalid(false)
        .build();
    sheetMaster.getRange(2, kolomStatus, 999, 1).setDataValidation(validasiStatus);
  }

  Logger.log('Migrasi selesai: 3 kolom baru (IPK Minimal, Program Studi Relevan, Fakultas Relevan) berhasil disisipkan setelah kolom Kualifikasi. Baris data lama tidak berubah isinya, kolom baru untuk baris lama otomatis kosong. Validasi dropdown Status sudah dipasang ulang di posisi barunya.');
}

/**
 * PERBAIKAN (21 Sep 2026): dipakai SEKALI SAJA setelah error "No response
 * with ID ... exists for this form" muncul terus menerus di Executions.
 * Trigger isiMasterPermintaan dipasang PERTAMA KALI oleh
 * setupFormPermintaanRS(), lalu Form-nya diedit manual dua kali sesudahnya
 * (nambah pertanyaan File Upload, ubah Collect Email ke Verified). Pada
 * beberapa kasus, edit struktur Form setelah trigger terpasang membuat
 * referensi internal trigger ke Form itu tidak sinkron lagi, sehingga
 * e.response gagal terus menerus. Fungsi ini menghapus trigger lama lalu
 * memasang ulang dari nol, supaya ikatannya mengikuti kondisi Form yang
 * sekarang. Jalankan dari dropdown Run, SEKALI SAJA, lalu cek di Triggers
 * (ikon jam) hasilnya cuma ada SATU baris isiMasterPermintaan / On form
 * submit, tidak dobel.
 */
function pasangUlangTriggerFormSubmitPaksa() {
  var formId = PropertiesService.getScriptProperties().getProperty('FORM_ID');
  if (!formId) {
    throw new Error('FORM_ID tidak ditemukan di Script Properties, cek ulang setup awal.');
  }
  var form = FormApp.openById(formId);

  var triggerLama = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === 'isiMasterPermintaan';
  });
  triggerLama.forEach(function (t) {
    ScriptApp.deleteTrigger(t);
  });
  Logger.log('Trigger lama isiMasterPermintaan dihapus: ' + triggerLama.length + ' buah.');

  ScriptApp.newTrigger('isiMasterPermintaan')
      .forForm(form)
      .onFormSubmit()
      .create();
  Logger.log('Trigger isiMasterPermintaan baru berhasil dipasang ulang dari nol, terikat ke Form: ' + form.getEditUrl());
}


// ============================================================
// WEB APP
// ============================================================

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('Permintaan Tenaga Kerja - RS Prima Group')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Dipanggil dari Index.html lewat google.script.run.
 * data = {
 *   unitRS: string,
 *   deadline: 'YYYY-MM-DD',
 *   tagCampus: boolean,
 *   posisiList: [{ nama, jumlah, kualifikasi }, ...]
 * }
 * Menyimpan Deadline/Tag/daftar posisi ke sheet Staging Web, lalu
 * mengembalikan URL Form yang Unit RS-nya sudah otomatis terisi.
 *
 * PERBAIKAN (22 Sep 2026): daftar posisi sekarang disimpan sebagai JSON
 * (bukan lagi teks dipisah ';' dan enter), lihat blok komentar PERBAIKAN
 * 22 Sep 2026 di awal file ini untuk alasan lengkapnya. JSON.stringify
 * otomatis meng-escape Enter/titik-koma/koma apa pun yang diketik RS di
 * field bebas seperti Kualifikasi, jadi field itu sekarang aman dipakai
 * multi-baris atau mengandung titik-koma tanpa merusak parsing di
 * isiMasterPermintaan.
 */
function buatLinkFormLanjutan(data) {
  var daftarPosisiValid = data.posisiList.filter(function (p) { return p.nama; });

  var daftarPosisiTeks = JSON.stringify(daftarPosisiValid.map(function (p) {
    return {
      nama: p.nama,
      jumlah: p.jumlah,
      kualifikasi: p.kualifikasi,
      ipkMinimal: p.ipkMinimal || '',
      programStudiRelevan: (p.programStudiRelevan || []).join(','),
      fakultasRelevan: (p.fakultasRelevan || []).join(',')
    };
  }));

  var ssId = PropertiesService.getScriptProperties().getProperty('MASTER_SS_ID');
  var ss = SpreadsheetApp.openById(ssId);
  var sheetStaging = ss.getSheetByName(NAMA_SHEET_STAGING);
  sheetStaging.appendRow([
    new Date(),
    data.unitRS,
    data.deadline,
    data.tagCampus ? NILAI_TAG_CAMPUS : '',
    daftarPosisiTeks,
    STATUS_MENUNGGU
  ]);

  var formId = PropertiesService.getScriptProperties().getProperty('FORM_ID');
  var form = FormApp.openById(formId);
  var itemUnitRS = cariItem(form, JUDUL_UNIT_RS);

  var formResponse = form.createResponse();
  formResponse.withItemResponse(itemUnitRS.asListItem().createResponse(data.unitRS));

  return formResponse.toPrefilledUrl();
}

function cariItem(form, judul) {
  var items = form.getItems();
  for (var i = 0; i < items.length; i++) {
    if (items[i].getTitle() === judul) return items[i];
  }
  throw new Error('Item Form dengan judul "' + judul + '" tidak ditemukan.');
}

/**
 * MASTER GATE, Fase 1 (23 Sep 2026). Dipanggil dari Index.html lewat
 * google.script.run begitu RS memilih Unit RS, untuk menampilkan tombol
 * "Buka Rekap Pelamar" yang langsung mengarah ke Spreadsheet Pelamar
 * milik Unit RS itu (kalau tab "Rekap per Lowongan" sudah ada, link
 * langsung menjorok ke tab itu, lewat linkSpreadsheetPelamar_).
 *
 * Sengaja TIDAK menyalin ulang KONFIGURASI_UNIT_RS/spreadsheetPelamarId
 * ke file ini, supaya nilainya tetap satu sumber kebenaran di
 * Fase2_Bagian3_LinkOtomatis.gs (sama prinsipnya dengan KATALOG_PRODI di
 * Index.html yang juga tidak boleh diduplikasi, lihat Bagian 3 dokumen
 * referensi project). getKonfigurasiUnitRS dan linkSpreadsheetPelamar_
 * didefinisikan di Fase2_Bagian3_LinkOtomatis.gs, bukan di file ini.
 */
function ambilLinkRekapPelamar(unitRS) {
  var konfig = getKonfigurasiUnitRS(unitRS);
  return linkSpreadsheetPelamar_(konfig);
}


// ============================================================
// TRIGGER SUBMIT FORM -> MASTER PERMINTAAN
// ============================================================

/**
 * Mengambil response Form yang baru disubmit, dengan dua cara:
 *
 * CARA 1 (langsung): pakai e.response, dicoba beberapa kali dengan jeda.
 * CARA 2 (cadangan): kalau Cara 1 tetap gagal terus, e.response DILEWATI
 *   sama sekali. Sebagai gantinya ambil daftar response Form lewat
 *   form.getResponses(sejakKapan), lalu pakai response yang paling akhir.
 *   Ini bukan mencari berdasarkan ID tertentu (yang selama ini gagal),
 *   tapi mengambil daftar dan memilih yang terbaru, jalur teknis yang
 *   sama sekali berbeda.
 *
 * Perlu dua cara begini karena pada Form yang punya pertanyaan File
 * Upload, e.response kadang gagal diambil terus menerus (bukan cuma
 * telat sesaat) walau response-nya sendiri jelas ada dan tercatat di
 * sheet Respon Mentah. Ini perilaku yang dikenal terjadi di sisi Google,
 * bukan kesalahan logika di kode ini.
 */
function ambilResponseDenganRetry(e) {
  var percobaanMaksimal = 3;
  var jedaMs = 2000;
  for (var i = 1; i <= percobaanMaksimal; i++) {
    try {
      var response = e.response;
      response.getId();
      return response;
    } catch (err) {
      Logger.log('CARA 1, percobaan ' + i + ' dari ' + percobaanMaksimal + ' gagal ambil e.response: ' + err.message);
      if (i < percobaanMaksimal) Utilities.sleep(jedaMs);
    }
  }

  Logger.log('CARA 1 gagal total, beralih ke CARA 2: ambil response terbaru lewat form.getResponses().');
  try {
    var formId = PropertiesService.getScriptProperties().getProperty('FORM_ID');
    Logger.log('CARA 2: FORM_ID dari Script Properties = [' + formId + ']');
    var form = FormApp.openById(formId);
    Logger.log('CARA 2: berhasil buka form, judul = [' + form.getTitle() + ']');

    var semuaResponse = form.getResponses();
    Logger.log('CARA 2: total response yang ada di form ini (semua waktu) = ' + semuaResponse.length);

    if (semuaResponse.length) {
      var responseTerakhir = semuaResponse[semuaResponse.length - 1];
      Logger.log('CARA 2: timestamp response terakhir = ' + responseTerakhir.getTimestamp());
      return responseTerakhir;
    }
  } catch (err2) {
    Logger.log('CARA 2 juga gagal: ' + err2.message);
  }

  return null;
}

/**
 * Mem-parse teks "Daftar Posisi (mentah)" dari sheet Staging Web menjadi
 * array of object { nama, jumlah, kualifikasi, ipkMinimal,
 * programStudiRelevan, fakultasRelevan }.
 *
 * FORMAT BARU (sejak perbaikan 22 Sep 2026): JSON array of object, dibuat
 * lewat JSON.stringify di buatLinkFormLanjutan. Ini format yang dipakai
 * untuk SEMUA staging baru sejak perbaikan ini, aman untuk field bebas
 * (terutama Kualifikasi) yang mengandung Enter/titik-koma/koma, karena
 * JSON meng-escape semuanya jadi satu baris teks yang tidak ambigu.
 *
 * FORMAT LAMA (fallback saja, TIDAK dipakai lagi untuk staging baru):
 * teks dipisah ';' antar kolom dan enter ('\n') antar posisi. Ini format
 * yang menyebabkan bug 22 Sep 2026 (Kualifikasi multi-baris pakai Enter
 * pecah jadi beberapa "posisi" palsu, kolom-kolom di baris terakhir ikut
 * bergeser). Cuma dipertahankan di sini sebagai fallback, kalau-kalau ada
 * baris Staging Web berstatus "Menunggu Form" yang dibuat SEBELUM
 * perbaikan ini di-deploy dan belum sempat diproses triggernya.
 */
function parseDaftarPosisiMentah_(teks) {
  try {
    var hasilJSON = JSON.parse(teks);
    if (Array.isArray(hasilJSON)) {
      return hasilJSON.map(function (p) {
        return {
          nama: p.nama || '',
          jumlah: p.jumlah || '',
          kualifikasi: p.kualifikasi || '',
          ipkMinimal: p.ipkMinimal || '',
          programStudiRelevan: p.programStudiRelevan || '',
          fakultasRelevan: p.fakultasRelevan || ''
        };
      });
    }
  } catch (err) {
    // Bukan JSON valid, kemungkinan staging FORMAT LAMA dari sebelum
    // perbaikan 22 Sep 2026. Lanjut ke pembacaan format lama di bawah.
  }

  Logger.log('parseDaftarPosisiMentah_: teks bukan JSON valid, dibaca pakai FORMAT LAMA (pemisah ";" dan enter). Ini cuma seharusnya kejadian untuk baris Staging Web yang dibuat SEBELUM perbaikan 22 Sep 2026, cek manual kalau muncul terus setelah itu.');
  return String(teks).split('\n').map(function (satuBaris) {
    satuBaris = satuBaris.trim();
    if (!satuBaris) return null;
    var kolom = satuBaris.split(';').map(function (s) { return s.trim(); });
    return {
      nama: kolom[0] || '',
      jumlah: kolom[1] || '',
      kualifikasi: kolom[2] || '',
      ipkMinimal: kolom[3] || '',
      programStudiRelevan: kolom[4] || '',
      fakultasRelevan: kolom[5] || ''
    };
  }).filter(function (p) { return p; });
}

/**
 * PENTING: trigger fungsi ini dipasang lewat
 * ScriptApp.newTrigger('isiMasterPermintaan').forForm(form).onFormSubmit(),
 * yaitu trigger yang ditempel ke FORM, bukan ke Spreadsheet. Untuk
 * jenis trigger ini, Google HANYA mengisi e.response (objek
 * FormResponse), TIDAK mengisi e.namedValues/e.values (dua properti
 * itu cuma ada kalau triggernya ditempel ke Spreadsheet). Karena itu
 * semua pembacaan jawaban di bawah ini HARUS lewat
 * e.response.getItemResponses(), bukan e.namedValues.
 *
 * CATATAN TAMBAHAN: Form ini punya pertanyaan File Upload ("Unggah
 * Dokumen Pendukung"). Pada Form dengan File Upload, kadang trigger
 * onFormSubmit terpicu sebelum response-nya benar benar selesai
 * tersimpan di server Google (masih menunggu file selesai diproses),
 * sehingga e.response sempat gagal diakses dengan error "No response
 * with ID ... exists for this form". ambilResponseDenganRetry di
 * bawah menangani ini dengan mencoba ulang beberapa kali dengan jeda,
 * sebelum benar benar menyerah.
 *
 * PERBAIKAN (22 Sep 2026): pembacaan daftar posisi dari staging.daftarPosisiMentah
 * sekarang lewat parseDaftarPosisiMentah_ (JSON, dengan fallback format
 * lama), menggantikan split manual ';'/enter yang sebelumnya ada di sini
 * langsung. Lihat blok komentar PERBAIKAN 22 Sep 2026 di awal file ini
 * untuk detail bug yang diperbaiki.
 */
function isiMasterPermintaan(e) {
  var response = ambilResponseDenganRetry(e);
  if (!response) {
    Logger.log('Gagal mengambil response Form setelah beberapa percobaan. Submission ini TIDAK tercatat di Master Permintaan, cek manual ke sheet Respon Mentah (otomatis).');
    return;
  }

  function ambil(judul) {
    var hasil = '';
    response.getItemResponses().forEach(function (ir) {
      if (ir.getItem().getTitle() === judul) hasil = ir.getResponse();
    });
    return hasil;
  }

  var unitRS = ambil(JUDUL_UNIT_RS);
  var picNama = ambil(JUDUL_PIC);
  var emailVerifikasi = response.getRespondentEmail() || '';
  var linkDokumen = ambilLinkDokumen(response);

  // ---- LOG DIAGNOSTIK SEMENTARA, boleh dihapus kalau semua sudah lancar ----
  Logger.log('DIAGNOSTIK unitRS = [' + unitRS + ']');
  Logger.log('DIAGNOSTIK picNama = [' + picNama + ']');
  Logger.log('DIAGNOSTIK emailVerifikasi = [' + emailVerifikasi + ']');

  var ssId = PropertiesService.getScriptProperties().getProperty('MASTER_SS_ID');
  Logger.log('DIAGNOSTIK ssId dari Script Properties = [' + ssId + ']');
  if (!ssId) {
    Logger.log('DIAGNOSTIK BERHENTI: MASTER_SS_ID kosong/tidak ada di Script Properties.');
    return;
  }

  var ss = SpreadsheetApp.openById(ssId);
  Logger.log('DIAGNOSTIK nama spreadsheet yang dibuka = [' + ss.getName() + '], url = ' + ss.getUrl());

  var sheetMaster = ss.getSheetByName(NAMA_SHEET_MASTER);
  var sheetStaging = ss.getSheetByName(NAMA_SHEET_STAGING);
  Logger.log('DIAGNOSTIK sheetMaster ditemukan = ' + (sheetMaster ? 'YA' : 'TIDAK, cek nama sheet NAMA_SHEET_MASTER'));
  Logger.log('DIAGNOSTIK sheetStaging ditemukan = ' + (sheetStaging ? 'YA' : 'TIDAK, cek nama sheet NAMA_SHEET_STAGING'));

  var prefixUnit = unitRS.indexOf('Marelan') !== -1 ? 'RPM' : 'RP';

  var staging = cariDanTandaiStaging(sheetStaging, unitRS);
  Logger.log('DIAGNOSTIK staging ditemukan untuk unitRS ini = ' + (staging ? 'YA' : 'TIDAK'));

  if (!staging) {
    Logger.log('DIAGNOSTIK menulis baris Perlu Dicek ke sheetMaster sekarang.');
    // Tidak ada data dari Web App yang cocok, kemungkinan Form diisi
    // langsung tanpa lewat Web App. Tetap dicatat supaya tidak hilang,
    // ditandai untuk dicek manual oleh CEDC.
    var kodeDarurat = buatKodeLowongan(sheetMaster, prefixUnit);
    sheetMaster.appendRow([
      kodeDarurat, new Date(), unitRS, '(tidak ditemukan data dari Web App)', '', '',
      '', '', '', '', '', linkDokumen, picNama, emailVerifikasi, 'Perlu Dicek', '',
      'Form disubmit tanpa data Web App yang cocok, cek manual ke PIC.'
    ]);
    return;
  }

  var daftarPosisi = parseDaftarPosisiMentah_(staging.daftarPosisiMentah);
  daftarPosisi.forEach(function (p) {
    var posisi = p.nama || '';
    if (!posisi) return;

    var kode = buatKodeLowongan(sheetMaster, prefixUnit);
    sheetMaster.appendRow([
      kode, new Date(), unitRS, posisi, p.jumlah || '', p.kualifikasi || '', p.ipkMinimal || '',
      p.programStudiRelevan || '', p.fakultasRelevan || '', staging.deadline,
      staging.tagCampus, linkDokumen, picNama, emailVerifikasi, 'Diterima', '', ''
    ]);
  });
}

/**
 * Mencari baris staging tertua berstatus "Menunggu Form" untuk Unit RS
 * yang sama, menandainya "Terpakai", lalu mengembalikan datanya.
 * Dicocokkan per Unit RS supaya submission Royal Prima dan Royal Prima
 * Marelan yang berbarengan tidak saling tertukar.
 */
function cariDanTandaiStaging(sheetStaging, unitRS) {
  var data = sheetStaging.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var baris = data[i];
    if (baris[1] === unitRS && baris[5] === STATUS_MENUNGGU) {
      sheetStaging.getRange(i + 1, 6).setValue('Terpakai - ' + new Date());
      return { deadline: baris[2], tagCampus: baris[3], daftarPosisiMentah: baris[4] };
    }
  }
  return null;
}

function ambilLinkDokumen(response) {
  var link = '';
  response.getItemResponses().forEach(function (ir) {
    if (ir.getItem().getTitle() === JUDUL_ITEM_DOKUMEN) {
      var fileIds = ir.getResponse();
      if (fileIds && fileIds.length) {
        link = fileIds.map(function (id) {
          return 'https://drive.google.com/file/d/' + id + '/view';
        }).join(', ');
      }
    }
  });
  return link;
}

function buatKodeLowongan(sheet, prefixUnit) {
  var tahun = new Date().getFullYear();
  var awalan = 'RSP-' + prefixUnit + '-' + tahun + '-';
  var jumlahBaris = Math.max(sheet.getLastRow() - 1, 0);
  var data = jumlahBaris > 0 ? sheet.getRange(2, 1, jumlahBaris, 1).getValues() : [];
  var jumlahSudahAda = 0;
  data.forEach(function (row) {
    if (row[0] && row[0].toString().indexOf(awalan) === 0) jumlahSudahAda++;
  });
  var nomor = ('000' + (jumlahSudahAda + 1)).slice(-3);
  return awalan + nomor;
}
