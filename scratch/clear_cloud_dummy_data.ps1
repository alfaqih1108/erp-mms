$url = "https://nqppaneieqknrellyugc.supabase.co"
$key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcHBhbmVpZXFrbnJlbGx5dWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0OTE0MzcsImV4cCI6MjEwMzA2NzQzN30.JdaI9seSqTU_KWjLQKEUOb8QMVr9BOr9dagiDak6-ik"
$headers = @{
    "apikey" = $key
    "Authorization" = "Bearer $key"
    "Content-Type" = "application/json"
}

Write-Host "=== 1. CLEARING TRANSACTIONAL DATA FROM SUPABASE CLOUD ===" -ForegroundColor Cyan

# 1. Clear Leaves
try {
    Invoke-RestMethod -Uri "$url/rest/v1/leaves?id=neq.NULL" -Method DELETE -Headers $headers | Out-Null
    Write-Host "✓ Cleared all leaves from Cloud" -ForegroundColor Green
} catch {
    Write-Host "Error clearing leaves: $_" -ForegroundColor Red
}

# 2. Clear Timesheets
try {
    Invoke-RestMethod -Uri "$url/rest/v1/timesheets?id=neq.NULL" -Method DELETE -Headers $headers | Out-Null
    Write-Host "✓ Cleared all timesheets from Cloud" -ForegroundColor Green
} catch {
    Write-Host "Error clearing timesheets: $_" -ForegroundColor Red
}

# 3. Clear Item Requests (PR)
try {
    Invoke-RestMethod -Uri "$url/rest/v1/item_requests?id=neq.NULL" -Method DELETE -Headers $headers | Out-Null
    Write-Host "✓ Cleared all item_requests (PR) from Cloud" -ForegroundColor Green
} catch {
    Write-Host "Error clearing item_requests: $_" -ForegroundColor Red
}

# 4. Clear Cash Advances
try {
    Invoke-RestMethod -Uri "$url/rest/v1/cash_advances?id=neq.NULL" -Method DELETE -Headers $headers | Out-Null
    Write-Host "✓ Cleared all cash_advances from Cloud" -ForegroundColor Green
} catch {
    Write-Host "Error clearing cash_advances: $_" -ForegroundColor Red
}

# 5. Clear Kitchen Reports & Field Issues
try {
    Invoke-RestMethod -Uri "$url/rest/v1/kitchen_reports?id=neq.NULL" -Method DELETE -Headers $headers | Out-Null
    Invoke-RestMethod -Uri "$url/rest/v1/field_issues?id=neq.NULL" -Method DELETE -Headers $headers | Out-Null
    Write-Host "✓ Cleared kitchen_reports and field_issues from Cloud" -ForegroundColor Green
} catch {
    Write-Host "Error clearing kitchen_reports/field_issues: $_" -ForegroundColor Red
}

# 6. Reset Users Leave Quota (Annual: 12, Personal: 3)
try {
    $resetData = @{
        remaining_annual_leave = 12
        remaining_personal_leave = 3
    } | ConvertTo-Json
    Invoke-RestMethod -Uri "$url/rest/v1/users?id=neq.ADM-001" -Method PATCH -Headers $headers -Body $resetData | Out-Null
    Write-Host "✓ Reset all user leave quotas back to 12 Annual / 3 Personal" -ForegroundColor Green
} catch {
    Write-Host "Error resetting leave quotas: $_" -ForegroundColor Red
}

Write-Host "`n=== 2. VERIFYING CLOUD STATE AFTER CLEANUP ===" -ForegroundColor Cyan
$leavesCount = (Invoke-RestMethod -Uri "$url/rest/v1/leaves?select=id" -Headers $headers).Count
$tsCount = (Invoke-RestMethod -Uri "$url/rest/v1/timesheets?select=id" -Headers $headers).Count
$prCount = (Invoke-RestMethod -Uri "$url/rest/v1/item_requests?select=id" -Headers $headers).Count
$caCount = (Invoke-RestMethod -Uri "$url/rest/v1/cash_advances?select=id" -Headers $headers).Count
$usersCount = (Invoke-RestMethod -Uri "$url/rest/v1/users?select=id" -Headers $headers).Count
$kitchensCount = (Invoke-RestMethod -Uri "$url/rest/v1/kitchens?select=id" -Headers $headers).Count

Write-Host "Leaves: $leavesCount" -ForegroundColor Yellow
Write-Host "Timesheets: $tsCount" -ForegroundColor Yellow
Write-Host "Item Requests (PR): $prCount" -ForegroundColor Yellow
Write-Host "Cash Advances: $caCount" -ForegroundColor Yellow
Write-Host "Master Users (Preserved): $usersCount" -ForegroundColor Green
Write-Host "Master Kitchens (Preserved): $kitchensCount" -ForegroundColor Green
