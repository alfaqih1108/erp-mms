$files = Get-ChildItem -Path "c:\Users\muham\Documents\SISTEM ERP\ERP MMS v3.2\js" -Filter "*.js" -Recurse

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    
    # Remove single-line comments and multi-line comments and string literals
    # Quick simple scanner for braces
    $inString = $false
    $stringChar = ''
    $inComment = $false
    $inLineComment = $false
    $braceCount = 0
    $parenCount = 0
    $bracketCount = 0
    
    $len = $content.Length
    for ($i = 0; $i -lt $len; $i++) {
        $c = $content[$i]
        $next = if ($i + 1 -lt $len) { $content[$i+1] } else { '' }
        
        if ($inLineComment) {
            if ($c -eq "`n") { $inLineComment = $false }
            continue
        }
        if ($inComment) {
            if ($c -eq '*' -and $next -eq '/') { $inComment = $false; $i++ }
            continue
        }
        if ($inString) {
            if ($c -eq '\') { $i++; continue }
            if ($c -eq $stringChar) { $inString = $false }
            continue
        }
        
        if ($c -eq '/' -and $next -eq '/') { $inLineComment = $true; $i++; continue }
        if ($c -eq '/' -and $next -eq '*') { $inComment = $true; $i++; continue }
        if ($c -eq '"' -or $c -eq "'" -or $c -eq '`') { $inString = $true; $stringChar = $c; continue }
        
        if ($c -eq '{') { $braceCount++ }
        elseif ($c -eq '}') { $braceCount-- }
        elseif ($c -eq '(') { $parenCount++ }
        elseif ($c -eq ')') { $parenCount-- }
        elseif ($c -eq '[') { $bracketCount++ }
        elseif ($c -eq ']') { $bracketCount-- }
    }
    
    Write-Host "$($file.Name): Braces=$braceCount, Parens=$parenCount, Brackets=$bracketCount"
}
