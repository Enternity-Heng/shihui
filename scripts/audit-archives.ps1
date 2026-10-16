$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$auditRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$auditPackage = Get-Content -LiteralPath (Join-Path $auditRoot 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$auditReports = @()
$auditSourceLabel = ([string][char]0x6E90) + [char]0x7801
foreach ($auditKind in @('Windows-x64', $auditSourceLabel)) {
    $auditPath = Join-Path $auditRoot ('release\' + $auditPackage.productName + '-' + $auditPackage.version + '-' + $auditKind + '.zip')
    $auditZip = [IO.Compression.ZipFile]::OpenRead($auditPath)
    try {
        $auditNames = @($auditZip.Entries | ForEach-Object FullName)
        $auditForbidden = @($auditNames | Where-Object { $_ -match '(^|[\\/])(\.test-profile|test-results|history-images|.implementation-baseline)([\\/]|$)|(^|[\\/])(history|favorites|settings|commands|history-generation|state)\.json$' })
        if ($auditForbidden.Count -gt 0) { throw ('Personal data paths in archive: ' + ($auditForbidden -join ', ')) }
        if ($auditKind -eq $auditSourceLabel) {
            foreach ($auditRequired in @('src/main/capture.ts','src/main/storage.ts','src/core/symbol-names.ts','src/core/image-style.ts','package-lock.json','src/renderer/workbench.css')) {
                if (-not ($auditNames | Where-Object { $_.Replace('\','/') -eq $auditRequired })) { throw ('Missing source: ' + $auditRequired) }
            }
            if (-not ($auditNames | Where-Object { $_.Replace('\','/').StartsWith('docs/') })) { throw 'Missing source documentation' }
        }
        $auditReports += [PSCustomObject]@{ archive = [IO.Path]::GetFileName($auditPath); entries = $auditNames.Count; personalDataPaths = $auditForbidden.Count }
    } finally { $auditZip.Dispose() }
}
$auditReports | ConvertTo-Json -Compress
