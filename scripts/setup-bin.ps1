# Baixa os binarios necessarios para o backend de YouTube (yt-dlp + ffmpeg) em ./bin
# Uso (Windows):  powershell -ExecutionPolicy Bypass -File scripts\setup-bin.ps1

$ErrorActionPreference = 'Stop'
$bin = Join-Path $PSScriptRoot '..\bin'
New-Item -ItemType Directory -Force -Path $bin | Out-Null

Write-Host 'Baixando yt-dlp.exe...'
Invoke-WebRequest -Uri 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' -OutFile (Join-Path $bin 'yt-dlp.exe')

if (-not (Test-Path (Join-Path $bin 'ffmpeg.exe'))) {
  Write-Host 'Baixando ffmpeg (~40MB)...'
  $zip = Join-Path $env:TEMP 'ffmpeg.zip'
  $tmp = Join-Path $env:TEMP 'ffmpeg_extract'
  Invoke-WebRequest -Uri 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -OutFile $zip
  if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
  Expand-Archive -Path $zip -DestinationPath $tmp -Force
  $ff = Get-ChildItem -Path $tmp -Recurse -Filter 'ffmpeg.exe'  | Select-Object -First 1
  $fp = Get-ChildItem -Path $tmp -Recurse -Filter 'ffprobe.exe' | Select-Object -First 1
  Copy-Item $ff.FullName (Join-Path $bin 'ffmpeg.exe')  -Force
  Copy-Item $fp.FullName (Join-Path $bin 'ffprobe.exe') -Force
  Remove-Item $zip, $tmp -Recurse -Force
}

Write-Host 'OK. Binarios em bin/:'
Get-ChildItem $bin | Select-Object Name, @{N = 'MB'; E = { [math]::Round($_.Length / 1MB, 1) } }
