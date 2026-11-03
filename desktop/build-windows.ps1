param([string]$OutputDirectory = 'dist')
$ErrorActionPreference = 'Stop'
$previousCgoEnabled = $env:CGO_ENABLED
Push-Location $PSScriptRoot
try {
    # Fyne's native OpenGL driver requires CGO, even for a Windows-only build.
    $env:CGO_ENABLED = '1'
    $compiler = go env CC
    if ($LASTEXITCODE -ne 0) { throw 'Could not read the Go C compiler configuration.' }
    # Leave custom CC commands (which can include arguments) to Go to validate.
    if ($compiler -eq 'gcc' -and -not (Get-Command gcc -CommandType Application -ErrorAction SilentlyContinue)) {
        throw @'
Fyne requires a MinGW-w64 C compiler, but gcc.exe is not on PATH.
First download and install MSYS2 from https://www.msys2.org/ to C:\msys64.
After installation, run these commands in PowerShell (adjust paths if needed):
  & 'C:\msys64\usr\bin\bash.exe' -lc 'pacman -S --needed mingw-w64-ucrt-x86_64-gcc'
  $env:PATH = "C:\msys64\ucrt64\bin;$env:PATH"
  .\build-windows.ps1
pacman is part of MSYS2; it is not a PowerShell command.
See desktop/README.md for development commands and CGO setup.
'@
    }
    $exe = Join-Path $OutputDirectory 'TidepageCompanion.exe'
    go build -trimpath -ldflags '-s -w -H=windowsgui' -o $exe ./cmd/companion
    if ($LASTEXITCODE -ne 0) { throw 'Windows build failed.' }

    # PE optional header Subsystem is at offset 68 in both PE32 and PE32+.
    $bytes = [IO.File]::ReadAllBytes((Resolve-Path $exe))
    $peOffset = [BitConverter]::ToInt32($bytes, 0x3c)
    if ([BitConverter]::ToUInt16($bytes, $peOffset + 24 + 68) -ne 2) {
        throw 'Expected a Windows GUI executable.'
    }
    Write-Output (Resolve-Path $exe).Path
} finally {
    $env:CGO_ENABLED = $previousCgoEnabled
    Pop-Location
}
