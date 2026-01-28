# Script to fix commit messages
cd $PSScriptRoot

# Edit commit terbaru
git commit --amend -m "Update: improve GitHub guide documentation"

# Untuk commit kedua, kita perlu rebase
# Tapi untuk non-interactive, kita guna cara lain
# Reset ke commit sebelum commit kedua, kemudian buat commit baru
$secondCommit = "93e6d3f"
$firstCommit = "efc8b71"

# Checkout commit pertama
git reset --soft $firstCommit

# Add semua changes
git add .

# Buat commit baru dengan message yang betul
git commit -m "Update: improve GitHub guide documentation"

# Sekarang kita perlu force push
Write-Host "Selesai! Sekarang perlu force push dengan: git push --force"
Write-Host "⚠️ WARNING: Force push akan overwrite history di GitHub!"
