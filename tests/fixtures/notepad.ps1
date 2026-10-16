param([string]$Title, [ValidateSet('focus','read')][string]$Mode = 'focus')
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
if (-not $Title.StartsWith('MATH-COMPAT-NOTEPAD-')) { throw 'Only a named test document is allowed.' }
$testProcess = Get-Process Notepad -ErrorAction Stop | Where-Object { $_.MainWindowTitle.Contains($Title) } | Select-Object -First 1
if (-not $testProcess) { throw 'The named test document is not active.' }
$testRoot = [Windows.Automation.AutomationElement]::FromHandle($testProcess.MainWindowHandle)
$testCondition = New-Object Windows.Automation.PropertyCondition([Windows.Automation.AutomationElement]::ClassNameProperty, 'RichEditD2DPT')
$testEditor = $testRoot.FindFirst([Windows.Automation.TreeScope]::Descendants, $testCondition)
if (-not $testEditor) { throw 'No document editor was found.' }
if ($Mode -eq 'focus') {
    $testEditor.SetFocus()
    [Console]::Out.WriteLine('{"focused":true}')
} else {
    $testPattern = $testEditor.GetCurrentPattern([Windows.Automation.TextPattern]::Pattern)
    [Console]::Out.WriteLine((@{text=$testPattern.DocumentRange.GetText(-1)} | ConvertTo-Json -Compress))
}
