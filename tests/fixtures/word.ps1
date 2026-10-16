param([switch]$NoAddins)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
$testWord = $null
$testDocument = $null
try {
    if (Get-Process WINWORD -ErrorAction SilentlyContinue) { throw 'Word is already running; refusing to alter an existing session.' }
    if ($NoAddins) {
        $wordExecutable = (Get-ItemProperty 'Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\Winword.exe').'(default)'
        Start-Process -FilePath $wordExecutable -ArgumentList '/a', '/q' -WindowStyle Hidden | Out-Null
        $wordDeadline = [DateTime]::UtcNow.AddSeconds(20)
        do {
            Start-Sleep -Milliseconds 500
            try { $testWord = [Runtime.InteropServices.Marshal]::GetActiveObject('Word.Application') } catch { }
        } while (!$testWord -and [DateTime]::UtcNow -lt $wordDeadline)
        if (!$testWord) { throw 'Word /a did not register its automation interface.' }
    } else { $testWord = New-Object -ComObject Word.Application }
    $testWord.Visible = $true
    $testWord.DisplayAlerts = 0
    $testDocument = $testWord.Documents.Add()
    $testWord.Selection.TypeText('MATH-TEST:')
    [Console]::Out.WriteLine((@{ ready = $true; version = $testWord.Version } | ConvertTo-Json -Compress))
    while ($testCommand = [Console]::In.ReadLine()) {
        switch ($testCommand) {
            'read' { [Console]::Out.WriteLine((@{ text = $testDocument.Content.Text; images = $testDocument.InlineShapes.Count + $testDocument.Shapes.Count; name = $testDocument.Name; documents = $testWord.Documents.Count; active = $testWord.ActiveDocument.Name; activeImages = $testWord.ActiveDocument.InlineShapes.Count } | ConvertTo-Json -Compress)) }
            'focus' { $testDocument.Activate(); $testWord.Selection.EndKey(6) | Out-Null; [Console]::Out.WriteLine('{"focused":true}') }
            'close' { return }
        }
    }
} catch {
    [Console]::Out.WriteLine((@{ error = $_.Exception.Message } | ConvertTo-Json -Compress))
    exit 1
} finally {
    if ($testDocument) { $testDocument.Close(0); [Runtime.InteropServices.Marshal]::FinalReleaseComObject($testDocument) | Out-Null }
    if ($testWord) { $testWord.Quit(); [Runtime.InteropServices.Marshal]::FinalReleaseComObject($testWord) | Out-Null }
}
