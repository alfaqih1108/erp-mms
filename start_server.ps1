# Simple Local Web Server in PowerShell
$port = 8080
$path = $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://*:$port/")

try {
    $listener.Start()
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "  SERVER LOCAL ERP MMS AKTIF!" -ForegroundColor Yellow
    Write-Host "  Akses dari Laptop Lain (di Wi-Fi yang sama):" -ForegroundColor Cyan
    Write-Host "  http://172.20.10.8:$port" -ForegroundColor White
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "Tekan Ctrl + C untuk menghentikan server.`n"

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $rawPath = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrEmpty($rawPath)) { $rawPath = "index.html" }
        $filePath = Join-Path $path $rawPath

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".svg"  { "image/svg+xml" }
                ".pdf"  { "application/pdf" }
                default { "application/octet-stream" }
            }
            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $response.Close()
    }
} finally {
    $listener.Stop()
}
