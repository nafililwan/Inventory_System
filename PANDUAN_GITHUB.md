# 📚 PANDUAN LENGKAP: Hantar Projek ke GitHub
## Untuk Intern Baru & Team Lain

---

## 🎯 **APA YANG KITA NAK BUAT?**
Kita nak upload semua kod projek Inventory System ni ke GitHub supaya:
- ✅ Intern baru boleh tengok dan belajar
- ✅ Team lain boleh adjust atau improve
- ✅ Semua orang boleh access kod dengan mudah
- ✅ Ada backup untuk kod kita

---

## 📋 **BAHAN-BAHAN YANG PERLU:**
1. ✅ Komputer dengan projek ni (dah ada!)
2. ✅ Akaun GitHub (kalau belum ada, kita buat dulu)
3. ✅ Git software (kita install dulu)

---

## 🚀 **LANGKAH 1: INSTALL GIT**

### Windows:
1. Pergi ke: https://git-scm.com/download/win
2. Download Git untuk Windows
3. Double-click file yang download
4. Klik "Next" untuk semua langkah (default setting dah okay)
5. Tunggu sampai siap install
6. Restart komputer (atau restart terminal/PowerShell)

### Check Git Dah Install:
1. Buka PowerShell atau Command Prompt
2. Taip: `git --version`
3. Kalau keluar nombor version (contoh: `git version 2.40.0`), bermakna dah okay! ✅

---

## 🚀 **LANGKAH 2: BUAT AKAUN GITHUB**

1. Pergi ke: https://github.com
2. Klik "Sign up" (atas kanan)
3. Isi maklumat:
   - Username (contoh: `jabil-inventory-team`)
   - Email
   - Password
4. Verify email (check inbox)
5. Login ke GitHub

---

## 🚀 **LANGKAH 3: BUAT REPOSITORY BARU DI GITHUB**

1. Login ke GitHub
2. Klik butang **"+"** (atas kanan) → pilih **"New repository"**
3. Isi maklumat:
   - **Repository name**: `inventory-system` (atau nama lain yang awak nak)
   - **Description**: "HR Store Inventory Management System"
   - **Visibility**: 
     - ✅ **Public** = semua orang boleh tengok (recommended untuk team)
     - 🔒 **Private** = hanya orang yang awak invite boleh tengok
   - ❌ **JANGAN** tick "Add a README file" (kita dah ada)
   - ❌ **JANGAN** tick "Add .gitignore" (kita dah ada)
   - ❌ **JANGAN** tick "Choose a license" (optional)
4. Klik **"Create repository"**

**⚠️ PENTING:** Selepas buat repository, GitHub akan tunjuk page dengan arahan. **JANGAN tutup page ni!** Kita akan guna URL repository tu nanti.

Contoh URL yang awak akan dapat:
```
https://github.com/username/inventory-system.git
```

---

## 🚀 **LANGKAH 4: SETUP GIT DI KOMPUTER**

### 4.1: Configure Git (First Time Only)

Buka PowerShell atau Command Prompt, taip:

```powershell
git config --global user.name "Nama Awak"
git config --global user.email "email@example.com"
```

**Contoh:**
```powershell
git config --global user.name "Ayana"
git config --global user.email "ayana@jabil.com"
```

### 4.2: Pergi ke Folder Projek

```powershell
cd c:\Users\ayana\Inventory_System
```

---

## 🚀 **LANGKAH 5: INITIALIZE GIT DI PROJEK**

### 5.1: Start Git Repository

```powershell
git init
```

Awak akan nampak mesej macam ni:
```
Initialized empty Git repository in c:/Users/ayana/Inventory_System/.git
```

### 5.2: Check Status

```powershell
git status
```

Awak akan nampak semua file yang belum di-add ke Git.

---

## 🚀 **LANGKAH 6: ADD FILE KE GIT**

### 6.1: Add Semua File

```powershell
git add .
```

**Apa maksud ni?**
- `git add .` = tambah semua file dalam folder ni ke Git
- `.` = semua file dalam folder sekarang

### 6.2: Check Status Lagi

```powershell
git status
```

Sekarang semua file akan jadi **hijau** (staged), maksudnya siap untuk commit.

---

## 🚀 **LANGKAH 7: COMMIT (Save Changes)**

### 7.1: Buat Commit Pertama

```powershell
git commit -m "Initial commit: Inventory System project"
```

**Apa maksud ni?**
- `commit` = save semua perubahan
- `-m` = message (mesej untuk terangkan apa yang awak buat)
- `"Initial commit..."` = mesej awak

### 7.2: Check Status

```powershell
git status
```

Kalau keluar "nothing to commit, working tree clean", bermakna dah okay! ✅

---

## 🚀 **LANGKAH 8: CONNECT KE GITHUB**

### 8.1: Add Remote Repository

Guna URL repository yang awak dapat dari Langkah 3:

```powershell
git remote add origin https://github.com/username/inventory-system.git
```

**⚠️ GANTI `username` dengan username GitHub awak!**

**Contoh:**
```powershell
git remote add origin https://github.com/jabil-inventory-team/inventory-system.git
```

### 8.2: Check Remote Dah Betul

```powershell
git remote -v
```

Awak akan nampak URL repository awak.

---

## 🚀 **LANGKAH 9: PUSH KE GITHUB**

### 9.1: Push Code

```powershell
git branch -M main
git push -u origin main
```

**Apa maksud ni?**
- `git branch -M main` = set branch utama sebagai "main"
- `git push` = upload semua kod ke GitHub
- `-u origin main` = set GitHub sebagai tempat upload utama

### 9.2: Login GitHub (Kalau Diminta)

Kalau diminta login:
1. GitHub akan buka browser
2. Login ke GitHub
3. Authorize Git untuk access
4. Kembali ke PowerShell

### 9.3: Tunggu Upload Selesai

Awak akan nampak progress macam ni:
```
Enumerating objects: 150, done.
Counting objects: 100% (150/150), done.
Writing objects: 100% (150/150), 2.5 MiB | 1.2 MiB/s, done.
```

---

## 🎉 **LANGKAH 10: CHECK DI GITHUB**

1. Pergi ke repository awak di GitHub
2. Refresh page
3. Awak akan nampak semua file projek awak! 🎊

**URL:** `https://github.com/username/inventory-system`

---

## 📝 **UNTUK UPDATE KOD LEPAS NI (Kalau Ada Perubahan)**

Setiap kali awak buat perubahan pada kod, ikut langkah ni:

### 1. Check Perubahan
```powershell
cd c:\Users\ayana\Inventory_System
git status
```

### 2. Add Perubahan
```powershell
git add .
```

### 3. Commit Perubahan
```powershell
git commit -m "Update: terangkan apa yang awak ubah"
```

**Contoh:**
```powershell
git commit -m "Update: tambah feature baru untuk stock management"
```

### 4. Push ke GitHub
```powershell
git push
```

---

## 👥 **BAGI AKSES KEPADA TEAM LAIN**

### Cara 1: Invite Collaborators (Recommended)

1. Pergi ke repository di GitHub
2. Klik tab **"Settings"** (atas)
3. Klik **"Collaborators"** (sidebar kiri)
4. Klik **"Add people"**
5. Masukkan username atau email GitHub mereka
6. Pilih permission:
   - **Read** = boleh tengok je
   - **Write** = boleh edit kod
   - **Admin** = boleh manage repository
7. Mereka akan dapat email invitation

### Cara 2: Buat Public Repository

Kalau repository awak **Public**, semua orang boleh tengok (tapi tak boleh edit kecuali awak invite).

---

## 🔒 **PERLINDUNGAN: JANGAN UPLOAD SENSITIVE DATA**

### File Yang JANGAN Upload:
- ❌ `.env` file (ada password database)
- ❌ `*.db` file (database file)
- ❌ `venv/` folder (Python virtual environment)
- ❌ `node_modules/` folder (Node.js packages)

**✅ Dah ada dalam `.gitignore`**, jadi Git takkan upload file-file ni.

### Kalau Terlepas Upload Sensitive Data:

1. **SEGERA** buang dari GitHub:
   - Delete file dari repository
   - Buat commit baru
2. **UBAH** semua password/API keys yang terlepas
3. **CHECK** `.gitignore` pastikan file tu ada dalam list

---

## 🆘 **MASALAH BIASA & CARA SELESAIKAN**

### Masalah 1: "git: command not found"
**Penyelesaian:** Git belum install. Install dulu (Langkah 1).

### Masalah 2: "fatal: not a git repository"
**Penyelesaian:** Awak bukan dalam folder projek. Taip:
```powershell
cd c:\Users\ayana\Inventory_System
```

### Masalah 3: "error: failed to push"
**Penyelesaian:** 
- Check internet connection
- Check URL remote betul ke:
  ```powershell
  git remote -v
  ```
- Kalau salah, betulkan:
  ```powershell
  git remote set-url origin https://github.com/username/inventory-system.git
  ```

### Masalah 4: "Authentication failed"
**Penyelesaian:**
- Login GitHub dalam browser
- Atau guna Personal Access Token:
  1. GitHub → Settings → Developer settings → Personal access tokens
  2. Generate new token
  3. Guna token sebagai password bila push

### Masalah 5: "Large files error"
**Penyelesaian:** 
- Check file besar dalam projek
- Tambah dalam `.gitignore` kalau tak perlu
- Atau guna Git LFS untuk file besar

---

## 📚 **COMMAND YANG KERAP GUNA**

```powershell
# Check status
git status

# Add semua file
git add .

# Commit perubahan
git commit -m "Mesej awak"

# Push ke GitHub
git push

# Tengok history commit
git log

# Undo perubahan (belum commit)
git checkout -- nama-file.txt

# Undo commit (tapi keep perubahan)
git reset --soft HEAD~1
```

---

## ✅ **CHECKLIST SEBELUM PUSH**

- [ ] Git dah install
- [ ] GitHub account dah ada
- [ ] Repository dah buat di GitHub
- [ ] `.gitignore` dah betul (jangan upload sensitive data)
- [ ] Semua file penting dah ada
- [ ] README.md dah update (optional)
- [ ] Test projek masih boleh run

---

## 🎓 **UNTUK INTERN BARU: CARA CLONE PROJEK**

Kalau intern baru nak download projek:

1. Pergi ke repository di GitHub
2. Klik butang **"Code"** (hijau)
3. Copy URL (contoh: `https://github.com/username/inventory-system.git`)
4. Buka terminal, taip:
   ```powershell
   git clone https://github.com/username/inventory-system.git
   cd inventory-system
   ```
5. Setup projek ikut README.md

---

## 📞 **BANTUAN TAMBAHAN**

Kalau ada masalah:
1. Check dokumentasi GitHub: https://docs.github.com
2. Google error message yang awak dapat
3. Tanya team yang dah biasa guna Git

---

## 🎉 **TAHNIAH!**

Sekarang projek awak dah ada di GitHub! Team lain boleh:
- ✅ Tengok kod
- ✅ Download dan test
- ✅ Suggest improvements
- ✅ Collaborate bersama

**Selamat coding! 🚀**

---

*Dibuat dengan ❤️ untuk team Jabil Inventory System*
