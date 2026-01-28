# Panduan Update ke Hostinger

## 📋 Fail yang Telah Diubah

Perubahan hanya pada **FRONTEND**, backend **TIDAK PERLU** diupdate.

### Fail Baru:
- `frontend/components/common/ErrorBoundary.tsx` (BARU)

### Fail Diubah:
- `frontend/app/inventory/layout.tsx`
- `frontend/app/inventory/page.tsx`

---

## 🚀 Langkah-langkah Update

### 1. Build Frontend (Lokal)

Buka terminal di folder `frontend` dan jalankan:

```bash
cd frontend
npm run build
```

Ini akan generate semua fail static di folder `out/`

### 2. Upload ke Hostinger

Selepas build selesai, upload **SEMUA** fail dari folder `frontend/out/` ke Hostinger:

**Lokasi di Hostinger:** `public_html/`

#### Fail-fail yang perlu diupload:

**Folder Baru (jika ada):**
- `frontend/out/_next/` - Upload semua fail dalam folder ini

**Fail HTML yang diupdate:**
- `frontend/out/inventory.html` - **PENTING: Fail ini telah diupdate**
- `frontend/out/inventory.txt` - **PENTING: Fail ini telah diupdate**

**Fail JavaScript yang diupdate:**
- Semua fail dalam `frontend/out/_next/static/` - **PENTING: Upload semua**

**Fail Baru (jika ada):**
- Sebarang fail baru dalam `frontend/out/_next/` yang berkaitan dengan ErrorBoundary

### 3. Cara Upload

#### Pilihan 1: Upload via File Manager (Hostinger)
1. Login ke Hostinger File Manager
2. Navigate ke `public_html/`
3. Upload fail-fail yang disebut di atas
4. **Gantikan** fail yang sedia ada jika diminta

#### Pilihan 2: Upload Semua (Paling Selamat)
1. Backup folder `public_html/` di Hostinger (optional, tapi disyorkan)
2. Delete semua fail dalam `public_html/` (kecuali fail penting seperti `.htaccess` jika ada)
3. Upload **SEMUA** fail dari `frontend/out/` ke `public_html/`

### 4. Clear Browser Cache

Selepas upload:
1. Clear cache browser di mobile device
2. Atau buka PWA dalam "Incognito/Private Mode"
3. Atau uninstall dan install semula PWA

---

## ⚠️ PENTING

1. **Backend TIDAK perlu diupdate** - Perubahan hanya pada frontend
2. **Pastikan build berjaya** sebelum upload
3. **Backup fail lama** sebelum replace (optional tapi disyorkan)
4. **Clear cache** selepas upload untuk melihat perubahan

---

## 🔍 Checklist Sebelum Upload

- [ ] Build frontend berjaya (`npm run build`)
- [ ] Folder `out/` wujud dan ada fail
- [ ] Backup fail lama di Hostinger (optional)
- [ ] Sedia untuk upload fail

---

## 📝 Nota Teknikal

- Next.js menggunakan static export (`output: 'export'`)
- Semua fail dalam `out/` adalah fail static yang sedia untuk production
- ErrorBoundary akan ditangkap dalam JavaScript bundle
- Perubahan akan kelihatan selepas clear cache

---

## 🆘 Jika Masih Ada Masalah

1. Pastikan semua fail dari `out/` telah diupload
2. Clear cache browser/PWA
3. Check console browser untuk error (F12)
4. Pastikan build tidak ada error

