$dataJs = [System.IO.File]::ReadAllText("c:\Users\muham\Documents\SISTEM ERP\ERP MMS v3.2\js\modules\data.js")
$html = @"
<!DOCTYPE html>
<html>
<body>
<pre id="result"></pre>
<script>
window.SupabaseConfig = { isConfigured: function() { return false; }, getUrl: function(){return '';}, getAnonKey: function(){return '';} };
try {
$dataJs
  document.getElementById('result').textContent = "SUCCESS: DB is " + typeof window.DB;
} catch(err) {
  document.getElementById('result').textContent = "ERROR: " + err.message + "\nStack: " + err.stack;
}
</script>
</body>
</html>
"@
[System.IO.File]::WriteAllText("c:\Users\muham\Documents\SISTEM ERP\ERP MMS v3.2\scratch\test_error_locator.html", $html)
