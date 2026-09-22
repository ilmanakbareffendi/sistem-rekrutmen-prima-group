/**
 * SETUP FORM PERMINTAAN TENAGA KERJA - RS PRIMA GROUP (v2)
 * =========================================================
 * Perubahan dari versi sebelumnya:
 *   1. Satu submission Form sekarang bisa memuat SAMPAI 5 posisi
 *      sekaligus (Posisi ke-1 wajib, ke-2 s.d. ke-5 opsional),
 *      masing-masing dengan jumlah kebutuhan dan kualifikasinya
 *      sendiri. Setiap posisi yang terisi akan masuk sebagai baris
 *      terpisah di "Master Permintaan", lengkap dengan Kode Lowongan
 *      masing-masing.
 *   2. Dokumen pendukung sekarang berupa UNGGAH FILE langsung di
 *      Form (bukan tautan manual). File otomatis tersimpan ke folder
 *      Drive milik akun yang menjalankan skrip ini (akun CEDC).
 *   3. Karena Form memuat pertanyaan unggah file, Google otomatis
 *      mewajibkan pengisi untuk masuk (sign in) dengan akun Google
 *      sebelum bisa submit, dan skrip mengambil email tersebut dalam
 *      status TERVERIFIKASI (bukan hasil ketikan manual). Kolom
 *      "Email PIC Pengaju" manual dihapus karena sudah tergantikan.
 *
 * CATATAN: Google Form tidak punya tombol "tambah posisi" yang
 * benar-benar dinamis (tidak seperti Microsoft Forms). Solusi paling
 * stabil adalah menyediakan 5 slot posisi siap pakai, cukup untuk
 * kebutuhan realistis satu kali pengajuan. Jika suatu saat kebutuhan
 * lebih dari 5 posisi dalam satu pengajuan, RS tinggal mengisi Form
 * dua kali.
 *
 * CARA MENJALANKAN
 * -----------------
 * 1. Buka https://script.google.com -> New project.
 * 2. Hapus kode default, tempel seluruh isi file ini.
 * 3. Pilih fungsi "setupFormPermintaanRS" di toolbar, klik Run.
 * 4. Izinkan akses saat diminta (Drive, Forms, Sheets akun CEDC).
 * 5. Buka View > Logs untuk mengambil link Form dan Spreadsheet baru.
 * 6. Form dan Spreadsheet hasil versi sebelumnya (jika ada) tidak lagi
 *    dipakai, bisa dihapus dari Drive. Bagikan hanya link Form BARU
 *    ini ke HR Royal Prima dan Royal Prima Marelan, jangan bagikan
 *    Spreadsheet-nya.
 *
 * Jalankan fungsi ini HANYA SEKALI per pembuatan Form baru.
 */

var JUMLAH_SLOT_POSISI = 5;
var JUDUL_ITEM_DOKUMEN = 'Unggah Dokumen Pendukung (Surat Permintaan Resmi)';

function setupFormPermintaanRS() {

  // ---------- 1. BUAT FORM ----------
  var form = FormApp.create('Form Permintaan Tenaga Kerja - RS Prima Group');
  form.setDescription(
    'Form ini digunakan oleh tim HR RS Prima Group (Royal Prima dan Royal Prima ' +
    'Marelan) untuk menyampaikan kebutuhan tenaga kerja kepada CEDC UNPRI. ' +
    'Jika kebutuhan mencakup lebih dari satu posisi, isi Posisi ke-2 dan seterusnya ' +
    'pada pengajuan yang sama. Form ini meminta unggahan dokumen, sehingga Anda ' +
    'akan diminta masuk (sign in) dengan akun Google sebelum bisa mengirim jawaban.'
  );
  form.setCollectEmail(true); // email pengisi terekam otomatis dan terverifikasi

  // Unit RS
  form.addListItem()
      .setTitle('Unit RS')
      .setChoiceValues(['RS Royal Prima', 'RS Royal Prima Marelan'])
      .setRequired(true);

  // Validasi angka untuk jumlah kebutuhan
  var validasiAngka = FormApp.createTextValidation()
      .setHelpText('Isi dengan angka, contoh: 2')
      .requireNumber()
      .build();

  // 5 slot posisi (slot 1 wajib, slot 2-5 opsional)
  for (var i = 1; i <= JUMLAH_SLOT_POSISI; i++) {
    var wajib = (i === 1);
    form.addSectionHeaderItem()
        .setTitle('Posisi ke-' + i + (wajib ? ' (wajib diisi)' : ' (opsional, kosongkan jika tidak ada)'));
    form.addTextItem()
        .setTitle('Nama Posisi / Jabatan ' + i)
        .setRequired(wajib);
    form.addTextItem()
        .setTitle('Jumlah Kebutuhan ' + i)
        .setValidation(validasiAngka)
        .setRequired(wajib);
    form.addParagraphTextItem()
        .setTitle('Kualifikasi ' + i)
        .setHelpText('Contoh: D3/S1 Keperawatan, pengalaman minimal 1 tahun, memiliki STR aktif.')
        .setRequired(wajib);
  }

  // Deadline berlaku untuk satu pengajuan (batch)
  form.addDateItem()
      .setTitle('Deadline / Batas Waktu Pemenuhan')
      .setRequired(true);

  // Tag Campus Hiring
  form.addCheckboxItem()
      .setTitle('Tag Kebutuhan')
      .setChoiceValues(['Tandai untuk Rencana Campus Hiring'])
      .setRequired(false);

  // Unggah dokumen pendukung (PDF), menggantikan tautan manual
  form.addFileUploadItem()
      .setTitle(JUDUL_ITEM_DOKUMEN)
      .setHelpText('Unggah surat permintaan resmi dalam format PDF (maksimal 3 file).')
      .setFileTypes([FormApp.FileType.PDF])
      .setMaxFiles(3)
      .setRequired(true);

  // PIC pengaju (nama saja, email diambil otomatis dari akun Google yang sign in)
  form.addTextItem()
      .setTitle('Nama PIC Pengaju')
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
  sheetMaster.setName('Master Permintaan');

  // ---------- 3. FORMAT SHEET "Master Permintaan" ----------
  var header = [
    'Kode Lowongan', 'Tanggal Masuk', 'Unit RS', 'Posisi', 'Jumlah Kebutuhan',
    'Kualifikasi', 'Deadline', 'Tag Campus Hiring', 'Tautan Dokumen',
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
      .requireValueInList(['Diterima', 'Diproses', 'Dipublikasikan', 'Ditutup'], true)
      .setAllowInvalid(false)
      .build();
  sheetMaster.getRange(2, 12, 999, 1).setDataValidation(validasiStatus);

  // ---------- 4. SIMPAN ID SPREADSHEET UNTUK DIPAKAI TRIGGER ----------
  PropertiesService.getScriptProperties().setProperty('MASTER_SS_ID', ss.getId());

  // ---------- 5. PASANG TRIGGER OTOMATIS SETIAP ADA RESPON BARU ----------
  ScriptApp.newTrigger('isiMasterPermintaan')
      .forForm(form)
      .onFormSubmit()
      .create();

  // ---------- 6. TAMPILKAN LINK DI LOG ----------
  Logger.log('Form (untuk dibagikan ke RS): ' + form.getPublishedUrl());
  Logger.log('Form (untuk diedit CEDC): ' + form.getEditUrl());
  Logger.log('Spreadsheet (jangan dibagikan ke RS): ' + ss.getUrl());
}


/**
 * Dipanggil otomatis setiap ada respon Form baru.
 * Memecah sampai 5 slot posisi menjadi baris terpisah di "Master
 * Permintaan", masing-masing dengan Kode Lowongan sendiri, dan
 * mengambil link file dokumen serta email terverifikasi dari respon.
 */
function isiMasterPermintaan(e) {
  var namedValues = e.namedValues;
  function ambil(judul) {
    return namedValues[judul] ? namedValues[judul][0] : '';
  }

  var unitRS = ambil('Unit RS');
  var deadline = ambil('Deadline / Batas Waktu Pemenuhan');
  var tagCampus = ambil('Tag Kebutuhan');
  var picNama = ambil('Nama PIC Pengaju');
  var emailVerifikasi = e.response.getRespondentEmail() || '';
  var linkDokumen = ambilLinkDokumen(e.response);

  var ssId = PropertiesService.getScriptProperties().getProperty('MASTER_SS_ID');
  var ss = SpreadsheetApp.openById(ssId);
  var sheetMaster = ss.getSheetByName('Master Permintaan');
  var prefixUnit = unitRS.indexOf('Marelan') !== -1 ? 'RPM' : 'RP';

  for (var i = 1; i <= JUMLAH_SLOT_POSISI; i++) {
    var posisi = ambil('Nama Posisi / Jabatan ' + i);
    if (!posisi) continue; // slot kosong, dilewati

    var jumlah = ambil('Jumlah Kebutuhan ' + i);
    var kualifikasi = ambil('Kualifikasi ' + i);
    var kode = buatKodeLowongan(sheetMaster, prefixUnit);

    sheetMaster.appendRow([
      kode, new Date(), unitRS, posisi, jumlah, kualifikasi, deadline,
      tagCampus, linkDokumen, picNama, emailVerifikasi, 'Diterima', '', ''
    ]);
  }
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
