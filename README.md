# Sistem Rekrutmen Terpadu Prima Group

Sistem Google Apps Script yang menghubungkan CEDC UNPRI dengan tim HR RS Royal Prima dan RS Royal Prima Marelan, menggantikan alur permintaan tenaga kerja dan pendaftaran pelamar yang tadinya manual (WA, email, Excel tersebar) dengan satu alur tersentralisasi.

Alur singkat: RS mengajukan kebutuhan tenaga kerja lewat Web App, masuk ke Master Permintaan (Google Sheet), CEDC publikasikan, pelamar mendaftar lewat Form per Unit RS, jawaban masuk ke Spreadsheet Pelamar milik Unit RS itu, sistem otomatis membuat rekap terfilter per lowongan lengkap dengan Skor Prioritas dan status lamaran.

Penjelasan arsitektur lengkap, status fitur, dan rencana ke depan ada di dokumen project Claude "Sosialisasi Alumni" (`sistem-rekrutmen-prima-group.md`). README ini fokus ke isi repo dan cara pakainya.

## Isi folder `apps-script/`

Keempat file ini dijalankan sebagai SATU project Google Apps Script yang sama (bukan project terpisah):

- **Code.gs** — Lapis 1: backend Web App, mengisi Master Permintaan, migrasi kolom.
- **Index.html** — Lapis 1: form Web App (frontend) untuk RS mengajukan kebutuhan tenaga kerja.
- **Fase2_BuatFormPendaftaranPelamar.gs** — pembuat awal Form Pendaftaran Pelamar, dijalankan sekali per Unit RS saat setup pertama.
- **Fase2_Bagian3_LinkOtomatis.gs** — file paling aktif berubah: dropdown posisi otomatis, semua trigger (onEdit, jam-an, realtime submit), Skor Prioritas, tab Rekap per Lowongan, share folder CV otomatis ke RS.

Folder `arsip/` berisi `SetupFormPermintaanRS.gs`, versi Lapis 1 yang lebih lama (sebelum diganti arsitektur Web App + Code.gs). Disimpan sebagai riwayat saja, jangan dijalankan sebagai bagian dari sistem yang aktif sekarang.

## Cara pakai (deploy ke Apps Script)

Apps Script tidak baca folder ini secara langsung. Untuk menerapkan perubahan, isi tiap file di atas ditempel/ditimpa ke file yang sesuai namanya di editor Apps Script (script.google.com), pada project yang sama dengan Master Permintaan. Instruksi setup lebih rinci (urutan migrasi, fungsi apa saja yang perlu dijalankan sekali) ada di komentar di bagian paling atas tiap file `.gs`.

## Kenapa disimpan di GitHub

Supaya setiap perubahan kode tercatat rapi (siapa mengubah apa, kapan, kenapa), bisa dibandingkan antar versi, dan bisa dikembalikan ke versi sebelumnya kalau ada perbaikan yang ternyata bermasalah. Ini terpisah dari, dan melengkapi, dokumen arsitektur di project Claude yang menyimpan konteks dan keputusan desain.
