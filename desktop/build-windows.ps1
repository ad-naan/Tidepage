param(
    [string]$OutputDirectory = 'dist',
    [string]$MsysRoot
)
$ErrorActionPreference = 'Stop'
$previousCgoEnabled = $env:CGO_ENABLED
$previousPath = $env:PATH
Push-Location $PSScriptRoot
try {
    # Fyne's native OpenGL driver requires CGO, even for a Windows-only build.
    $env:CGO_ENABLED = '1'
    $compiler = go env CC
    if ($LASTEXITCODE -ne 0) { throw 'Could not read the Go C compiler configuration.' }
    # Leave custom CC commands (which can include arguments) to Go to validate.
    if ($compiler -eq 'gcc' -and -not (Get-Command gcc -CommandType Application -ErrorAction SilentlyContinue)) {
        $msysRoots = @($MsysRoot, 'D:\msys2', 'C:\msys64', 'D:\msys64', 'C:\msys2') |
            Where-Object { $_ } | Select-Object -Unique
        $targetArch = go env GOARCH
        if ($LASTEXITCODE -ne 0) { throw 'Could not read the Go target architecture.' }
        # These GCC packages target amd64. Do not select them for other targets.
        if ($targetArch -eq 'amd64') {
            foreach ($root in $msysRoots) {
                foreach ($toolchain in @('ucrt64', 'mingw64')) {
                    $bin = Join-Path $root "$toolchain\bin"
                    if (Test-Path -LiteralPath (Join-Path $bin 'gcc.exe') -PathType Leaf) {
                        $env:PATH = "$bin;$env:PATH"
                        break
                    }
                }
                if ($env:PATH -ne $previousPath) { break }
            }
        }
    }
    if ($compiler -eq 'gcc' -and -not (Get-Command gcc -CommandType Application -ErrorAction SilentlyContinue)) {
        foreach ($root in $msysRoots) {
            $bash = Join-Path $root 'usr\bin\bash.exe'
            if (Test-Path -LiteralPath $bash -PathType Leaf) {
                throw "MSYS2 was found at $root, but MinGW-w64 GCC is missing for the Go target. For amd64, run in PowerShell: & '$bash' -lc 'pacman -S --needed mingw-w64-ucrt-x86_64-gcc'. Then rerun this script."
            }
        }
        foreach ($root in $msysRoots) {
            $installer = Join-Path $root 'msys2.exe'
            if (Test-Path -LiteralPath $installer -PathType Leaf) {
                throw "MSYS2 is incomplete at $root (bash.exe is missing). Keep the installer outside the installation directory to avoid overwriting the running msys2.exe. Install to a separate directory, such as D:\msys64, then install MinGW-w64 GCC and rerun this script."
            }
        }
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
    $env:PATH = $previousPath
    Pop-Location
}
