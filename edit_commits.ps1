# Script to edit commit messages
$env:GIT_SEQUENCE_EDITOR = "powershell -File `"$PSScriptRoot\rebase_editor.ps1`""
git rebase -i HEAD~2
