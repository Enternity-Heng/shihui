$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$testCount = 0
foreach ($testProcess in @(Get-Process Notepad -ErrorAction SilentlyContinue)) {
    $testHandle = $testProcess.MainWindowHandle
    if ($testHandle.ToInt64() -eq 0) { continue }
    $testRoot = [Windows.Automation.AutomationElement]::FromHandle($testHandle)
    $testCondition = New-Object Windows.Automation.PropertyCondition([Windows.Automation.AutomationElement]::ControlTypeProperty,[Windows.Automation.ControlType]::TabItem)
    $testTabs = $testRoot.FindAll([Windows.Automation.TreeScope]::Descendants,$testCondition)
    foreach ($testTab in $testTabs) {
        if (-not $testTab.Current.Name.StartsWith('MATH-COMPAT-NOTEPAD')) { continue }
        $testSelection = $testTab.GetCurrentPattern([Windows.Automation.SelectionItemPattern]::Pattern)
        $testSelection.Select()
        Start-Sleep -Milliseconds 100
        $testCloseCondition = New-Object Windows.Automation.PropertyCondition([Windows.Automation.AutomationElement]::NameProperty,'关闭标签页')
        $testClose = $testRoot.FindFirst([Windows.Automation.TreeScope]::Descendants,$testCloseCondition)
        if ($testClose) { $testClose.GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern).Invoke(); $testCount++; Start-Sleep -Milliseconds 100 }
    }
}
Write-Output "Closed $testCount test tabs; other tabs were left open."
