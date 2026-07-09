# Piccolo server statico per provare Overload in locale (nessuna dipendenza richiesta)
param([int]$Port = 8765)

$root = (Resolve-Path $PSScriptRoot).Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Overload in ascolto su http://localhost:$Port/  (radice: $root)"

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.js' = 'text/javascript; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json'
  '.webmanifest' = 'application/manifest+json'
  '.png' = 'image/png'
  '.svg' = 'image/svg+xml'
  '.ico' = 'image/x-icon'
}

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ([string]::IsNullOrEmpty($path)) { $path = 'index.html' }
    $file = Join-Path $root $path
    $ok = (Test-Path $file -PathType Leaf)
    if ($ok) { $ok = (Resolve-Path $file).Path.StartsWith($root) }
    if ($ok) {
      $bytes = [IO.File]::ReadAllBytes($file)
      $ext = [IO.Path]::GetExtension($file).ToLower()
      if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] } else { $ctx.Response.ContentType = 'application/octet-stream' }
      $ctx.Response.Headers.Add('Cache-Control', 'no-store')
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
      $b = [Text.Encoding]::UTF8.GetBytes('404 - non trovato')
      $ctx.Response.OutputStream.Write($b, 0, $b.Length)
    }
  } catch {
    # ignora errori di singola richiesta
  } finally {
    try { $ctx.Response.Close() } catch {}
  }
}
