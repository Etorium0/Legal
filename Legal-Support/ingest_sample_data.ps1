$url = "http://localhost:8080/api/v1/query/ingest"
$jsonPath = "sample_data.json"

try {
    $jsonContent = Get-Content $jsonPath -Raw -Encoding UTF8
    $headers = @{
        "Content-Type" = "application/json; charset=utf-8"
    }
    
    Write-Host "Sending request to $url..."
    $response = Invoke-RestMethod -Uri $url -Method POST -Headers $headers -Body $jsonContent -ErrorAction Stop
    
    Write-Host "Success!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10
    
} catch {
    Write-Host "Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.ErrorDetails) {
        Write-Host "Details: $($_.ErrorDetails.Message)"
    }
}
