# Auto-edit rebase todo file
$todoFile = $args[0]
$content = Get-Content $todoFile
$newContent = $content -replace '^pick 93e6d3f.*', 'reword 93e6d3f Update: improve GitHub guide documentation' -replace '^pick 1d7e4ca.*', 'reword 1d7e4ca Update: improve GitHub guide documentation'
$newContent | Set-Content $todoFile
