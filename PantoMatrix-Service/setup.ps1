# Setup script for PantoMatrix Service (Windows PowerShell)
# This script clones and sets up PantoMatrix repository

Write-Host "Setting up PantoMatrix Service..." -ForegroundColor Green

# Check if PantoMatrix directory exists
if (Test-Path "PantoMatrix") {
    Write-Host "PantoMatrix directory already exists. Skipping clone." -ForegroundColor Yellow
} else {
    Write-Host "Cloning PantoMatrix repository..." -ForegroundColor Cyan
    git clone https://github.com/PantoMatrix/PantoMatrix.git
    
    Set-Location PantoMatrix
    
    Write-Host "Note: PantoMatrix setup.sh requires bash/Linux environment" -ForegroundColor Yellow
    Write-Host "For Windows, please use WSL or Docker" -ForegroundColor Yellow
    
    Set-Location ..
}

Write-Host "Installing Python service dependencies..." -ForegroundColor Cyan
pip install -r requirements.txt

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start the service:" -ForegroundColor Cyan
Write-Host "  python app.py" -ForegroundColor White
Write-Host ""
Write-Host "Or with Docker:" -ForegroundColor Cyan
Write-Host "  docker build -t pantomatrix-service ." -ForegroundColor White
Write-Host "  docker run -p 8081:8081 pantomatrix-service" -ForegroundColor White
Write-Host ""
Write-Host "Service will be available at: http://localhost:8081" -ForegroundColor Green
Write-Host "API docs: http://localhost:8081/docs" -ForegroundColor Green
Write-Host ""
