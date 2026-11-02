param([string]$Version='2.1.0',[switch]$RequireInstaller)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repo=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$binary=Join-Path $repo 'apps/desktop/src-tauri/target/release/precify-financy.exe'
if (!(Test-Path -LiteralPath $binary)) { throw "Missing Windows desktop executable: $binary. Run Tauri build --no-bundle first." }
$out=Join-Path $repo 'dist/desktop'
$folder=Join-Path $out "Precify-Financy-$Version"
New-Item -ItemType Directory -Force $folder | Out-Null
Copy-Item -LiteralPath $binary -Destination (Join-Path $folder 'precify-financy.exe') -Force
@'
Precify Financy — Windows portable pilot

Extract the ENTIRE ZIP and open precify-financy.exe.
Windows 10/11 x64 and Microsoft WebView2 Runtime are required.
The portable ZIP includes the Precify program and its web frontend,
but not the separate Microsoft WebView2 Runtime.

This is a pilot, not the v2.1.0 stable release.
Data are local to this application: export a backup from the browser before moving data.
Do not delete the original backup until a restore is verified.
No standalone Node.js server is required.
'@ | Set-Content -LiteralPath (Join-Path $folder 'README-PORTABLE.txt') -Encoding utf8
$zip=Join-Path $out "Precify-Financy-$Version-win64.zip"
Compress-Archive -Path (Join-Path $folder '*') -DestinationPath $zip -Force
$iscc=$env:PRECIFY_ISCC
if (!$iscc) { $iscc=Join-Path ${env:ProgramFiles(x86)} 'Inno Setup 6/ISCC.exe' }
if (!(Test-Path -LiteralPath $iscc)) { $iscc=Join-Path $env:LOCALAPPDATA 'Programs/Inno Setup 6/ISCC.exe' }
if (!(Test-Path -LiteralPath $iscc)) {
 if ($RequireInstaller) { throw 'Inno Setup 6 missing. Install it or set PRECIFY_ISCC.' }
 Write-Warning 'Inno Setup not found. Portable ZIP only.'
} else {
 & $iscc "/DAppVersion=$Version" "/DSourceDir=$folder" (Join-Path $repo 'installer/PrecifyFinancy.iss')
 if ($LASTEXITCODE -ne 0) { throw "Inno Setup failed: $LASTEXITCODE" }
}
$assets=@($zip)
$installer=Join-Path $out "Precify-Financy-$Version-setup.exe"
if (Test-Path -LiteralPath $installer) {$assets+= $installer}
$hashes=@($assets | ForEach-Object {"$((Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash.ToLowerInvariant())  $(Split-Path -Leaf $_)"})
$hashes | Set-Content -LiteralPath (Join-Path $out 'SHA256SUMS.txt') -Encoding ascii
Write-Host "Precify pilot packages: $out"
Get-ChildItem -LiteralPath $out -File | Select-Object Name,Length
