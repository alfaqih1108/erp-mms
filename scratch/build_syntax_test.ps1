$modules = @(
    "supabase-config.js",
    "modules\data.js",
    "modules\dashboard.js",
    "modules\cuti.js",
    "modules\timesheet.js",
    "modules\pengajuan-barang.js",
    "modules\cash-advance.js",
    "modules\dapur-yayasan.js",
    "modules\hc-hub.js",
    "modules\admin-hub.js",
    "modules\approval-center.js",
    "app.js"
)

$testCases = @()
foreach ($m in $modules) {
    $filePath = "c:\Users\muham\Documents\SISTEM ERP\ERP MMS v3.2\js\$m"
    $code = [System.IO.File]::ReadAllText($filePath)
    # Encode as JSON string
    $jsonCode = $code | ConvertTo-Json
    $testCases += "{ name: '$m', code: $jsonCode }"
}

$testCasesStr = $testCases -join ",`n"

$html = @"
<!DOCTYPE html>
<html>
<body>
<div id="output"></div>
<script>
var testCases = [
$testCasesStr
];

var out = document.getElementById('output');
testCases.forEach(function(tc) {
  var p = document.createElement('div');
  try {
    new Function(tc.code);
    p.textContent = tc.name + ": SYNTAX OK";
    p.style.color = "green";
  } catch(e) {
    p.textContent = tc.name + ": SYNTAX ERROR -> " + e.message;
    p.style.color = "red";
  }
  out.appendChild(p);
});
</script>
</body>
</html>
"@

[System.IO.File]::WriteAllText("c:\Users\muham\Documents\SISTEM ERP\ERP MMS v3.2\scratch\test_all_syntax.html", $html)
