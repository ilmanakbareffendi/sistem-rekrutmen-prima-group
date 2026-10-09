/**
 * Lowongan.gs - LAPIS 2: Master Permintaan <-> Form Pendaftaran Pelamar
 * ============================================================
 *   - Status "Dipublikasikan" -> Link Pendaftaran terisi + posisi muncul
 *     di dropdown "Posisi yang Dilamar" Form Unit RS itu.
 *   - Jumlah Pendaftar dan Jumlah Diterima dihitung otomatis.
 *   - Auto-flag harian: kebutuhan terpenuhi -> "Ditutup"; deadline lewat
 *     dan belum terpenuhi -> "Perlu Dicek".
 *   - pasangSemuaTrigger() dan cekKesehatanSistem() untuk perawatan.
 *
 * Perubahan Status lewat SCRIPT tidak memicu onEditMasterPermintaan (onEdit
 * cuma untuk edit manusia), jadi setiap fungsi yang mengubah Status lewat
 * kode wajib memanggil sinkronLowongan_() sendiri.
 */

// ============================================================
// TRIGGER: STATUS DIUBAH MANUAL DI MASTER PERMINTAAN
// ============================================================

function onEditMasterPermintaan(e) {
  var sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_MASTER) return;
  var tabel = bacaTabel_(sheet);
  var kolomStatus = kolomWajib_(tabel, KOLOM.STATUS) + 1;
  if (e.range.getColumn() > kolomStatus || e.range.getLastColumn() < kolomStatus) return;
  denganKunci_('onEditMasterPermintaan', function () { sinkronLowongan_(); });
}

// ============================================================
// TRIGGER: ADA PELAMAR BARU SUBMIT FORM PENDAFTARAN PELAMAR
// ============================================================

function onSubmitPelamarBaru(e) {
  denganKunci_('onSubmitPelamarBaru', function () {
    perbaruiSemua_();
    DAFTAR_UNIT_RS.forEach(function (unit) {
      try {
        bagikanFolderCV_(unit);
      } catch (err) {
        Logger.log(unit.nama + ': gagal membagikan folder CV: ' + err);
      }
    });
  });
}

// ============================================================
// TRIGGER JAM-AN (dan aman dijalankan manual kapan saja)
// ============================================================

function hitungUlangJumlahPendaftar() {
  denganKunci_('hitungUlangJumlahPendaftar', perbaruiSemua_);
}

// Jumlah Pendaftar/Diterima + Link + dropdown semua baris, lalu semua tab Rekap.
function perbaruiSemua_() {
  sinkronLowongan_();
  DAFTAR_UNIT_RS.forEach(function (unit) { perbaruiRekapPelamar_(unit.spreadsheetPelamarId); });
}

/**
 * Inti Lapis 2. Untuk SEMUA baris Master Permintaan, dalam satu kali baca
 * dan tulis per kolom: Jumlah Pendaftar, Jumlah Diterima, Link Pendaftaran
 * (hanya kalau Dipublikasikan), Link Rekap Pelamar. Lalu dropdown posisi
 * di kedua Form disamakan dengan baris yang Dipublikasikan.
 */
function sinkronLowongan_() {
  var tabel = bacaTabel_(bukaSheetMaster_());
  var iKode = kolomWajib_(tabel, KOLOM.KODE);
  var iUnit = kolomWajib_(tabel, KOLOM.UNIT);
  var iStatus = kolomWajib_(tabel, KOLOM.STATUS);
  var iPendaftar = tabel.idx(KOLOM.PENDAFTAR);
  var iDiterima = tabel.idx(KOLOM.DITERIMA);
  var iLinkDaftar = tabel.idx(KOLOM.LINK_DAFTAR);
  var iLinkRekap = tabel.idx(KOLOM.LINK_REKAP);

  var info = {};
  DAFTAR_UNIT_RS.forEach(function (unit) {
    info[unit.nama] = {
      ringkasan: ringkasanPelamar_(unit),
      linkDaftar: FormApp.openById(unit.formId).getPublishedUrl(),
      linkRekap: linkRekapPelamar_(unit)
    };
  });

  var kolPendaftar = [], kolDiterima = [], kolLinkDaftar = [], kolLinkRekap = [];
  tabel.data.forEach(function (baris) {
    var adaUnit = !!baris[iUnit];
    var u = info[unitRS_(baris[iUnit]).nama];
    var kode = baris[iKode];
    kolPendaftar.push(adaUnit && kode ? (u.ringkasan.pendaftar[kode] || 0) : (iPendaftar !== -1 ? baris[iPendaftar] : ''));
    kolDiterima.push(adaUnit && kode ? (u.ringkasan.diterima[kode] || 0) : (iDiterima !== -1 ? baris[iDiterima] : ''));
    kolLinkDaftar.push(adaUnit && baris[iStatus] === STATUS.DIPUBLIKASIKAN ? u.linkDaftar : '');
    kolLinkRekap.push(adaUnit ? u.linkRekap : '');
  });

  tulisKolom_(tabel, iPendaftar, kolPendaftar);
  tulisKolom_(tabel, iDiterima, kolDiterima);
  tulisKolom_(tabel, iLinkDaftar, kolLinkDaftar);
  tulisKolom_(tabel, iLinkRekap, kolLinkRekap);

  DAFTAR_UNIT_RS.forEach(function (unit) { sinkronDropdownPosisi_(unit, tabel); });
}

/**
 * Isi dropdown "Posisi yang Dilamar" di Form satu Unit RS = semua baris
 * Unit RS itu yang Dipublikasikan, format "Posisi (Kode Lowongan)".
 * Pertanyaannya dicari lewat JUDUL, bukan Item ID.
 */
function sinkronDropdownPosisi_(unit, tabel) {
  tabel = tabel || bacaTabel_(bukaSheetMaster_());
  var iKode = kolomWajib_(tabel, KOLOM.KODE);
  var iUnit = kolomWajib_(tabel, KOLOM.UNIT);
  var iPosisi = kolomWajib_(tabel, KOLOM.POSISI);
  var iStatus = kolomWajib_(tabel, KOLOM.STATUS);

  var pilihan = [];
  tabel.data.forEach(function (baris) {
    if (!baris[iUnit] || unitRS_(baris[iUnit]) !== unit) return;
    if (baris[iStatus] !== STATUS.DIPUBLIKASIKAN || !baris[iPosisi] || !baris[iKode]) return;
    pilihan.push(baris[iPosisi] + ' (' + baris[iKode] + ')');
  });
  if (!pilihan.length) pilihan = [PLACEHOLDER_BELUM_ADA_POSISI];

  var item = cariItemForm_(FormApp.openById(unit.formId), JUDUL_POSISI);
  if (!item) {
    Logger.log(unit.nama + ': pertanyaan "' + JUDUL_POSISI + '" tidak ditemukan di Form Pendaftaran Pelamar, dropdown tidak disinkronkan. Jalankan cekKesehatanSistem.');
    return;
  }
  item.asListItem().setChoiceValues(pilihan);
  Logger.log(unit.nama + ': dropdown posisi disinkronkan, ' + pilihan.length + ' pilihan.');
}

/** Manual: paksa sinkron dropdown kedua Form. */
function sinkronSemuaDropdownPosisi() {
  var tabel = bacaTabel_(bukaSheetMaster_());
  DAFTAR_UNIT_RS.forEach(function (unit) { sinkronDropdownPosisi_(unit, tabel); });
}

// Link langsung ke Spreadsheet Pelamar, menjorok ke tab Rekap kalau ada.
function linkRekapPelamar_(unit) {
  var link = 'https://docs.google.com/spreadsheets/d/' + unit.spreadsheetPelamarId + '/edit';
  try {
    var rekap = SpreadsheetApp.openById(unit.spreadsheetPelamarId).getSheetByName(SHEET_REKAP);
    if (rekap) return link + '#gid=' + rekap.getSheetId();
  } catch (err) {
    Logger.log(unit.nama + ': gagal membaca tab Rekap, pakai link dasar: ' + err.message);
  }
  return link;
}

// ============================================================
// DATA PELAMAR: Jumlah Pendaftar & Jumlah Diterima per Kode Lowongan
// ============================================================

/**
 * Baca Spreadsheet Pelamar satu Unit RS SEKALI, kembalikan
 * { pendaftar: {kode: n}, diterima: {kode: n} }. "Diterima" = Status
 * Lamaran yang RS isi di tab Rekap (disimpan di sheet tersembunyi).
 */
function ringkasanPelamar_(unit) {
  var hasil = { pendaftar: {}, diterima: {} };
  var ss = SpreadsheetApp.openById(unit.spreadsheetPelamarId);
  var sheet = cariSheetDenganKolom_(ss, JUDUL_POSISI);
  if (!sheet) return hasil;

  var tabel = bacaTabel_(sheet);
  var iPosisi = tabel.idx(JUDUL_POSISI);
  var iWaktu = tabel.idx('Timestamp');
  var iEmail = tabel.idx('Email Address');
  var petaStatus = bacaPetaStatusLamaran_(ambilSheetStatusLamaran_(ss));

  tabel.data.forEach(function (baris) {
    var kode = ekstrakKodeLowongan_(baris[iPosisi]);
    if (!kode) return;
    hasil.pendaftar[kode] = (hasil.pendaftar[kode] || 0) + 1;
    if (iWaktu === -1 || iEmail === -1) return;
    var simpanan = petaStatus[kunciStatusLamaran_(baris[iWaktu], baris[iEmail])];
    if (simpanan && simpanan.status === STATUS_LAMARAN_DITERIMA) hasil.diterima[kode] = (hasil.diterima[kode] || 0) + 1;
  });
  return hasil;
}

/** Dipanggil Rekap.gs setiap RS mengubah Status Lamaran: perbarui satu baris saja. */
function perbaruiJumlahDiterima_(unit, kodeLowongan) {
  if (!kodeLowongan) return;
  var tabel = bacaTabel_(bukaSheetMaster_());
  var iKode = kolomWajib_(tabel, KOLOM.KODE);
  var iDiterima = kolomWajib_(tabel, KOLOM.DITERIMA);
  var jumlah = ringkasanPelamar_(unit).diterima[kodeLowongan] || 0;
  for (var i = 0; i < tabel.data.length; i++) {
    if (tabel.data[i][iKode] === kodeLowongan) {
      tabel.sheet.getRange(i + 2, iDiterima + 1).setValue(jumlah);
      return;
    }
  }
}

// ============================================================
// AUTO-FLAG HARIAN
// ============================================================

/**
 * Baris "Dipublikasikan":
 *   Jumlah Diterima >= Jumlah Kebutuhan          -> "Ditutup"
 *   belum terpenuhi DAN deadline sudah lewat      -> "Perlu Dicek"
 * Jumlah Kebutuhan kosong/tidak valid tidak pernah ditutup otomatis, tapi
 * tetap ditandai "Perlu Dicek" kalau deadline lewat. Hari H deadline belum
 * dihitung lewat. Catatan ditambahkan di bawah Catatan CEDC yang sudah ada.
 */
function autoFlagStatusLowongan() {
  denganKunci_('autoFlagStatusLowongan', function () {
    var tabel = bacaTabel_(bukaSheetMaster_());
    var iKode = kolomWajib_(tabel, KOLOM.KODE);
    var iUnit = kolomWajib_(tabel, KOLOM.UNIT);
    var iStatus = kolomWajib_(tabel, KOLOM.STATUS);
    var iKebutuhan = kolomWajib_(tabel, KOLOM.KEBUTUHAN);
    var iDeadline = kolomWajib_(tabel, KOLOM.DEADLINE);
    var iCatatan = kolomWajib_(tabel, KOLOM.CATATAN);

    var ringkasan = {};
    DAFTAR_UNIT_RS.forEach(function (unit) { ringkasan[unit.nama] = ringkasanPelamar_(unit); });
    var hariIni = awalHari_(new Date());
    var label = 'Auto ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'd MMM yyyy') + ': ';

    var kolStatus = [], kolCatatan = [], berubah = [];
    tabel.data.forEach(function (baris) {
      var status = baris[iStatus], catatan = baris[iCatatan];
      if (status === STATUS.DIPUBLIKASIKAN && baris[iKode] && baris[iUnit]) {
        var diterima = ringkasan[unitRS_(baris[iUnit]).nama].diterima[baris[iKode]] || 0;
        var hasil = tentukanAutoFlag_(baris[iKebutuhan], diterima, baris[iDeadline], hariIni);
        if (hasil) {
          status = hasil.status;
          catatan = String(catatan || '').trim() ? String(catatan).trim() + '\n' + label + hasil.catatan : label + hasil.catatan;
          berubah.push(baris[iKode] + ' -> ' + hasil.status);
        }
      }
      kolStatus.push(status);
      kolCatatan.push(catatan);
    });

    if (berubah.length) {
      tulisKolom_(tabel, iStatus, kolStatus);
      tulisKolom_(tabel, iCatatan, kolCatatan);
      sinkronLowongan_(); // Link Pendaftaran + dropdown ikut menyesuaikan
    }
    Logger.log(berubah.length ? 'Auto-flag: ' + berubah.length + ' baris berubah: ' + berubah.join(' | ') : 'Auto-flag: tidak ada baris yang perlu diubah.');
  });
}

/** Inti aturan auto-flag (tanpa akses Sheets). {status, catatan} atau null. */
function tentukanAutoFlag_(nilaiKebutuhan, diterima, nilaiDeadline, hariIni) {
  var kebutuhan = bacaBilanganBulat_(nilaiKebutuhan);
  if (kebutuhan && diterima >= kebutuhan) {
    return { status: STATUS.DITUTUP, catatan: 'kebutuhan terpenuhi, ' + diterima + ' dari ' + kebutuhan + ' diterima.' };
  }
  var deadline = bacaTanggal_(nilaiDeadline);
  if (!deadline || hariIni.getTime() <= deadline.getTime()) return null;
  if (!kebutuhan) {
    return { status: STATUS.PERLU_DICEK, catatan: 'deadline lewat, Jumlah Kebutuhan kosong/tidak valid sehingga tidak bisa dipastikan sudah terpenuhi (' + diterima + ' diterima). Mohon cek manual.' };
  }
  return { status: STATUS.PERLU_DICEK, catatan: 'deadline lewat, baru terisi ' + diterima + ' dari ' + kebutuhan + ' kebutuhan.' };
}

// ============================================================
// AKSES RS KE FOLDER CV
// ============================================================

/**
 * File CV dari Form disimpan di folder Drive milik akun CEDC. Folder itu
 * dibagikan (Viewer) ke PIC RS, sekali share folder mencakup CV lama dan
 * baru. Butuh minimal satu CV yang sudah masuk untuk menemukan foldernya.
 */
function bagikanFolderCV_(unit) {
  if (!unit.emailPicRS) return;
  var ss = SpreadsheetApp.openById(unit.spreadsheetPelamarId);
  var sheet = cariSheetDenganKolom_(ss, 'Unggah CV (pdf)');
  if (!sheet) return;
  var tabel = bacaTabel_(sheet);
  var iCV = tabel.idx('Unggah CV (pdf)');
  for (var i = 0; i < tabel.data.length; i++) {
    var cocok = String(tabel.data[i][iCV] || '').match(/[?&]id=([\w-]+)/) || String(tabel.data[i][iCV] || '').match(/\/d\/([\w-]+)/);
    if (!cocok) continue;
    var folder = DriveApp.getFileById(cocok[1]).getParents();
    while (folder.hasNext()) folder.next().addViewer(unit.emailPicRS);
    return;
  }
}

// ============================================================
// PERAWATAN: TRIGGER, VALIDASI, CEK KESEHATAN
// ============================================================

/**
 * Pasang semua trigger yang dibutuhkan sistem. Aman dijalankan berkali-kali:
 * trigger yang sudah ada tidak dipasang dobel.
 */
function pasangSemuaTrigger() {
  var ada = ScriptApp.getProjectTriggers().map(function (t) {
    return t.getHandlerFunction() + '|' + (t.getTriggerSourceId() || '');
  });
  function pasang(handler, sumberId, buat) {
    var sudah = ada.some(function (k) { return k.indexOf(handler + '|') === 0 && (!sumberId || k === handler + '|' + sumberId); });
    Logger.log(handler + (sumberId ? ' (' + sumberId + ')' : '') + ': ' + (sudah ? 'sudah ada' : 'dipasang'));
    if (!sudah) buat();
  }

  var formPermintaanId = propWajib_(PROP_FORM_PERMINTAAN_ID);
  var masterId = propWajib_(PROP_MASTER_SS_ID);
  pasang('isiMasterPermintaan', formPermintaanId, function () {
    ScriptApp.newTrigger('isiMasterPermintaan').forForm(FormApp.openById(formPermintaanId)).onFormSubmit().create();
  });
  pasang('onEditMasterPermintaan', masterId, function () {
    ScriptApp.newTrigger('onEditMasterPermintaan').forSpreadsheet(SpreadsheetApp.openById(masterId)).onEdit().create();
  });
  DAFTAR_UNIT_RS.forEach(function (unit) {
    pasang('onSubmitPelamarBaru', unit.formId, function () {
      ScriptApp.newTrigger('onSubmitPelamarBaru').forForm(FormApp.openById(unit.formId)).onFormSubmit().create();
    });
    pasang('onEditRekapPelamar', unit.spreadsheetPelamarId, function () {
      ScriptApp.newTrigger('onEditRekapPelamar').forSpreadsheet(SpreadsheetApp.openById(unit.spreadsheetPelamarId)).onEdit().create();
    });
  });
  pasang('hitungUlangJumlahPendaftar', null, function () {
    ScriptApp.newTrigger('hitungUlangJumlahPendaftar').timeBased().everyHours(1).create();
  });
  pasang('autoFlagStatusLowongan', null, function () {
    ScriptApp.newTrigger('autoFlagStatusLowongan').timeBased().everyDays(1).atHour(JAM_AUTO_FLAG).create();
  });
}

/**
 * Pasang ulang dropdown Status HANYA di kolom Status Master Permintaan, dan
 * hapus validasi dropdown yang nyasar di kolom lain (misalnya Jumlah
 * Pendaftar). Aman dijalankan berkali-kali.
 */
function rapikanValidasiMaster() {
  var tabel = bacaTabel_(bukaSheetMaster_());
  var iStatus = kolomWajib_(tabel, KOLOM.STATUS);
  var sheet = tabel.sheet;
  var jumlahBaris = Math.max(sheet.getMaxRows() - 1, 1);
  sheet.getRange(2, 1, jumlahBaris, sheet.getMaxColumns()).clearDataValidations();
  sheet.getRange(2, iStatus + 1, jumlahBaris, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(DAFTAR_STATUS, true).setAllowInvalid(false).build()
  );
  Logger.log('Validasi Master Permintaan dirapikan: dropdown Status hanya di kolom "' + KOLOM.STATUS + '".');
}

/**
 * Cek baca-saja, TIDAK mengubah apa pun. Jalankan kapan saja kalau ada yang
 * terasa tidak beres; hasilnya di Execution log, "MASALAH" berarti perlu
 * ditindaklanjuti.
 */
function cekKesehatanSistem() {
  var masalah = 0;
  function cek(ok, pesan) {
    Logger.log((ok ? 'OK      ' : 'MASALAH ') + pesan);
    if (!ok) masalah++;
  }

  var tabel = bacaTabel_(bukaSheetMaster_());
  Object.keys(KOLOM).forEach(function (k) { cek(tabel.idx(KOLOM[k]) !== -1, 'Master Permintaan punya kolom "' + KOLOM[k] + '"'); });

  var iDeadline = tabel.idx(KOLOM.DEADLINE), iKebutuhan = tabel.idx(KOLOM.KEBUTUHAN), iKode = tabel.idx(KOLOM.KODE);
  var kodeTerlihat = {};
  tabel.data.forEach(function (baris, i) {
    if (!baris[iKode]) return;
    cek(!kodeTerlihat[baris[iKode]], 'Baris ' + (i + 2) + ': Kode Lowongan ' + baris[iKode] + ' unik');
    kodeTerlihat[baris[iKode]] = true;
    if (iDeadline !== -1) cek(!!bacaTanggal_(baris[iDeadline]), 'Baris ' + (i + 2) + ' (' + baris[iKode] + '): Deadline berisi tanggal (sekarang: "' + baris[iDeadline] + '")');
    if (iKebutuhan !== -1) cek(!!bacaBilanganBulat_(baris[iKebutuhan]), 'Baris ' + (i + 2) + ' (' + baris[iKode] + '): Jumlah Kebutuhan angka bulat >= 1');
  });

  var staging = bacaTabel_(bukaSheet_(bukaSpreadsheetMaster_(), SHEET_STAGING));
  var iStatusStaging = staging.idx('Status'), iWaktuStaging = staging.idx('Timestamp');
  staging.data.forEach(function (baris, i) {
    if (baris[iStatusStaging] !== STAGING_MENUNGGU) return;
    var umurJam = (new Date() - new Date(baris[iWaktuStaging])) / 3600000;
    cek(umurJam <= STAGING_BATAS_JAM, 'Staging baris ' + (i + 2) + ' masih "Menunggu Form" (' + Math.round(umurJam) + ' jam). Lebih dari ' + STAGING_BATAS_JAM + ' jam akan diabaikan otomatis.');
  });

  var formPermintaan = FormApp.openById(propWajib_(PROP_FORM_PERMINTAAN_ID));
  [JUDUL_UNIT_RS, JUDUL_DOKUMEN, JUDUL_PIC].forEach(function (judul) {
    cek(!!cariItemForm_(formPermintaan, judul), 'Form Permintaan punya pertanyaan "' + judul + '"');
  });

  DAFTAR_UNIT_RS.forEach(function (unit) {
    var form = FormApp.openById(unit.formId);
    [JUDUL_POSISI, JUDUL_PRODI, JUDUL_FAKULTAS, JUDUL_IPK, JUDUL_ALUMNI].forEach(function (judul) {
      cek(!!cariItemForm_(form, judul), unit.nama + ': Form Pelamar punya pertanyaan "' + judul + '"');
    });
    var ss = SpreadsheetApp.openById(unit.spreadsheetPelamarId);
    cek(!!cariSheetDenganKolom_(ss, JUDUL_POSISI), unit.nama + ': Spreadsheet Pelamar punya kolom "' + JUDUL_POSISI + '"');
    cek(!!cariSheetDenganKolom_(ss, 'Unggah CV (pdf)'), unit.nama + ': Spreadsheet Pelamar punya kolom "Unggah CV (pdf)"');
    cek(!!ss.getSheetByName(SHEET_REKAP), unit.nama + ': tab "' + SHEET_REKAP + '" ada');
  });

  var handler = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  ['isiMasterPermintaan', 'onEditMasterPermintaan', 'onSubmitPelamarBaru', 'onEditRekapPelamar',
   'hitungUlangJumlahPendaftar', 'autoFlagStatusLowongan'].forEach(function (h) {
    cek(handler.indexOf(h) !== -1, 'Trigger "' + h + '" terpasang');
  });

  Logger.log(masalah ? 'SELESAI: ' + masalah + ' MASALAH ditemukan, lihat baris bertanda MASALAH.' : 'SELESAI: semua cek OK.');
}
