$url = "https://nqppaneieqknrellyugc.supabase.co"
$key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcHBhbmVpZXFrbnJlbGx5dWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0OTE0MzcsImV4cCI6MjEwMzA2NzQzN30.JdaI9seSqTU_KWjLQKEUOb8QMVr9BOr9dagiDak6-ik"
$headers = @{
    "apikey" = $key
    "Authorization" = "Bearer $key"
    "Content-Type" = "application/json"
}

Write-Host "=== 1. WIPING ALL TRANSACTIONAL DATA (FRESH REAL DATA STATE) ===" -ForegroundColor Cyan

# 1. Delete all leaves
Invoke-RestMethod -Uri "$url/rest/v1/leaves?id=neq.__none__" -Method DELETE -Headers $headers | Out-Null
# 2. Delete all timesheets
Invoke-RestMethod -Uri "$url/rest/v1/timesheets?id=neq.__none__" -Method DELETE -Headers $headers | Out-Null
# 3. Delete all item requests (PR)
Invoke-RestMethod -Uri "$url/rest/v1/item_requests?id=neq.__none__" -Method DELETE -Headers $headers | Out-Null
# 4. Delete all cash advances
Invoke-RestMethod -Uri "$url/rest/v1/cash_advances?id=neq.__none__" -Method DELETE -Headers $headers | Out-Null
# 5. Delete all kitchen reports
Invoke-RestMethod -Uri "$url/rest/v1/kitchen_reports?id=neq.__none__" -Method DELETE -Headers $headers | Out-Null
# 6. Delete all field issues
Invoke-RestMethod -Uri "$url/rest/v1/field_issues?id=neq.__none__" -Method DELETE -Headers $headers | Out-Null

# 7. Reset all user leave quotas back to full 12 Annual / 3 Personal
$resetData = @{
    remaining_annual_leave = 12
    remaining_personal_leave = 3
} | ConvertTo-Json

Invoke-RestMethod -Uri "$url/rest/v1/users?id=neq.ADM-001" -Method PATCH -Headers $headers -Body $resetData | Out-Null

Write-Host "`n=== 2. CURRENT SUPABASE CLOUD STATUS ===" -ForegroundColor Cyan
$l = (Invoke-RestMethod -Uri "$url/rest/v1/leaves?select=id" -Headers $headers).Count
$t = (Invoke-RestMethod -Uri "$url/rest/v1/timesheets?select=id" -Headers $headers).Count
$p = (Invoke-RestMethod -Uri "$url/rest/v1/item_requests?select=id" -Headers $headers).Count
$c = (Invoke-RestMethod -Uri "$url/rest/v1/cash_advances?select=id" -Headers $headers).Count
$kr = (Invoke-RestMethod -Uri "$url/rest/v1/kitchen_reports?select=id" -Headers $headers).Count
$fi = (Invoke-RestMethod -Uri "$url/rest/v1/field_issues?select=id" -Headers $headers).Count
$u = (Invoke-RestMethod -Uri "$url/rest/v1/users?select=id" -Headers $headers).Count
$k = (Invoke-RestMethod -Uri "$url/rest/v1/kitchens?select=id" -Headers $headers).Count

Write-Host "Leaves in Cloud: $l" -ForegroundColor Green
Write-Host "Timesheets in Cloud: $t" -ForegroundColor Green
Write-Host "Item Requests in Cloud: $p" -ForegroundColor Green
Write-Host "Cash Advances in Cloud: $c" -ForegroundColor Green
Write-Host "Kitchen Reports in Cloud: $kr" -ForegroundColor Green
Write-Host "Field Issues in Cloud: $fi" -ForegroundColor Green
Write-Host "Master Users (Preserved): $u" -ForegroundColor Yellow
Write-Host "Master Kitchens (Preserved): $k" -ForegroundColor Yellow
