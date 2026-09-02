$url = "https://nqppaneieqknrellyugc.supabase.co"
$key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcHBhbmVpZXFrbnJlbGx5dWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0OTE0MzcsImV4cCI6MjEwMzA2NzQzN30.JdaI9seSqTU_KWjLQKEUOb8QMVr9BOr9dagiDak6-ik"
$headers = @{
    "apikey" = $key
    "Authorization" = "Bearer $key"
    "Content-Type" = "application/json"
}

# 1. Delete all timesheets
Invoke-RestMethod -Uri "$url/rest/v1/timesheets?id=neq.__none__" -Method DELETE -Headers $headers | Out-Null
# 2. Delete all cash advances
Invoke-RestMethod -Uri "$url/rest/v1/cash_advances?id=neq.__none__" -Method DELETE -Headers $headers | Out-Null
# 3. Delete all leaves
Invoke-RestMethod -Uri "$url/rest/v1/leaves?id=neq.__none__" -Method DELETE -Headers $headers | Out-Null
# 4. Delete all item requests
Invoke-RestMethod -Uri "$url/rest/v1/item_requests?id=neq.__none__" -Method DELETE -Headers $headers | Out-Null
# 5. Delete all kitchen reports
Invoke-RestMethod -Uri "$url/rest/v1/kitchen_reports?id=neq.__none__" -Method DELETE -Headers $headers | Out-Null
# 6. Delete all field issues
Invoke-RestMethod -Uri "$url/rest/v1/field_issues?id=neq.__none__" -Method DELETE -Headers $headers | Out-Null

# Verify Counts
$l = (Invoke-RestMethod -Uri "$url/rest/v1/leaves?select=id" -Headers $headers).Count
$t = (Invoke-RestMethod -Uri "$url/rest/v1/timesheets?select=id" -Headers $headers).Count
$p = (Invoke-RestMethod -Uri "$url/rest/v1/item_requests?select=id" -Headers $headers).Count
$c = (Invoke-RestMethod -Uri "$url/rest/v1/cash_advances?select=id" -Headers $headers).Count
$kr = (Invoke-RestMethod -Uri "$url/rest/v1/kitchen_reports?select=id" -Headers $headers).Count
$fi = (Invoke-RestMethod -Uri "$url/rest/v1/field_issues?select=id" -Headers $headers).Count

Write-Host "DATABASE CLEAN STATE:" -ForegroundColor Cyan
Write-Host "Leaves in Cloud: $l" -ForegroundColor Green
Write-Host "Timesheets in Cloud: $t" -ForegroundColor Green
Write-Host "Item Requests in Cloud: $p" -ForegroundColor Green
Write-Host "Cash Advances in Cloud: $c" -ForegroundColor Green
Write-Host "Kitchen Reports in Cloud: $kr" -ForegroundColor Green
Write-Host "Field Issues in Cloud: $fi" -ForegroundColor Green
