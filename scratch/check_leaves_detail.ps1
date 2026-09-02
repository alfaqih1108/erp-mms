$url = "https://nqppaneieqknrellyugc.supabase.co"
$key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcHBhbmVpZXFrbnJlbGx5dWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0OTE0MzcsImV4cCI6MjEwMzA2NzQzN30.JdaI9seSqTU_KWjLQKEUOb8QMVr9BOr9dagiDak6-ik"
$headers = @{
    "apikey" = $key
    "Authorization" = "Bearer $key"
}

$res = Invoke-RestMethod -Uri "$url/rest/v1/leaves?select=*" -Headers $headers
foreach ($l in $res) {
    Write-Host "ID: $($l.id) | Pemohon: $($l.employee_name) | Stage: $($l.stage) | Status: $($l.status)"
    Write-Host "   Approval History:"
    if ($l.approval_history) {
        $l.approval_history | ForEach-Object {
            Write-Host "     - Stage: $($_.stage) | Action: $($_.action) | Actor: $($_.actorName) ($($_.actorRole))"
        }
    }
    Write-Host ""
}
