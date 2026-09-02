$files = @("timesheet.js", "approval-center.js")

foreach ($f in $files) {
    Write-Host "=== SCANNING $f ===" -ForegroundColor Cyan
    $lines = [System.IO.File]::ReadAllLines("c:\Users\muham\Documents\SISTEM ERP\ERP MMS v3.2\js\modules\$f")
    for ($i = 0; $i -lt $lines.Length; $i++) {
        $line = $lines[$i]
        if ($line -match "await\s+") {
            $funcHeader = "UNKNOWN"
            for ($j = $i; $j -ge 0; $j--) {
                if ($lines[$j] -match "^\s*([a-zA-Z0-9_$]+)\s*:\s*(async\s+)?function\s*\([^\)]*\)" -or $lines[$j] -match "^\s*(async\s+)?([a-zA-Z0-9_$]+)\s*\([^\)]*\)\s*\{") {
                    $funcHeader = "$($j+1): $($lines[$j].Trim())"
                    break
                }
            }
            Write-Host "Line $($i+1): $($line.Trim())"
            Write-Host "   -> Inside Function at $funcHeader`n"
        }
    }
}
