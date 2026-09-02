$lines = [System.IO.File]::ReadAllLines("c:\Users\muham\Documents\SISTEM ERP\ERP MMS v3.2\js\modules\data.js")

for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    if ($line -match "await\s+") {
        # Search backwards for function / method header
        $funcHeader = "UNKNOWN"
        for ($j = $i; $j -ge 0; $j--) {
            if ($lines[$j] -match "^\s*(async\s+)?([a-zA-Z0-9_$]+)\s*\([^\)]*\)\s*\{" -or $lines[$j] -match "function") {
                $funcHeader = "$($j+1): $($lines[$j].Trim())"
                break
            }
        }
        Write-Host "Line $($i+1): $($line.Trim())"
        Write-Host "   -> Inside Function at $funcHeader`n"
    }
}
