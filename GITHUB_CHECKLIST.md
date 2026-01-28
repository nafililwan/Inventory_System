# ✅ Checklist: Hantar Projek ke GitHub

## Setup Awal (First Time Only)
- [ ] Install Git: https://git-scm.com/download/win
- [ ] Buat GitHub account: https://github.com
- [ ] Buat repository baru di GitHub
- [ ] Copy URL repository (contoh: `https://github.com/username/inventory-system.git`)

## Setup Git di Komputer
- [ ] Configure Git:
  ```powershell
  git config --global user.name "Nama Awak"
  git config --global user.email "email@example.com"
  ```
- [ ] Pergi ke folder projek:
  ```powershell
  cd c:\Users\ayana\Inventory_System
  ```

## Initialize & Push
- [ ] Initialize Git:
  ```powershell
  git init
  ```
- [ ] Add semua file:
  ```powershell
  git add .
  ```
- [ ] Commit:
  ```powershell
  git commit -m "Initial commit: Inventory System project"
  ```
- [ ] Connect ke GitHub (ganti `username` dengan username awak):
  ```powershell
  git remote add origin https://github.com/username/inventory-system.git
  ```
- [ ] Push ke GitHub:
  ```powershell
  git branch -M main
  git push -u origin main
  ```
- [ ] Check di GitHub - semua file dah ada! ✅

## Update Lepas Ni (Kalau Ada Perubahan)
- [ ] `git add .`
- [ ] `git commit -m "Update: terangkan perubahan"`
- [ ] `git push`

---
**📖 Untuk panduan lengkap, baca: PANDUAN_GITHUB.md**
