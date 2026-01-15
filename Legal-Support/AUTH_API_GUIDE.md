# Hướng dẫn API Xác thực - Legal Support System

## 🔐 Tổng quan

API xác thực đã được nâng cấp với các tính năng:
- ✅ Quên mật khẩu (Password Reset)
- ✅ Xác thực email (Email Verification)
- ✅ Gửi email tự động với HTML template đẹp

## 📝 Cấu hình

### 1. Database Migration

Chạy migration để tạo các bảng cần thiết:

```bash
go run cmd/migrate/main.go
```

Hoặc chạy SQL trực tiếp:
```bash
psql -U legaluser -d legaldb -f migrations/0007_auth_tokens.sql
```

### 2. Environment Variables

Cập nhật file `.env` với thông tin SMTP:

```env
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@legal-support.com
FROM_NAME=Legal Support System

# Frontend URL for email links
FRONTEND_URL=http://localhost:3000
```

**Lưu ý Gmail**:
- Sử dụng App Password thay vì mật khẩu thật
- Tạo App Password tại: https://myaccount.google.com/apppasswords

## 🚀 API Endpoints

### 1. Đăng ký (Register)

**Endpoint**: `POST /api/v1/auth/register`

**Request Body**:
```json
{
  "email": "user@example.com",
  "name": "Nguyễn Văn A",
  "password": "password123"
}
```

**Response**:
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "expires_in": 900
}
```

**Ghi chú**:
- Tự động gửi email xác thực sau khi đăng ký
- Email chứa link có dạng: `http://localhost:3000/verify-email?token=xxx`

---

### 2. Quên mật khẩu (Forgot Password)

**Endpoint**: `POST /api/v1/auth/forgot-password`

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "message": "If the email exists, a password reset link has been sent"
}
```

**Ghi chú**:
- Luôn trả về success (không tiết lộ email có tồn tại hay không)
- Email chứa link reset có dạng: `http://localhost:3000/reset-password?token=xxx`
- Token hết hạn sau **1 giờ**

---

### 3. Đặt lại mật khẩu (Reset Password)

**Endpoint**: `POST /api/v1/auth/reset-password`

**Request Body**:
```json
{
  "token": "abc123-def456-...",
  "new_password": "newpassword123"
}
```

**Response**:
```json
{
  "message": "Password reset successfully"
}
```

**Lỗi có thể gặp**:
- `invalid or expired reset token` - Token không tồn tại hoặc đã hết hạn
- `reset token already used` - Token đã được sử dụng
- `password must be at least 6 characters` - Mật khẩu quá ngắn

---

### 4. Xác thực Email (Verify Email)

**Endpoint**: `POST /api/v1/auth/verify-email`

**Request Body**:
```json
{
  "token": "xyz789-abc123-..."
}
```

**Response**:
```json
{
  "message": "Email verified successfully"
}
```

**Lỗi có thể gặp**:
- `invalid or expired verification token` - Token không hợp lệ
- `verification token already used` - Đã xác thực rồi
- Token hết hạn sau **24 giờ**

---

### 5. Gửi lại Email Xác thực (Resend Verification)

**Endpoint**: `POST /api/v1/auth/resend-verification`

**Headers**:
```
Authorization: Bearer {access_token}
```

**Response**:
```json
{
  "message": "Verification email sent"
}
```

**Ghi chú**: Cần đăng nhập (có access token) để gọi API này

---

## 🧪 Testing với cURL

### Test Forgot Password
```bash
curl -X POST http://localhost:8080/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

### Test Reset Password
```bash
curl -X POST http://localhost:8080/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_TOKEN_FROM_EMAIL",
    "new_password": "newpassword123"
  }'
```

### Test Verify Email
```bash
curl -X POST http://localhost:8080/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_VERIFICATION_TOKEN"}'
```

### Test Resend Verification
```bash
curl -X POST http://localhost:8080/api/v1/auth/resend-verification \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 📧 Email Templates

### Password Reset Email
- **Subject**: "Đặt lại mật khẩu - Legal Support"
- **Design**: Gradient header (đỏ nâu), nút CTA màu #994D1C
- **Content**: Link reset password + warning về thời hạn 1 giờ

### Email Verification
- **Subject**: "Xác thực email - Legal Support"
- **Design**: Gradient header (xanh dương), nút CTA màu #3b82f6
- **Content**: Link xác thực + thời hạn 24 giờ

---

## 🔒 Security Features

1. **Token Expiry**:
   - Reset password: 1 giờ
   - Email verification: 24 giờ

2. **Single Use Tokens**:
   - Mỗi token chỉ dùng được 1 lần
   - Sau khi sử dụng, token được đánh dấu `used = true`

3. **No Email Disclosure**:
   - API forgot-password không tiết lộ email có tồn tại hay không
   - Luôn trả về success message

4. **Password Validation**:
   - Tối thiểu 6 ký tự
   - Hash bằng bcrypt

5. **Background Email Sending**:
   - Email được gửi trong goroutine riêng
   - Không block response API

---

## 🛠️ Troubleshooting

### Email không được gửi

**Kiểm tra console log**:
```
[Email] Password reset token for user@example.com: abc-123-...
[Email] Reset URL: http://localhost:3000/reset-password?token=abc-123-...
```

Nếu thấy log này → SMTP chưa config, email được log ra console thay vì gửi thật.

**Fix**: Cấu hình SMTP_USER và SMTP_PASSWORD trong `.env`

### Gmail App Password

1. Vào https://myaccount.google.com/security
2. Bật "2-Step Verification"
3. Vào https://myaccount.google.com/apppasswords
4. Tạo password cho "Mail" app
5. Copy password vào `SMTP_PASSWORD`

### Token expired

Reset token hết hạn sau 1 giờ. Yêu cầu forgot password lại để nhận token mới.

### Database error

Chạy migration trước:
```bash
go run cmd/migrate/main.go
```

Hoặc kiểm tra database đã có tables:
```sql
SELECT * FROM password_reset_tokens;
SELECT * FROM email_verification_tokens;
SELECT email_verified FROM users;
```

---

## 📊 Database Schema

### `password_reset_tokens`
```sql
CREATE TABLE password_reset_tokens (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT PRIMARY KEY,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### `email_verification_tokens`
```sql
CREATE TABLE email_verification_tokens (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT PRIMARY KEY,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### `users` (updated)
```sql
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
```

---

## ✅ Checklist Triển khai

- [ ] Chạy migration `0007_auth_tokens.sql`
- [ ] Cấu hình SMTP trong `.env`
- [ ] Test forgot password flow
- [ ] Test email verification flow
- [ ] Tạo frontend pages:
  - [ ] `/reset-password` - form nhập mật khẩu mới
  - [ ] `/verify-email` - trang xác nhận email
- [ ] Kiểm tra email templates hiển thị đúng
- [ ] Test với Gmail App Password
- [ ] (Optional) Deploy và test trên production

---

## 🎨 Frontend Integration

### Reset Password Page

```typescript
// /reset-password page
const ResetPasswordPage = () => {
  const [token] = useSearchParams();
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    const response = await fetch('/api/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token.get('token'),
        new_password: password
      })
    });

    if (response.ok) {
      // Redirect to login
      navigate('/login');
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
};
```

### Email Verification Page

```typescript
// /verify-email page
const VerifyEmailPage = () => {
  const [token] = useSearchParams();

  useEffect(() => {
    const verify = async () => {
      const response = await fetch('/api/v1/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.get('token') })
      });

      if (response.ok) {
        // Show success message
      }
    };
    verify();
  }, []);

  return <div>Đang xác thực email...</div>;
};
```

---

## 📞 Support

Nếu có vấn đề, kiểm tra:
1. Console logs của backend
2. Email có đến spam folder không
3. Token có hết hạn chưa
4. Database migration đã chạy chưa

Happy coding! 🚀
