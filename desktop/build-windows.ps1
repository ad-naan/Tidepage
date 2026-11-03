param([string]$OutputDirectory = 'dist')
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
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
    Pop-Location
}
