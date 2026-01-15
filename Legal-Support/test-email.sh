#!/bin/bash

# Test Email Configuration Script
# Chạy script này để test xem email có gửi được không

echo "=========================================="
echo "🔧 Legal Support - Email Configuration Test"
echo "=========================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ File .env không tồn tại!"
    exit 1
fi

# Load .env
source .env

echo "📧 Kiểm tra cấu hình SMTP..."
echo "SMTP_HOST: $SMTP_HOST"
echo "SMTP_PORT: $SMTP_PORT"
echo "SMTP_USER: $SMTP_USER"
echo "FROM_EMAIL: $FROM_EMAIL"
echo ""

if [ -z "$SMTP_USER" ] || [ -z "$SMTP_PASSWORD" ]; then
    echo "⚠️  SMTP chưa được cấu hình"
    echo "→ Email sẽ được log ra console thay vì gửi thật"
    echo ""
    echo "📝 Để cấu hình Gmail:"
    echo "1. Vào https://myaccount.google.com/apppasswords"
    echo "2. Tạo App Password"
    echo "3. Cập nhật .env:"
    echo "   SMTP_USER=your-email@gmail.com"
    echo "   SMTP_PASSWORD=xxxx xxxx xxxx xxxx"
    echo ""
else
    echo "✅ SMTP đã được cấu hình"
    echo "→ Email sẽ được gửi thật qua $SMTP_HOST"
fi

echo "=========================================="
echo "🧪 Test API Forgot Password"
echo "=========================================="
echo ""
echo "Nhập email để test (hoặc Enter để skip):"
read -r test_email

if [ -n "$test_email" ]; then
    echo ""
    echo "Đang gửi request forgot password..."

    response=$(curl -s -X POST http://localhost:8080/api/v1/auth/forgot-password \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"$test_email\"}")

    echo "Response: $response"
    echo ""
    echo "✅ Kiểm tra:"
    if [ -z "$SMTP_USER" ]; then
        echo "- Xem console của API server để lấy token"
    else
        echo "- Kiểm tra email: $test_email"
        echo "- Có thể ở Spam folder"
    fi
fi

echo ""
echo "=========================================="
echo "📚 Tài liệu đầy đủ: AUTH_API_GUIDE.md"
echo "=========================================="
