# Test POST /push/test sur Render
# Usage : .\scripts\test-push-route.ps1 -Email "vous@mail.com" -Password "xxx"

param(
  [Parameter(Mandatory = $true)]
  [string]$Email,
  [Parameter(Mandatory = $true)]
  [string]$Password,
  [string]$BaseUrl = "https://bv-groupe.onrender.com/api"
)

$ErrorActionPreference = "Stop"

Write-Host "=== 1. VAPID (public) ===" -ForegroundColor Cyan
$vapid = Invoke-RestMethod -Uri "$BaseUrl/push/vapid-public-key" -Method Get
Write-Host "publicKey: $($vapid.data.publicKey.Substring(0, [Math]::Min(40, $vapid.data.publicKey.Length)))..."

Write-Host "`n=== 2. Login ===" -ForegroundColor Cyan
$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
try {
  $login = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
} catch {
  Write-Host "Login echoue: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

$token = $login.data.accessToken
if (-not $token) { $token = $login.data.access_token }
if (-not $token) {
  Write-Host "Pas de accessToken dans la reponse." -ForegroundColor Red
  $login | ConvertTo-Json -Depth 5
  exit 1
}
Write-Host "userId: $($login.data.user.id) | email: $($login.data.user.email)"

$headers = @{ Authorization = "Bearer $token" }

Write-Host "`n=== 3. GET /push/status ===" -ForegroundColor Cyan
$status = Invoke-RestMethod -Uri "$BaseUrl/push/status" -Method Get -Headers $headers
$status.data | ConvertTo-Json -Depth 5

Write-Host "`n=== 4. POST /push/test ===" -ForegroundColor Cyan
$test = Invoke-RestMethod -Uri "$BaseUrl/push/test" -Method Post -Headers $headers -ContentType "application/json"
$test | ConvertTo-Json -Depth 5

$data = $test.data
if ($data.sent -ge 1) {
  Write-Host "`nOK: sent=$($data.sent) — fermez l'app et verifiez la notif systeme." -ForegroundColor Green
} elseif ($data.subscriptionCount -eq 0) {
  Write-Host "`nAucun abonnement: Profil → Activer les notifications (meme compte)." -ForegroundColor Yellow
} elseif ($data.vapidConfigured -eq $false) {
  Write-Host "`nVAPID non configure sur Render." -ForegroundColor Red
} else {
  Write-Host "`nResultat: sent=$($data.sent) failed=$($data.failed)" -ForegroundColor Yellow
}
