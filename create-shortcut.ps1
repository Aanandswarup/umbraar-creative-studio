# Creates a desktop shortcut that launches start-website.cmd
$desktop = [Environment]::GetFolderPath('Desktop')
$project = 'C:\Users\hp\FREEbuff 1ST PROJECT'
$lnkPath = Join-Path $desktop 'UMBRA Website.lnk'

$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut($lnkPath)
$lnk.TargetPath = Join-Path $project 'start-website.cmd'
$lnk.WorkingDirectory = $project
$lnk.Description = 'Start the UMBRA local server and open the site'
$lnk.IconLocation = '%SystemRoot%\System32\SHELL32.dll,13'
$lnk.Save()

Write-Output ("Created: " + $lnkPath)
