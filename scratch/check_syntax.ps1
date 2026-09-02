$files = Get-ChildItem -Path "c:\Users\muham\Documents\SISTEM ERP\ERP MMS v3.2\js" -Filter "*.js" -Recurse
$sc = New-Object -ComObject ScriptControl
$sc.Language = "JScript"

foreach ($file in $files) {
    Write-Host "Checking $($file.FullName)..."
    try {
        $code = [System.IO.File]::ReadAllText($file.FullName)
        # Check basic syntax by adding code to scriptcontrol
        $sc.AddCode("function _test_syntax_wrapper() { " + $code + "`n}")
        Write-Host "  -> OK" -ForegroundColor Green
    } catch {
        Write-Host "  -> ERROR: $_" -ForegroundColor Red
    }
}
