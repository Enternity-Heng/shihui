param([ValidateSet('install','upgrade','uninstall')][string]$Mode = 'install', [switch]$Baseline)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$testWorkspace = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$testInstall = [IO.Path]::GetFullPath((Join-Path $testWorkspace 'test-results\安装 生命周期'))
$testBoundary = [IO.Path]::GetFullPath((Join-Path $testWorkspace 'test-results')) + [IO.Path]::DirectorySeparatorChar
if (-not $testInstall.StartsWith($testBoundary, [StringComparison]::OrdinalIgnoreCase)) { throw 'Test install path is outside the workspace test directory.' }
$testExisting = @(Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -in @('数学输入助手','公式匣','式绘') })
foreach ($testEntry in $testExisting) {
    if (-not ($testEntry.UninstallString -like ('*' + $testInstall + '*'))) { throw 'An existing user installation was found; refusing to replace it.' }
}
if ($Mode -eq 'uninstall') {
    $testUninstaller = Get-ChildItem -LiteralPath $testInstall -Filter 'Uninstall*.exe' | Select-Object -First 1
    if (-not $testUninstaller) { throw 'No test uninstaller was found.' }
    if (-not $testUninstaller.FullName.StartsWith($testBoundary, [StringComparison]::OrdinalIgnoreCase)) { throw 'Uninstaller path is outside the test directory.' }
    $testProcess = Start-Process -FilePath $testUninstaller.FullName -ArgumentList '/S' -PassThru -Wait -WindowStyle Hidden
    if ($testProcess.ExitCode -ne 0) { throw "Uninstaller exit code: $($testProcess.ExitCode)" }
    $testDeadline = [DateTime]::UtcNow.AddSeconds(15)
    while ((Test-Path -LiteralPath (Join-Path $testInstall 'MathInputAssistant.exe')) -and [DateTime]::UtcNow -lt $testDeadline) { Start-Sleep -Milliseconds 200 }
    if (Test-Path -LiteralPath (Join-Path $testInstall 'MathInputAssistant.exe')) { throw 'The test executable was not removed.' }
    Write-Output 'PASS uninstall: executable removed'
} else {
    $testPackage = Get-Content -LiteralPath (Join-Path $testWorkspace 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    $testInstallerName = if ($Baseline) { '公式匣-1.4.0-Setup-x64.exe' } else { $testPackage.productName + '-' + $testPackage.version + '-Setup-x64.exe' }; $testInstaller = Get-Item -LiteralPath (Join-Path $testWorkspace ('release\' + $testInstallerName))
    if (-not $testInstaller) { throw 'Build the installer first.' }
    $testProcess = Start-Process -FilePath $testInstaller.FullName -ArgumentList @('/S', "/D=$testInstall") -PassThru -Wait -WindowStyle Hidden
    if ($testProcess.ExitCode -ne 0) { throw "Installer exit code: $($testProcess.ExitCode)" }
    if (-not (Test-Path -LiteralPath (Join-Path $testInstall 'MathInputAssistant.exe'))) { throw 'The installed executable is missing.' }
    Write-Output "PASS ${Mode}: $testInstall"
}
