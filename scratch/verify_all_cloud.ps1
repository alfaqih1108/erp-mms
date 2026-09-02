$url = "https://nqppaneieqknrellyugc.supabase.co"
$key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcHBhbmVpZXFrbnJlbGx5dWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0OTE0MzcsImV4cCI6MjEwMzA2NzQzN30.JdaI9seSqTU_KWjLQKEUOb8QMVr9BOr9dagiDak6-ik"
$headers = @{
    "apikey" = $key
    "Authorization" = "Bearer $key"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

Write-Host "=== VERIFYING SUPABASE REST API & LIVE DATA ===" -ForegroundColor Cyan

# 1. Check Leaves
$leaves = Invoke-RestMethod -Uri "$url/rest/v1/leaves?select=id,employee_name,leave_type,stage,status,created_at&order=created_at.desc" -Headers $headers
Write-Host "Total Leaves in Cloud: $($leaves.Count)" -ForegroundColor Green
$leaves | Format-Table -AutoSize

# 2. Check Timesheets
$ts = Invoke-RestMethod -Uri "$url/rest/v1/timesheets?select=id,employee_name,date,start_time,end_time,activity_preset,status&order=created_at.desc" -Headers $headers
Write-Host "Total Timesheets in Cloud: $($ts.Count)" -ForegroundColor Green
$ts | Format-Table -AutoSize

# 3. Check PR
$prs = Invoke-RestMethod -Uri "$url/rest/v1/item_requests?select=id,employee_name,item_name,quantity,total_price,target_kitchen,stage,status&order=created_at.desc" -Headers $headers
Write-Host "Total PRs in Cloud: $($prs.Count)" -ForegroundColor Green
$prs | Format-Table -AutoSize

# 4. Check Cash Advances
$cas = Invoke-RestMethod -Uri "$url/rest/v1/cash_advances?select=id,employee_name,purpose,amount_requested,stage,status&order=created_at.desc" -Headers $headers
Write-Host "Total Cash Advances in Cloud: $($cas.Count)" -ForegroundColor Green
$cas | Format-Table -AutoSize
