/**
 * Code.gs - LAPIS 1: Web App RS + Form Permintaan -> Master Permintaan
 * ============================================================
 * Alur:
 *   1. RS mengisi Web App (Index.html): Unit RS, Deadline, Tag Campus
 *      Hiring, daftar posisi. buatLinkFormLanjutan menyimpannya di sheet
 *      "Staging Web (mentah)" lalu mengarahkan RS ke Form Permintaan.
 *   2. RS mengisi Form Permintaan (identitas, dokumen, PIC). Trigger
 *      isiMasterPermintaan menggabungkan jawaban Form + staging menjadi
 *      satu baris Master Permintaan PER POSISI.
 *
 * Staging dicocokkan lewat Unit RS. Staging yang lebih tua dari
 * STAGING_BATAS_JAM dianggap basi dan ditandai "Kedaluwarsa", supaya
 * pengajuan baru tidak pernah tertempel ke data lama/tes.
 *
 * PERUBAHAN WEB APP (Code.gs atau Index.html) baru berlaku untuk RS setelah
 * Deploy > Manage deployments > Version: New > Deploy.
 */

// ============================================================
// WEB APP
// ============================================================

function doGet() {
  var template = HtmlService.createTemplateFromFile('Index');
  template.katalogProdi = JSON.stringify(KATALOG_PRODI_FAKULTAS);
  return template.evaluate()
      .setTitle('Permintaan Tenaga Kerja - RS Prima Group')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Dipanggil Index.html. data = { unitRS, deadline: 'YYYY-MM-DD', tagCampus,
 * posisiList: [{ nama, jumlah, kualifikasi, ipkMinimal, programStudiRelevan[],
 * fakultasRelevan[] }] }. Mengembalikan URL Form Permintaan dengan Unit RS
 * sudah terisi.
 */
function buatLinkFormLanjutan(data) {
  var posisi = (data.posisiList || []).filter(function (p) { return p.nama; }).map(function (p) {
    return {
      nama: p.nama,
      jumlah: p.jumlah,
      kualifikasi: p.kualifikasi,
      ipkMinimal: p.ipkMinimal || '',
      programStudiRelevan: (p.programStudiRelevan || []).join(','),
      fakultasRelevan: (p.fakultasRelevan || []).join(',')
    };
  });

  var sheetStaging = bukaSheet_(bukaSpreadsheetMaster_(), SHEET_STAGING);
  // JSON, bukan teks dipisah enter/titik-koma, supaya Kualifikasi multi-baris aman.
  sheetStaging.appendRow([
    new Date(), data.unitRS, data.deadline, data.tagCampus ? NILAI_TAG_CAMPUS : '',
    JSON.stringify(posisi), STAGING_MENUNGGU
  ]);

  var form = FormApp.openById(propWajib_(PROP_FORM_PERMINTAAN_ID));
  var itemUnit = cariItemForm_(form, JUDUL_UNIT_RS);
  if (!itemUnit) throw new Error('Pertanyaan "' + JUDUL_UNIT_RS + '" tidak ditemukan di Form Permintaan.');
  return form.createResponse()
      .withItemResponse(itemUnit.asListItem().createResponse(data.unitRS))
      .toPrefilledUrl();
}

/** Master Gate: tombol "Buka Rekap Pelamar" di Web App. */
function ambilLinkRekapPelamar(unitRS) {
  return linkRekapPelamar_(unitRS_(unitRS));
}

// ============================================================
// TRIGGER: FORM PERMINTAAN DISUBMIT -> MASTER PERMINTAAN
// ============================================================

function isiMasterPermintaan(e) {
  var response = ambilResponseForm_(e);
  if (!response) {
    Logger.log('Gagal mengambil jawaban Form Permintaan. Submission ini TIDAK tercatat, cek manual sheet "Respon Mentah (otomatis)".');
    return;
  }

  var jawaban = {};
  response.getItemResponses().forEach(function (ir) {
    jawaban[String(ir.getItem().getTitle()).trim().toLowerCase()] = ir.getResponse();
  });
  function ambil(judul) { return jawaban[String(judul).trim().toLowerCase()] || ''; }

  var unitRS = ambil(JUDUL_UNIT_RS);
  var dokumen = ambil(JUDUL_DOKUMEN);
  var identitas = {
    unitRS: unitRS,
    pic: ambil(JUDUL_PIC),
    email: response.getRespondentEmail() || '',
    linkDokumen: (Array.isArray(dokumen) ? dokumen : []).map(function (id) {
      return 'https://drive.google.com/file/d/' + id + '/view';
    }).join(', ')
  };

  var ss = bukaSpreadsheetMaster_();
  var tabel = bacaTabel_(bukaSheet_(ss, SHEET_MASTER));
  var staging = ambilStaging_(bukaSheet_(ss, SHEET_STAGING), unitRS);
  var penomor = penomorKodeLowongan_(tabel, unitRS_(unitRS).prefixKode);
  var linkRekap = linkRekapPelamar_(unitRS_(unitRS));

  var barisBaru = [];
  if (!staging) {
    barisBaru.push(barisMaster_(tabel, penomor(), identitas, { nama: '(tidak ditemukan data dari Web App)' }, null, {
      status: STATUS.PERLU_DICEK,
      catatan: 'Form disubmit tanpa data Web App yang cocok (atau datanya sudah lebih dari ' + STAGING_BATAS_JAM + ' jam). Cek manual ke PIC.',
      linkRekap: linkRekap
    }));
  } else {
    parseDaftarPosisi_(staging.daftarPosisi).forEach(function (p) {
      if (!p.nama) return;
      barisBaru.push(barisMaster_(tabel, penomor(), identitas, p, staging, { status: STATUS.DITERIMA, linkRekap: linkRekap }));
    });
  }

  if (barisBaru.length) {
    tabel.sheet.getRange(tabel.sheet.getLastRow() + 1, 1, barisBaru.length, tabel.header.length).setValues(barisBaru);
  }
  Logger.log('Form Permintaan ' + unitRS + ': ' + barisBaru.length + ' baris ditambahkan ke Master Permintaan.');
}

// Satu baris Master Permintaan, disusun mengikuti urutan header yang ADA di sheet.
function barisMaster_(tabel, kode, identitas, posisi, staging, ekstra) {
  var nilai = {};
  nilai[KOLOM.KODE] = kode;
  nilai[KOLOM.TANGGAL] = new Date();
  nilai[KOLOM.UNIT] = identitas.unitRS;
  nilai[KOLOM.POSISI] = posisi.nama;
  nilai[KOLOM.KEBUTUHAN] = bacaBilanganBulat_(posisi.jumlah) || posisi.jumlah || '';
  nilai[KOLOM.KUALIFIKASI] = posisi.kualifikasi || '';
  nilai[KOLOM.IPK_MIN] = posisi.ipkMinimal !== undefined && posisi.ipkMinimal !== '' && !isNaN(parseFloat(posisi.ipkMinimal))
      ? parseFloat(posisi.ipkMinimal) : '';
  nilai[KOLOM.PRODI_REL] = posisi.programStudiRelevan || '';
  nilai[KOLOM.FAKULTAS_REL] = posisi.fakultasRelevan || '';
  nilai[KOLOM.DEADLINE] = staging ? (bacaTanggal_(staging.deadline) || staging.deadline) : '';
  nilai[KOLOM.TAG] = staging ? staging.tagCampus : '';
  nilai[KOLOM.DOKUMEN] = identitas.linkDokumen;
  nilai[KOLOM.PIC] = identitas.pic;
  nilai[KOLOM.EMAIL_PIC] = identitas.email;
  nilai[KOLOM.STATUS] = ekstra.status;
  nilai[KOLOM.CATATAN] = ekstra.catatan || '';
  nilai[KOLOM.LINK_REKAP] = ekstra.linkRekap || '';
  nilai[KOLOM.PENDAFTAR] = 0;
  nilai[KOLOM.DITERIMA] = 0;

  return tabel.header.map(function (judul) {
    for (var nama in nilai) {
      if (samaJudul_(judul, nama)) return nilai[nama];
    }
    return '';
  });
}

/**
 * Kode Lowongan berikutnya: RSP-<prefix>-<tahun>-<nomor>. Nomor = nomor
 * TERBESAR yang sudah ada + 1 (bukan jumlah baris), jadi tetap unik walau ada
 * baris yang dihapus. Mengembalikan fungsi penghasil kode berurutan.
 */
function penomorKodeLowongan_(tabel, prefix) {
  var awalan = 'RSP-' + prefix + '-' + new Date().getFullYear() + '-';
  var iKode = kolomWajib_(tabel, KOLOM.KODE);
  var terbesar = 0;
  tabel.data.forEach(function (baris) {
    var kode = String(baris[iKode] || '');
    if (kode.indexOf(awalan) === 0) terbesar = Math.max(terbesar, parseInt(kode.substring(awalan.length), 10) || 0);
  });
  return function () {
    terbesar++;
    return awalan + ('000' + terbesar).slice(-3);
  };
}

/**
 * Ambil staging "Menunggu Form" PALING LAMA untuk Unit RS ini yang umurnya
 * masih di bawah STAGING_BATAS_JAM, tandai "Terpakai". Staging Unit RS yang
 * sama tapi sudah basi ditandai "Kedaluwarsa" dan tidak dipakai.
 */
function ambilStaging_(sheetStaging, unitRS) {
  var tabel = bacaTabel_(sheetStaging);
  var iWaktu = kolomWajib_(tabel, 'Timestamp');
  var iUnit = kolomWajib_(tabel, 'Unit RS');
  var iDeadline = kolomWajib_(tabel, 'Deadline');
  var iTag = kolomWajib_(tabel, 'Tag Campus Hiring');
  var iPosisi = kolomWajib_(tabel, 'Daftar Posisi (mentah)');
  var iStatus = kolomWajib_(tabel, 'Status');

  var sekarang = new Date();
  var batasMs = STAGING_BATAS_JAM * 3600 * 1000;
  var terpilih = null;

  tabel.data.forEach(function (baris, i) {
    if (baris[iUnit] !== unitRS || baris[iStatus] !== STAGING_MENUNGGU) return;
    var waktu = baris[iWaktu] instanceof Date ? baris[iWaktu] : new Date(baris[iWaktu]);
    var nomorBaris = i + 2;
    if (isNaN(waktu.getTime()) || sekarang - waktu > batasMs) {
      sheetStaging.getRange(nomorBaris, iStatus + 1).setValue('Kedaluwarsa - ' + sekarang);
      return;
    }
    if (!terpilih) terpilih = { nomorBaris: nomorBaris, deadline: baris[iDeadline], tagCampus: baris[iTag], daftarPosisi: baris[iPosisi] };
  });

  if (terpilih) sheetStaging.getRange(terpilih.nomorBaris, iStatus + 1).setValue('Terpakai - ' + sekarang);
  return terpilih;
}

function parseDaftarPosisi_(teks) {
  try {
    var hasil = JSON.parse(teks);
    return Array.isArray(hasil) ? hasil : [];
  } catch (err) {
    Logger.log('Daftar posisi di staging bukan JSON valid: ' + err.message);
    return [];
  }
}

/**
 * Pada Form dengan pertanyaan File Upload, e.response kadang belum bisa
 * dibaca saat trigger terpicu. Coba 3x dengan jeda, lalu cadangan: ambil
 * response terbaru langsung dari Form.
 */
function ambilResponseForm_(e) {
  for (var i = 1; i <= 3; i++) {
    try {
      e.response.getId();
      return e.response;
    } catch (err) {
      Logger.log('Percobaan ' + i + ' membaca e.response gagal: ' + err.message);
      if (i < 3) Utilities.sleep(2000);
    }
  }
  try {
    var semua = FormApp.openById(propWajib_(PROP_FORM_PERMINTAAN_ID)).getResponses();
    if (semua.length) return semua[semua.length - 1];
  } catch (err2) {
    Logger.log('Cadangan getResponses() juga gagal: ' + err2.message);
  }
  return null;
}
