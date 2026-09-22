/**
 * FASE 2, BAGIAN 1: Pembuat Form Pendaftaran Pelamar
 * Sistem Rekrutmen Terpadu Prima Group
 *
 * CARA PAKAI:
 * 1. Buka Apps Script (bisa project baru, terpisah dari Code.gs Layer 1, atau ditambahkan
 *    sebagai file baru di project yang sama).
 * 2. Tempel seluruh isi file ini.
 * 3. Di dropdown pilihan fungsi (atas jendela editor), pilih jalankanRoyalPrima, klik Run.
 *    Setelah selesai, pilih jalankanRoyalPrimaMarelan, klik Run lagi.
 *    (Dua fungsi kecil ini cuma pembungkus supaya bisa dijalankan lewat dropdown tanpa
 *    perlu mengetik parameter secara manual.)
 * 4. Buka tab Execution Log (Lihat > Log Eksekusi) setelah tiap run, salin hasilnya.
 *    Hasil ini (formId dan Item ID) akan dipakai di Bagian 3 nanti untuk generate
 *    link otomatis dan membaca jawaban pelamar dengan aman.
 * 5. Langkah manual di UI Google Forms setelah form terbuat, tidak bisa diatur lewat
 *    script ini (Google memang melarang item File Upload dibuat lewat script):
 *      a. Tambahkan pertanyaan baru, taruh persis di antara "Nomor WhatsApp Aktif" dan
 *         "Apakah Anda Alumni UNPRI?". Judul: Unggah CV (PDF). Tipe pertanyaan:
 *         File Upload. Centang wajib diisi, lalu batasi tipe file yang diterima
 *         ke PDF saja lewat pengaturan item itu.
 *      b. Klik ikon Share di form, tambahkan email PIC RS terkait sebagai Editor.
 *      c. Buka tab Responses, klik ikon Sheets, tautkan ke spreadsheet baru untuk
 *         jadi sheet Pelamar Unit RS ini.
 *
 * CATATAN: karena setEmailCollectionType(VERIFIED) dipakai, pengisi form wajib
 * login akun Google. Email otomatis muncul di form (biasanya di paling atas,
 * di bawah judul dan deskripsi), dan otomatis tercatat sebagai kolom "Email
 * Address" di sheet respons, terpisah dari jawaban item item biasa.
 */

function buatFormPendaftaranPelamar(unitRS) {
  var form = FormApp.create('Form Pendaftaran Pelamar - ' + unitRS);
  form.setDescription(
    'Form pendaftaran pelamar untuk lowongan di ' + unitRS + '. ' +
    'Kode Lowongan akan terisi otomatis kalau form ini dibuka lewat link resmi dari CEDC UNPRI. ' +
    'Silakan login dengan akun Google untuk mengisi form ini.'
  );

  // Email tidak dibuat sebagai pertanyaan teks biasa, tapi lewat pengaturan
  // pengumpulan email bawaan Form, tipe VERIFIED. Ini otomatis mewajibkan
  // pengisi login akun Google, dan emailnya tercatat sendiri tanpa diketik
  // manual, jadi tidak bisa salah ketik atau dipalsukan.
  form.setEmailCollectionType(FormApp.EmailCollectionType.VERIFIED);

  // ===== Bagian Inti (wajib ada, dipakai backend) =====
  var kodeItem = form.addTextItem();
  kodeItem.setTitle('Kode Lowongan').setRequired(true);

  form.addTextItem().setTitle('Nama Lengkap').setRequired(true);
  form.addTextItem().setTitle('Nomor WhatsApp Aktif').setRequired(true);

  // Catatan: item "Unggah CV (PDF)" TIDAK dibuat di sini. Google secara sengaja
  // melarang item File Upload dibuat lewat script (FormApp.addFileUploadItem
  // akan gagal untuk form yang dibuat lewat Apps Script), jadi item ini harus
  // ditambahkan manual lewat UI Google Forms setelah form ini jadi. Lihat
  // langkah manual di komentar CARA PAKAI di atas.

  var alumniItem = form.addMultipleChoiceItem();
  alumniItem.setTitle('Apakah Anda Alumni UNPRI?').setRequired(true);

  // ===== Section: Data Alumni (cuma muncul kalau jawab Ya) =====
  var sectionAlumni = form.addPageBreakItem().setTitle('Data Alumni UNPRI');

  var fakultasItem = form.addListItem();
  fakultasItem.setTitle('Fakultas').setRequired(true);
  fakultasItem.setChoiceValues([
    'Fakultas Kedokteran dan Kedokteran Gigi',
    'Fakultas Ilmu Kesehatan',
    'Fakultas Keperawatan dan Kebidanan',
    'Fakultas Hukum',
    'Fakultas Ekonomi dan Bisnis',
    'Fakultas Pertanian',
    'Fakultas Psikologi',
    'Fakultas Bahasa dan Komunikasi',
    'Fakultas Sains dan Teknologi'
  ]);

  var nimItem = form.addTextItem();
  nimItem.setTitle('NIM').setRequired(true);

  // ===== Section: Pertanyaan Tambahan dari RS (kosong, diisi RS sendiri nanti) =====
  var sectionTambahan = form.addPageBreakItem().setTitle('Pertanyaan Tambahan dari ' + unitRS);
  sectionTambahan.setHelpText(
    'Bagian ini bebas ditambah oleh tim ' + unitRS + ' sesuai kebutuhan posisi yang dilamar.'
  );

  // ===== Percabangan: Ya -> Data Alumni, Tidak -> langsung ke Pertanyaan Tambahan =====
  alumniItem.setChoices([
    alumniItem.createChoice('Ya', sectionAlumni),
    alumniItem.createChoice('Tidak', sectionTambahan)
  ]);

  // ===== Catat Item ID field inti, dipakai Bagian 3 (link otomatis + baca jawaban aman) =====
  var konfigurasi = {
    unitRS: unitRS,
    formId: form.getId(),
    formEditUrl: form.getEditUrl(),
    formPublishedUrl: form.getPublishedUrl(),
    kodeLowonganItemId: kodeItem.getId(),
    alumniItemId: alumniItem.getId(),
    fakultasItemId: fakultasItem.getId(),
    nimItemId: nimItem.getId()
  };

  Logger.log(JSON.stringify(konfigurasi, null, 2));
  return konfigurasi;
}

// ===== Pembungkus, supaya bisa dipilih langsung dari dropdown Run tanpa ketik parameter =====
function jalankanRoyalPrima() {
  buatFormPendaftaranPelamar('Royal Prima');
}

function jalankanRoyalPrimaMarelan() {
  buatFormPendaftaranPelamar('Royal Prima Marelan');
}
