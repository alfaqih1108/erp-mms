$url = "https://nqppaneieqknrellyugc.supabase.co"
$key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcHBhbmVpZXFrbnJlbGx5dWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0OTE0MzcsImV4cCI6MjEwMzA2NzQzN30.JdaI9seSqTU_KWjLQKEUOb8QMVr9BOr9dagiDak6-ik"
$headers = @{
    "apikey" = $key
    "Authorization" = "Bearer $key"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

Write-Host "=== TEST 1: INSERT LEAVE ===" -ForegroundColor Cyan
$leaveObj = @{
    id = "LV-TEST-001"
    employee_id = "PY-010"
    employee_name = "Achmad Sofyan Permadi"
    role = "PERWAKILAN_YAYASAN"
    department = "Operasional Wilayah"
    leave_type = "Cuti Pribadi (1 Hari Penuh)"
    start_date = "2026-09-10"
    end_date = "2026-09-10"
    duration = 1
    reason = "Test Pengajuan Cuti"
    stage = "MANAGER_AREA_REVIEW"
    status = "PENDING"
}
$leaveData = $leaveObj | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "$url/rest/v1/leaves" -Method POST -Headers $headers -Body $leaveData
    Write-Host "Leave Insert Success: $($res.id)" -ForegroundColor Green
} catch {
    Write-Host "Leave Insert Failed: $_" -ForegroundColor Red
}

Write-Host "`n=== TEST 2: INSERT TIMESHEET ===" -ForegroundColor Cyan
$tsObj = @{
    id = "TS-TEST-001"
    employee_id = "PY-010"
    employee_name = "Achmad Sofyan Permadi"
    role = "PERWAKILAN_YAYASAN"
    date = "2026-09-02"
    start_time = "08:00"
    end_time = "10:00"
    activity = "Test Timesheet Log"
    activity_preset = "Monitoring Dapur SPPG"
    category = "Operasional"
    status = "RECORDED"
}
$tsData = $tsObj | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "$url/rest/v1/timesheets" -Method POST -Headers $headers -Body $tsData
    Write-Host "Timesheet Insert Success: $($res.id)" -ForegroundColor Green
} catch {
    Write-Host "Timesheet Insert Failed: $_" -ForegroundColor Red
}

Write-Host "`n=== TEST 3: INSERT PR (ITEM REQUEST) ===" -ForegroundColor Cyan
$prObj = @{
    id = "PR-TEST-001"
    employee_id = "PY-010"
    employee_name = "Achmad Sofyan Permadi"
    role = "PERWAKILAN_YAYASAN"
    department = "Operasional Wilayah"
    item_name = "Rice Cooker 20L"
    category = "Fasilitas Kantor & Dapur"
    quantity = 1
    unit_price = 3400000
    total_price = 3400000
    urgency = "MEDIUM"
    reason = "Kebutuhan dapur"
    target_kitchen = "SPPG Mandalamekar"
    stage = "MANAGER_APPROVAL"
    status = "PENDING"
}
$prData = $prObj | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "$url/rest/v1/item_requests" -Method POST -Headers $headers -Body $prData
    Write-Host "PR Insert Success: $($res.id)" -ForegroundColor Green
} catch {
    Write-Host "PR Insert Failed: $_" -ForegroundColor Red
}

Write-Host "`n=== TEST 4: INSERT CASH ADVANCE ===" -ForegroundColor Cyan
$caObj = @{
    id = "CA-TEST-001"
    employee_id = "PY-010"
    employee_name = "Achmad Sofyan Permadi"
    role = "PERWAKILAN_YAYASAN"
    department = "Operasional Wilayah"
    purpose = "Kasbon Operasional"
    target_kitchen = "SPPG Mandalamekar"
    amount_requested = 1500000
    amount_approved = 1500000
    bank_name = "Bank Mandiri"
    rekening_no = "1234567890"
    rekening_name = "Achmad Sofyan Permadi"
    stage = "DIRECTOR_REVIEW"
    status = "PENDING"
}
$caData = $caObj | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "$url/rest/v1/cash_advances" -Method POST -Headers $headers -Body $caData
    Write-Host "CA Insert Success: $($res.id)" -ForegroundColor Green
} catch {
    Write-Host "CA Insert Failed: $_" -ForegroundColor Red
}

# Clean up test rows
Invoke-RestMethod -Uri "$url/rest/v1/leaves?id=eq.LV-TEST-001" -Method DELETE -Headers $headers | Out-Null
Invoke-RestMethod -Uri "$url/rest/v1/timesheets?id=eq.TS-TEST-001" -Method DELETE -Headers $headers | Out-Null
Invoke-RestMethod -Uri "$url/rest/v1/item_requests?id=eq.PR-TEST-001" -Method DELETE -Headers $headers | Out-Null
Invoke-RestMethod -Uri "$url/rest/v1/cash_advances?id=eq.CA-TEST-001" -Method DELETE -Headers $headers | Out-Null
Write-Host "`nCleaned up all test records!" -ForegroundColor Green
