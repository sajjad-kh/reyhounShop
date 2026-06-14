# Manual Testing Script for Basalam Shipping Sync Endpoint
# This script demonstrates manual testing using curl commands

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Manual Testing: Basalam Shipping Sync Endpoint       ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login as admin to get JWT token
Write-Host "🔐 Step 1: Login as admin..." -ForegroundColor Yellow
Write-Host ""

$loginBody = @{
    email = "admin@test.com"
    password = "Test@1234"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/v1/auth/login" `
        -Method Post `
        -Body $loginBody `
        -ContentType "application/json"
    
    $token = $loginResponse.data.token
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "🎫 Token: $($token.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "❌ Login failed: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Test sync endpoint with admin token
Write-Host "🔄 Step 2: Testing sync endpoint with admin token..." -ForegroundColor Yellow
Write-Host ""

try {
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    $syncResponse = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/v1/shipping-methods/sync" `
        -Method Post `
        -Headers $headers `
        -Body "{}"
    
    Write-Host "✅ Sync successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Response:" -ForegroundColor Cyan
    Write-Host "   Success: $($syncResponse.success)" -ForegroundColor White
    Write-Host "   Message: $($syncResponse.message)" -ForegroundColor White
    Write-Host "   Synced Count: $($syncResponse.data.syncedCount)" -ForegroundColor White
    Write-Host "   Used Cache: $($syncResponse.data.usedCache)" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 Synced Methods:" -ForegroundColor Cyan
    $index = 1
    foreach ($method in $syncResponse.data.methods) {
        Write-Host "   $index. $($method.name)" -ForegroundColor White
        Write-Host "      ID: $($method.id), Basalam ID: $($method.basalamId)" -ForegroundColor Gray
        Write-Host "      Base Cost: $($method.baseCost), Additional: $($method.additionalCost)" -ForegroundColor Gray
        $index++
    }
    Write-Host ""
} catch {
    Write-Host "❌ Sync failed: $_" -ForegroundColor Red
    Write-Host $_.Exception.Response.StatusCode -ForegroundColor Red
}

# Step 3: Test without authentication (should fail with 401)
Write-Host "🧪 Step 3: Testing without authentication (should fail)..." -ForegroundColor Yellow
Write-Host ""

try {
    $syncResponse = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/v1/shipping-methods/sync" `
        -Method Post `
        -ContentType "application/json" `
        -Body "{}"
    
    Write-Host "❌ Should have failed but succeeded!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Correctly returned 401 Unauthorized" -ForegroundColor Green
    } else {
        Write-Host "❌ Unexpected error: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}
Write-Host ""

# Step 4: Test with non-admin user (should fail with 403)
Write-Host "🧪 Step 4: Testing with non-admin user (should fail)..." -ForegroundColor Yellow
Write-Host ""

$userLoginBody = @{
    email = "user@test.com"
    password = "Test@1234"
} | ConvertTo-Json

try {
    $userLoginResponse = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/v1/auth/login" `
        -Method Post `
        -Body $userLoginBody `
        -ContentType "application/json"
    
    $userToken = $userLoginResponse.data.token
    
    $userHeaders = @{
        "Authorization" = "Bearer $userToken"
        "Content-Type" = "application/json"
    }
    
    $syncResponse = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/v1/shipping-methods/sync" `
        -Method Post `
        -Headers $userHeaders `
        -Body "{}"
    
    Write-Host "❌ Should have failed but succeeded!" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 403) {
        Write-Host "✅ Correctly returned 403 Forbidden" -ForegroundColor Green
    } else {
        Write-Host "❌ Unexpected error: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}
Write-Host ""

# Step 5: Verify database
Write-Host "🗄️  Step 5: Verifying database..." -ForegroundColor Yellow
Write-Host ""

try {
    $getResponse = Invoke-RestMethod -Uri "http://127.0.0.1:3000/api/v1/shipping-methods" `
        -Method Get
    
    Write-Host "✅ Found $($getResponse.data.Count) active shipping methods:" -ForegroundColor Green
    $index = 1
    foreach ($method in $getResponse.data) {
        Write-Host "   $index. $($method.name)" -ForegroundColor White
        Write-Host "      ID: $($method.id), Basalam ID: $($method.basalamId)" -ForegroundColor Gray
        Write-Host "      Base Cost: $($method.baseCost), Additional: $($method.additionalCost)" -ForegroundColor Gray
        $index++
    }
} catch {
    Write-Host "❌ Failed to get shipping methods: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ All manual tests completed!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
