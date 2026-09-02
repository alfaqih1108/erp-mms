$url = "https://nqppaneieqknrellyugc.supabase.co"
$key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcHBhbmVpZXFrbnJlbGx5dWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0OTE0MzcsImV4cCI6MjEwMzA2NzQzN30.JdaI9seSqTU_KWjLQKEUOb8QMVr9BOr9dagiDak6-ik"
$headers = @{
    "apikey" = $key
    "Authorization" = "Bearer $key"
}

# Delete LV-2026-103 from Cloud
Invoke-RestMethod -Uri "$url/rest/v1/leaves?id=eq.LV-2026-103" -Method DELETE -Headers $headers | Out-Null
Write-Host "Deleted test record LV-2026-103 from Supabase Cloud" -ForegroundColor Green
