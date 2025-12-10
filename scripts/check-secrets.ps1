# PowerShell script to check for secrets in source code
Write-Host "Checking for potential secrets in source code..."

# Check for Firebase API keys (actual key patterns)
$firebaseKeys = Get-ChildItem -Recurse -Include *.js,*.ts,*.jsx,*.tsx,*.json,*.env src/ | Select-String -Pattern "AIzaSy[A-Za-z0-9_-]{33}" -ErrorAction SilentlyContinue
if ($firebaseKeys) {
    Write-Host "Potential Firebase API key found in source code!" -ForegroundColor Red
    Write-Host $firebaseKeys
    exit 1
}

# Check for VITE_ environment variables being set directly with values
$viteVars = Get-ChildItem -Recurse -Include *.js,*.ts,*.jsx,*.tsx -Exclude "*.example","check-secrets.ps1" . | Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*.git*" } | Select-String -Pattern "VITE_[A-Z_]+?=.*[a-zA-Z0-9]" -ErrorAction SilentlyContinue
if ($viteVars) {
    Write-Host "Potential environment variable assignment found in source code!" -ForegroundColor Red
    Write-Host $viteVars
    exit 1
}

# Check for Spotify client secrets (actual secret patterns)
$spotifySecrets = Get-ChildItem -Recurse -Include *.js,*.ts,*.jsx,*.tsx src/ | Where-Object { $_.FullName -notlike "*node_modules*" } | Select-String -Pattern "spotify.*[a-zA-Z0-9]{32}" -CaseSensitive:$false -ErrorAction SilentlyContinue
if ($spotifySecrets) {
    Write-Host "Potential Spotify secret found in source code!" -ForegroundColor Red
    Write-Host $spotifySecrets
    exit 1
}

Write-Host "No obvious secrets found in source code." -ForegroundColor Green
exit 0