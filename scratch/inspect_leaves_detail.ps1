$url = "https://nqppaneieqknrellyugc.supabase.co"
$key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcHBhbmVpZXFrbnJlbGx5dWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0OTE0MzcsImV4cCI6MjEwMzA2NzQzN30.JdaI9seSqTU_KWjLQKEUOb8QMVr9BOr9dagiDak6-ik"
$headers = @{
    "apikey" = $key
    "Authorization" = "Bearer $key"
}

$leaves = Invoke-RestMethod -Uri "$url/rest/v1/leaves?select=*&order=created_at.desc" -Headers $headers
foreach ($l in $leaves) {
    Write-Host "------------------------------------" -ForegroundColor Cyan
    Write-Host "ID: $($l.id) | Name: $($l.employee_name) | Role: $($l.role) | Stage: $($l.stage) | Status: $($l.status)"
    Write-Host "Period: $($l.start_date) to $($l.end_date) | Type: $($l.leave_type)"
    Write-Host "Approval History:"
    $l.approval_history | ConvertTo-Json -Depth 5
}
