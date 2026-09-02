$url = "https://nqppaneieqknrellyugc.supabase.co"
$key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcHBhbmVpZXFrbnJlbGx5dWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0OTE0MzcsImV4cCI6MjEwMzA2NzQzN30.JdaI9seSqTU_KWjLQKEUOb8QMVr9BOr9dagiDak6-ik"
$headers = @{
    "apikey" = $key
    "Authorization" = "Bearer $key"
}

Write-Host "=== SUPABASE: LEAVES ===" -ForegroundColor Cyan
$leaves = Invoke-RestMethod -Uri "$url/rest/v1/leaves?select=*&order=created_at.desc" -Headers $headers
$leaves | Format-Table id, employee_name, leave_type, stage, status, created_at -AutoSize

Write-Host "`n=== SUPABASE: TIMESHEETS ===" -ForegroundColor Cyan
$timesheets = Invoke-RestMethod -Uri "$url/rest/v1/timesheets?select=*&order=created_at.desc" -Headers $headers
$timesheets | Format-Table id, employee_name, date, start_time, end_time, activity_preset, status, created_at -AutoSize

Write-Host "`n=== SUPABASE: ITEM REQUESTS (PR) ===" -ForegroundColor Cyan
$prs = Invoke-RestMethod -Uri "$url/rest/v1/item_requests?select=*&order=created_at.desc" -Headers $headers
$prs | Format-Table id, employee_name, item_name, quantity, total_price, stage, status, created_at -AutoSize

Write-Host "`n=== SUPABASE: CASH ADVANCES ===" -ForegroundColor Cyan
$cas = Invoke-RestMethod -Uri "$url/rest/v1/cash_advances?select=*&order=created_at.desc" -Headers $headers
$cas | Format-Table id, employee_name, purpose, amount_requested, stage, status, created_at -AutoSize
