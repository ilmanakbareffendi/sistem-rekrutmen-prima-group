/**
 * Rekap.gs - LAPIS 3: tab "Rekap per Lowongan" di tiap Spreadsheet Pelamar
 * ============================================================
 * RS memilih Kode Lowongan di sel B1, tabel di bawahnya menampilkan pelamar
 * lowongan itu, diurutkan dari Skor Prioritas tertinggi. Satu-satunya kolom
 * yang diisi RS adalah "Status Lamaran"; nilainya disimpan permanen di sheet
 * tersembunyi "Status Lamaran (data)" (kunci Timestamp + Email), karena tabel
 * ditulis ulang setiap kali disegarkan.
 *
 * SKOR PRIORITAS (sinyal bantu, bukan keputusan; maksimum +25, minimum -30):
 *   Lapis 1  Alumni UNPRI +5. Duplikat -10 (Email, WhatsApp, atau NIM sama
 *            untuk Kode Lowongan yang sama; submission paling awal yang sah).
 *   Lapis 2  IPK >= minimal: +1 per 0,1 di atas minimal, maks +5.
 *            IPK < minimal: -10. Data tidak lengkap: +0.
 *   Lapis 3  Program Studi & Fakultas relevan +15, salah satu +5, tidak
 *            relevan -10. Jawaban "Lainnya" dicocokkan lewat kata kunci.
 *   Bonus Alumni sengaja lebih kecil dari selisih relevansi/IPK, supaya
 *   pelamar non-alumni yang lebih relevan tetap bisa unggul.
 */

// ============================================================
// TRIGGER: EDIT DI TAB REKAP
// ============================================================

function onEditRekapPelamar(e) {
  var sheet = e.range.getSheet();
  if (sheet.getName() !== SHEET_REKAP) return;

  if (e.range.getA1Notation() === SEL_DROPDOWN_REKAP) {
    perbaruiRekapPelamar_(e.source.getId());
    return;
  }
  if (e.range.getRow() > BARIS_HEADER_REKAP) simpanEditStatusLamaran_(e);
}

// RS mengubah Status Lamaran di tabel: simpan permanen + perbarui Jumlah Diterima.
function simpanEditStatusLamaran_(e) {
  var sheet = e.range.getSheet();
  var header = sheet.getRange(BARIS_HEADER_REKAP, 1, 1, sheet.getLastColumn()).getValues()[0];
  var iStatus = indexHeader_(header, JUDUL_STATUS_LAMARAN);
  var iWaktu = indexHeader_(header, 'Timestamp');
  var iEmail = indexHeader_(header, 'Email Address');
  if (iStatus === -1 || iWaktu === -1 || iEmail === -1) return;
  if (e.range.getColumn() > iStatus + 1 || e.range.getLastColumn() < iStatus + 1) return;

  var ss = e.source;
  var sheetStatus = ambilSheetStatusLamaran_(ss);
  var nilai = sheet.getRange(e.range.getRow(), 1, e.range.getNumRows(), sheet.getLastColumn()).getValues();
  nilai.forEach(function (baris) {
    if (!baris[iWaktu] || !baris[iEmail]) return;
    simpanStatusLamaran_(sheetStatus, kunciStatusLamaran_(baris[iWaktu], baris[iEmail]), baris[iStatus]);
  });

  try {
    var unit = DAFTAR_UNIT_RS.filter(function (u) { return u.spreadsheetPelamarId === ss.getId(); })[0];
    if (unit) perbaruiJumlahDiterima_(unit, sheet.getRange(SEL_DROPDOWN_REKAP).getValue());
  } catch (err) {
    Logger.log('Status Lamaran tersimpan, tapi Jumlah Diterima gagal diperbarui (akan dikoreksi job jam-an): ' + err);
  }
}

// ============================================================
// PENYIMPANAN STATUS LAMARAN (sheet tersembunyi)
// ============================================================

function ambilSheetStatusLamaran_(ss) {
  var sheet = ss.getSheetByName(SHEET_STATUS_LAMARAN);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_STATUS_LAMARAN);
    sheet.getRange(1, 1, 1, 3).setValues([['Kunci (Timestamp + Email)', 'Status Lamaran', 'Terakhir Diubah']]).setFontWeight('bold');
    sheet.hideSheet();
  }
  return sheet;
}

// Timestamp sebagai angka epoch (tidak bergantung format tampilan) + email.
function kunciStatusLamaran_(waktu, email) {
  var ms = (waktu instanceof Date) ? waktu.getTime() : String(waktu);
  return ms + '||' + String(email || '').trim().toLowerCase();
}

function bacaPetaStatusLamaran_(sheetStatus) {
  var peta = {};
  var jumlah = Math.max(sheetStatus.getLastRow() - 1, 0);
  if (jumlah) {
    sheetStatus.getRange(2, 1, jumlah, 2).getValues().forEach(function (baris, i) {
      if (baris[0]) peta[baris[0]] = { status: baris[1], baris: i + 2 };
    });
  }
  return peta;
}

function simpanStatusLamaran_(sheetStatus, kunci, statusBaru) {
  var ada = bacaPetaStatusLamaran_(sheetStatus)[kunci];
  if (ada) {
    sheetStatus.getRange(ada.baris, 2, 1, 2).setValues([[statusBaru, new Date()]]);
  } else {
    sheetStatus.appendRow([kunci, statusBaru, new Date()]);
  }
}

// ============================================================
// TABEL REKAP
// ============================================================

/**
 * Tulis ulang tab Rekap satu Spreadsheet Pelamar: isi dropdown B1 dengan
 * semua Kode Lowongan yang pernah dilamar, lalu tabel pelamar untuk kode
 * yang sedang terpilih. Aman dipanggil berkali-kali.
 */
function perbaruiRekapPelamar_(spreadsheetId) {
  var ss = SpreadsheetApp.openById(spreadsheetId);
  var sheetRekap = ss.getSheetByName(SHEET_REKAP) || buatSheetRekap_(ss);
  var sheetPelamar = cariSheetDenganKolom_(ss, JUDUL_POSISI);
  if (!sheetPelamar) {
    Logger.log(ss.getName() + ': sheet jawaban dengan kolom "' + JUDUL_POSISI + '" tidak ditemukan, Rekap dilewati.');
    return;
  }

  var pelamar = bacaTabel_(sheetPelamar);
  var header = pelamar.header, data = pelamar.data;
  var k = {
    waktu: pelamar.idx('Timestamp'),
    email: pelamar.idx('Email Address'),
    nama: pelamar.idx('Nama Lengkap'),
    wa: pelamar.idx('Nomor WhatsApp Aktif'),
    cv: pelamar.idx('Unggah CV (pdf)'),
    alumni: pelamar.idx(JUDUL_ALUMNI),
    fakultas: pelamar.idx(JUDUL_FAKULTAS),
    fakultasLainnya: pelamar.idx(JUDUL_FAKULTAS_LAINNYA),
    prodi: pelamar.idx(JUDUL_PRODI),
    prodiLainnya: pelamar.idx(JUDUL_PRODI_LAINNYA),
    ipk: pelamar.idx(JUDUL_IPK),
    nim: pelamar.idx('NIM'),
    posisi: pelamar.idx(JUDUL_POSISI)
  };
  k.duplikat = petaDuplikat_(data, k);

  // Dropdown B1: semua Kode Lowongan yang pernah dilamar.
  var daftarKode = {};
  data.forEach(function (baris) { var kode = ekstrakKodeLowongan_(baris[k.posisi]); if (kode) daftarKode[kode] = true; });
  daftarKode = Object.keys(daftarKode).sort();
  var selDropdown = sheetRekap.getRange(SEL_DROPDOWN_REKAP);
  if (daftarKode.length) {
    selDropdown.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(daftarKode, true).setAllowInvalid(false).build());
  } else {
    selDropdown.clearDataValidations();
  }

  var kodeTerpilih = selDropdown.getValue();
  var lowongan = dataLowongan_(kodeTerpilih);
  var petaStatus = bacaPetaStatusLamaran_(ambilSheetStatusLamaran_(ss));

  // Urutan kolom: Skor Prioritas, Status Lamaran, Nama Lengkap (tiga ini
  // di-freeze), lalu kolom asli Form, lalu Catatan Otomatis Sistem, Rincian
  // Skor, Timestamp di ujung.
  var kolomSisa = header.map(function (_, i) { return i; }).filter(function (i) { return i !== k.nama && i !== k.waktu; });
  var judulNama = k.nama !== -1 ? header[k.nama] : 'Nama Lengkap';
  var judulWaktu = k.waktu !== -1 ? header[k.waktu] : 'Timestamp';
  var headerTabel = ['Skor Prioritas', JUDUL_STATUS_LAMARAN, judulNama]
      .concat(kolomSisa.map(function (i) { return header[i]; }))
      .concat([JUDUL_CATATAN_OTOMATIS, 'Rincian Skor', judulWaktu]);
  var lebar = headerTabel.length;

  var baris = [];
  data.forEach(function (b, i) {
    if (ekstrakKodeLowongan_(b[k.posisi]) !== kodeTerpilih) return;
    var simpanan = (k.waktu !== -1 && k.email !== -1) ? petaStatus[kunciStatusLamaran_(b[k.waktu], b[k.email])] : null;
    var skor = hitungSkorPrioritas_(b, i, k, lowongan);
    baris.push({
      skor: skor.skor,
      isi: [skor.skor, simpanan ? simpanan.status : STATUS_LAMARAN_DEFAULT, k.nama !== -1 ? b[k.nama] : '']
          .concat(kolomSisa.map(function (j) { return b[j]; }))
          .concat([catatanOtomatis_(b, i, k), skor.rincian, k.waktu !== -1 ? b[k.waktu] : ''])
    });
  });
  baris.sort(function (a, b) { return b.skor - a.skor; });
  baris = baris.map(function (x) { return x.isi; });

  // Bersihkan isi, validasi, DAN format lama sekaligus (ketiganya terpisah di
  // Apps Script; sisa format/validasi lama pernah membuat skor tampil sebagai
  // tanggal dan teks ditolak validasi).
  var maxBaris = sheetRekap.getMaxRows();
  if (maxBaris >= BARIS_HEADER_REKAP) {
    var bersih = sheetRekap.getRange(BARIS_HEADER_REKAP, 1, maxBaris - BARIS_HEADER_REKAP + 1, Math.max(sheetRekap.getMaxColumns(), lebar));
    bersih.clearContent();
    bersih.clearDataValidations();
    bersih.clearFormat();
  }

  sheetRekap.getRange(BARIS_HEADER_REKAP, 1, 1, lebar).setValues([headerTabel]).setFontWeight('bold').setBackground('#f3f3f3');
  sheetRekap.setFrozenColumns(3);

  var kolSkor = 1, kolStatus = 2;
  var kolCV = k.cv !== -1 ? kolomSisa.indexOf(k.cv) + 4 : -1;

  sheetRekap.clearConditionalFormatRules();
  var rangeSkor = sheetRekap.getRange(BARIS_HEADER_REKAP + 1, kolSkor, 1000, 1);
  sheetRekap.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThanOrEqualTo(15).setBackground('#d9ead3').setRanges([rangeSkor]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberBetween(0, 14).setBackground('#fff2cc').setRanges([rangeSkor]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0).setBackground('#f4cccc').setRanges([rangeSkor]).build()
  ]);

  if (baris.length) {
    sheetRekap.getRange(BARIS_HEADER_REKAP + 1, 1, baris.length, lebar).setValues(baris);
    sheetRekap.getRange(BARIS_HEADER_REKAP + 1, kolStatus, baris.length, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(DAFTAR_STATUS_LAMARAN, true).setAllowInvalid(false).build());
    sheetRekap.getRange(BARIS_HEADER_REKAP + 1, kolSkor, baris.length, 1).setNumberFormat('0');
    if (kolCV > 0) {
      sheetRekap.getRange(BARIS_HEADER_REKAP + 1, kolCV, baris.length, 1)
          .setRichTextValues(baris.map(function (b) { return [tautanCV_(b[kolCV - 1])]; }));
    }
  }

  sheetRekap.getRange('A2').setValue(kodeTerpilih
    ? 'Menampilkan ' + baris.length + ' pelamar untuk Kode Lowongan "' + kodeTerpilih + '", diurutkan dari Skor Prioritas tertinggi.'
    : 'Pilih Kode Lowongan di sel B1 untuk melihat daftar pelamarnya di sini.');
}

function buatSheetRekap_(ss) {
  var sheet = ss.insertSheet(SHEET_REKAP, 0);
  sheet.getRange('A1').setValue('Pilih Kode Lowongan:').setFontWeight('bold');
  sheet.getRange('A2').setValue('Pilih Kode Lowongan di sel B1 untuk melihat daftar pelamarnya di sini.');
  sheet.setFrozenRows(BARIS_HEADER_REKAP);
  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 220);
  return sheet;
}

// "Lihat CV" (satu file) atau "CV 1 | CV 2" (beberapa file) sebagai tautan.
function tautanCV_(nilaiSel) {
  var link = pecahDaftarKoma_(nilaiSel);
  if (!link.length) return SpreadsheetApp.newRichTextValue().setText('').build();
  var label = link.length === 1 ? ['Lihat CV'] : link.map(function (_, i) { return 'CV ' + (i + 1); });
  var builder = SpreadsheetApp.newRichTextValue().setText(label.join(' | '));
  var posisi = 0;
  label.forEach(function (l, i) {
    builder.setLinkUrl(posisi, posisi + l.length, link[i]);
    posisi += l.length + 3;
  });
  return builder.build();
}

// ============================================================
// DATA LOWONGAN, DUPLIKAT, CATATAN, SKOR
// ============================================================

// IPK Minimal + Program Studi/Fakultas Relevan satu Kode Lowongan dari Master Permintaan.
function dataLowongan_(kode) {
  if (!kode) return null;
  var tabel = bacaTabel_(bukaSheetMaster_());
  var iKode = kolomWajib_(tabel, KOLOM.KODE);
  var iIPK = tabel.idx(KOLOM.IPK_MIN), iProdi = tabel.idx(KOLOM.PRODI_REL), iFak = tabel.idx(KOLOM.FAKULTAS_REL);
  for (var i = 0; i < tabel.data.length; i++) {
    var b = tabel.data[i];
    if (b[iKode] !== kode) continue;
    var ipk = iIPK !== -1 ? parseFloat(b[iIPK]) : NaN;
    return {
      ipkMinimal: isNaN(ipk) ? null : ipk,
      programStudiRelevan: iProdi !== -1 ? pecahDaftarKoma_(b[iProdi]) : [],
      fakultasRelevan: iFak !== -1 ? pecahDaftarKoma_(b[iFak]) : []
    };
  }
  return null;
}

// Index baris (di data utuh) yang merupakan duplikat untuk Kode Lowongan yang sama.
function petaDuplikat_(data, k) {
  var grup = {};
  function tambah(jenis, kode, nilai, i) {
    nilai = String(nilai || '').trim().toLowerCase();
    if (!nilai || !kode) return;
    var kunci = jenis + '||' + kode + '||' + nilai;
    (grup[kunci] = grup[kunci] || []).push(i);
  }
  data.forEach(function (b, i) {
    var kode = ekstrakKodeLowongan_(b[k.posisi]);
    if (k.email !== -1) tambah('email', kode, b[k.email], i);
    if (k.wa !== -1) tambah('wa', kode, normalisasiWA_(b[k.wa]), i);
    if (k.nim !== -1 && k.alumni !== -1 && b[k.alumni] === 'Ya') tambah('nim', kode, b[k.nim], i);
  });

  var duplikat = {};
  Object.keys(grup).forEach(function (kunci) {
    var daftar = grup[kunci];
    if (daftar.length < 2) return;
    var awal = daftar[0];
    if (k.waktu !== -1) daftar.forEach(function (i) { if (data[i][k.waktu] < data[awal][k.waktu]) awal = i; });
    daftar.forEach(function (i) { if (i !== awal) duplikat[i] = true; });
  });
  return duplikat;
}

// 0812..., +62812..., 62812... dianggap nomor yang sama.
function normalisasiWA_(nomor) {
  var digit = String(nomor || '').replace(/\D/g, '');
  return digit.charAt(0) === '0' ? '62' + digit.substring(1) : digit;
}

function catatanOtomatis_(b, i, k) {
  var kurang = [];
  if (k.nama !== -1 && !b[k.nama]) kurang.push('Nama Lengkap');
  if (k.wa !== -1 && !b[k.wa]) kurang.push('Nomor WhatsApp');
  if (k.cv !== -1 && !b[k.cv]) kurang.push('CV');
  if (k.alumni !== -1 && b[k.alumni] === 'Ya') {
    if (k.nim !== -1 && !b[k.nim]) kurang.push('NIM');
    if (k.ipk !== -1 && !b[k.ipk]) kurang.push('IPK (wajib untuk Alumni)');
  }
  if (k.prodi !== -1 && b[k.prodi] === NILAI_PRODI_LAINNYA && k.prodiLainnya !== -1 && !b[k.prodiLainnya]) {
    kurang.push('Program Studi Lainnya (dipilih "Lainnya" tapi belum dituliskan manual)');
  }
  if (k.fakultas !== -1 && b[k.fakultas] === NILAI_FAKULTAS_LAINNYA && k.fakultasLainnya !== -1 && !b[k.fakultasLainnya]) {
    kurang.push('Fakultas Lainnya (dipilih "Lainnya" tapi belum dituliskan manual)');
  }
  var catatan = [];
  if (kurang.length) catatan.push('Data belum lengkap (' + kurang.join(', ') + ')');
  if (k.duplikat[i]) catatan.push('Duplikat, pernah melamar posisi ini sebelumnya');
  return catatan.join('; ');
}

function hitungSkorPrioritas_(b, i, k, lowongan) {
  var skor = 0, rincian = [];

  if (k.alumni !== -1 && b[k.alumni] === 'Ya') { skor += 5; rincian.push('Alumni UNPRI: +5'); }
  else rincian.push('Bukan alumni UNPRI: +0');
  if (k.duplikat[i]) { skor -= 10; rincian.push('Duplikat, pernah melamar posisi ini sebelumnya: -10'); }

  var ipk = k.ipk !== -1 && b[k.ipk] !== '' && b[k.ipk] !== null ? parseFloat(b[k.ipk]) : NaN;
  if (lowongan && lowongan.ipkMinimal !== null && !isNaN(ipk)) {
    var selisih = ipk - lowongan.ipkMinimal;
    if (selisih >= 0) {
      var bonus = Math.min(Math.round(selisih * 10), 5);
      skor += bonus;
      rincian.push('IPK ' + ipk + ' (minimal ' + lowongan.ipkMinimal + '): +' + bonus);
    } else {
      skor -= 10;
      rincian.push('IPK ' + ipk + ' di bawah minimal ' + lowongan.ipkMinimal + ': -10');
    }
  } else {
    rincian.push('IPK tidak dibandingkan (data belum lengkap): +0');
  }

  var cocokProdi = lowongan ? cocokDenganDaftar_(b[k.prodi], b[k.prodiLainnya], NILAI_PRODI_LAINNYA, lowongan.programStudiRelevan) : null;
  var cocokFak = lowongan ? cocokDenganDaftar_(b[k.fakultas], b[k.fakultasLainnya], NILAI_FAKULTAS_LAINNYA, lowongan.fakultasRelevan) : null;
  if (cocokProdi === null || cocokFak === null) {
    rincian.push('Relevansi Program Studi/Fakultas tidak diketahui (data lowongan belum lengkap): +0');
  } else if (cocokProdi && cocokFak) {
    skor += 15; rincian.push('Program Studi & Fakultas relevan: +15');
  } else if (cocokProdi || cocokFak) {
    skor += 5; rincian.push('Mungkin relevan (' + (cocokProdi ? 'Program Studi cocok, Fakultas tidak' : 'Fakultas cocok, Program Studi tidak') + '): +5');
  } else {
    skor -= 10; rincian.push('Program Studi & Fakultas tidak relevan: -10');
  }

  rincian.push('Skor Total: ' + skor);
  return { skor: skor, rincian: rincian.join(' | ') };
}

// Pilihan dari katalog dicocokkan persis; jawaban "Lainnya" lewat kata kunci.
// null kalau tidak bisa dinilai (data lowongan atau jawaban kosong).
function cocokDenganDaftar_(pilihan, teksLainnya, penandaLainnya, daftarTarget) {
  if (!daftarTarget || !daftarTarget.length || !pilihan) return null;
  if (pilihan !== penandaLainnya) return daftarTarget.indexOf(pilihan) !== -1;
  var token = tokenSignifikan_(teksLainnya);
  if (!token.length) return false;
  return daftarTarget.some(function (target) {
    var tokenTarget = tokenSignifikan_(target);
    return token.some(function (t) { return tokenTarget.indexOf(t) !== -1; });
  });
}

var STOPWORD_PRODI_ = ['sarjana', 'magister', 'profesi', 'doktor', 'doktoral', 'spesialis', 'pendidikan', 'dan', 'untuk'];

function tokenSignifikan_(teks) {
  return String(teks || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter(function (t) { return t && STOPWORD_PRODI_.indexOf(t) === -1; });
}
