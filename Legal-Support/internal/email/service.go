package email

import (
	"bytes"
	"fmt"
	"html/template"
	"net/smtp"
	"os"
)

type EmailService struct {
	smtpHost     string
	smtpPort     string
	smtpUser     string
	smtpPassword string
	fromEmail    string
	fromName     string
}

func NewEmailService() *EmailService {
	return &EmailService{
		smtpHost:     getEnv("SMTP_HOST", "smtp.gmail.com"),
		smtpPort:     getEnv("SMTP_PORT", "587"),
		smtpUser:     getEnv("SMTP_USER", ""),
		smtpPassword: getEnv("SMTP_PASSWORD", ""),
		fromEmail:    getEnv("FROM_EMAIL", "noreply@legal-support.com"),
		fromName:     getEnv("FROM_NAME", "Legal Support System"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// SendPasswordResetEmail sends password reset email
func (s *EmailService) SendPasswordResetEmail(to, resetToken, resetURL string) error {
	if s.smtpUser == "" || s.smtpPassword == "" {
		// Email not configured - just log
		fmt.Printf("[Email] Password reset token for %s: %s\n", to, resetToken)
		fmt.Printf("[Email] Reset URL: %s\n", resetURL)
		return nil
	}

	subject := "Đặt lại mật khẩu - Legal Support"
	body := s.renderPasswordResetTemplate(resetToken, resetURL)

	return s.sendEmail(to, subject, body)
}

// SendVerificationEmail sends email verification email
func (s *EmailService) SendVerificationEmail(to, verificationToken, verificationURL string) error {
	if s.smtpUser == "" || s.smtpPassword == "" {
		// Email not configured - just log
		fmt.Printf("[Email] Verification token for %s: %s\n", to, verificationToken)
		fmt.Printf("[Email] Verification URL: %s\n", verificationURL)
		return nil
	}

	subject := "Xác thực email - Legal Support"
	body := s.renderVerificationTemplate(verificationToken, verificationURL)

	return s.sendEmail(to, subject, body)
}

func (s *EmailService) sendEmail(to, subject, body string) error {
	auth := smtp.PlainAuth("", s.smtpUser, s.smtpPassword, s.smtpHost)

	headers := make(map[string]string)
	headers["From"] = fmt.Sprintf("%s <%s>", s.fromName, s.fromEmail)
	headers["To"] = to
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = "text/html; charset=UTF-8"

	message := ""
	for k, v := range headers {
		message += fmt.Sprintf("%s: %s\r\n", k, v)
	}
	message += "\r\n" + body

	addr := fmt.Sprintf("%s:%s", s.smtpHost, s.smtpPort)
	return smtp.SendMail(addr, auth, s.fromEmail, []string{to}, []byte(message))
}

func (s *EmailService) renderPasswordResetTemplate(token, resetURL string) string {
	tmpl := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6B240C 0%, #994D1C 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 30px; background: #994D1C; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Đặt lại mật khẩu</h1>
        </div>
        <div class="content">
            <p>Xin chào,</p>
            <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản Legal Support của mình.</p>
            <p>Nhấn vào nút bên dưới để đặt lại mật khẩu:</p>
            <p style="text-align: center;">
                <a href="{{.ResetURL}}" class="button">Đặt lại mật khẩu</a>
            </p>
            <p>Hoặc copy link sau vào trình duyệt:</p>
            <p style="word-break: break-all; background: white; padding: 10px; border-radius: 5px;">{{.ResetURL}}</p>
            <p><strong>Lưu ý:</strong> Link này chỉ có hiệu lực trong 1 giờ.</p>
            <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 Legal Support System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`
	t := template.Must(template.New("reset").Parse(tmpl))
	var buf bytes.Buffer
	t.Execute(&buf, map[string]string{"ResetURL": resetURL})
	return buf.String()
}

func (s *EmailService) renderVerificationTemplate(token, verificationURL string) string {
	tmpl := `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 30px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Xác thực Email</h1>
        </div>
        <div class="content">
            <p>Xin chào,</p>
            <p>Cảm ơn bạn đã đăng ký tài khoản Legal Support!</p>
            <p>Vui lòng xác thực email của bạn bằng cách nhấn vào nút bên dưới:</p>
            <p style="text-align: center;">
                <a href="{{.VerificationURL}}" class="button">Xác thực Email</a>
            </p>
            <p>Hoặc copy link sau vào trình duyệt:</p>
            <p style="word-break: break-all; background: white; padding: 10px; border-radius: 5px;">{{.VerificationURL}}</p>
            <p><strong>Lưu ý:</strong> Link này chỉ có hiệu lực trong 24 giờ.</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 Legal Support System. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`
	t := template.Must(template.New("verify").Parse(tmpl))
	var buf bytes.Buffer
	t.Execute(&buf, map[string]string{"VerificationURL": verificationURL})
	return buf.String()
}
