# Download Whisper Model Script
# Tải model Whisper nhỏ (~39MB) cho STT offline

Write-Host "=== Whisper Model Downloader ===" -ForegroundColor Green
Write-Host "Tải model Whisper cho Speech-to-Text offline" -ForegroundColor Yellow

# Tạo thư mục models nếu chưa có
$modelsDir = "models"
if (-not (Test-Path $modelsDir)) {
    New-Item -ItemType Directory -Path $modelsDir -Force
    Write-Host "Đã tạo thư mục: $modelsDir" -ForegroundColor Green
}

# URL model nhỏ (39MB) thay vì model lớn (142MB)
$modelUrl = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin"
$modelPath = "$modelsDir\ggml-tiny.en.bin"

Write-Host "Đang tải model Whisper..." -ForegroundColor Cyan
Write-Host "URL: $modelUrl" -ForegroundColor Gray
Write-Host "Lưu tại: $modelPath" -ForegroundColor Gray

try {
    # Tải file với progress bar
    Invoke-WebRequest -Uri $modelUrl -OutFile $modelPath -UseBasicParsing
    
    Write-Host "`n✅ Tải thành công!" -ForegroundColor Green
    Write-Host "Model đã lưu tại: $modelPath" -ForegroundColor Green
    
    # Hiển thị thông tin file
    $fileInfo = Get-Item $modelPath
    $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
    Write-Host "Kích thước: $sizeMB MB" -ForegroundColor Cyan
    
} catch {
    Write-Host "`n❌ Lỗi khi tải model:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "`nHướng dẫn thủ công:" -ForegroundColor Yellow
    Write-Host "1. Mở trình duyệt và truy cập: $modelUrl" -ForegroundColor White
    Write-Host "2. Tải file và lưu vào thư mục: $modelsDir" -ForegroundColor White
    Write-Host "3. Đổi tên file thành: ggml-tiny.en.bin" -ForegroundColor White
}

Write-Host "`n=== Hướng dẫn sử dụng ===" -ForegroundColor Green
Write-Host "Để chạy với Whisper offline:" -ForegroundColor White
Write-Host '$env:ASSISTANT_TRANSCRIBER="whisper"' -ForegroundColor Cyan
Write-Host '$env:ASSISTANT_SPEECH_PROVIDER="sapi"' -ForegroundColor Cyan
Write-Host ".\assistant.exe" -ForegroundColor Cyan

Write-Host "`nNhấn Enter để thoát..." -ForegroundColor Gray
Read-Host 