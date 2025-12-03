import React, { useState } from 'react';
import { Bot, Globe, Key, Bell, Shield, User } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';

export function SettingsPage() {
  const [language, setLanguage] = useState('vi');
  const [aiModel, setAiModel] = useState('gpt-4');
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="flex-1 bg-[--color-background-alt] overflow-auto">
      <div className="max-w-4xl mx-auto p-8">
        <h2 className="mb-8">Cài đặt hệ thống</h2>

        <div className="space-y-6">
          {/* Profile Section */}
          <div className="bg-white rounded-xl border border-[--color-border] p-6">
            <div className="flex items-center gap-3 mb-6">
              <User className="w-5 h-5 text-[--color-primary-600]" />
              <h4>Thông tin cá nhân</h4>
            </div>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Input label="Họ và tên" defaultValue="Nguyễn Văn A" />
                <Input label="Email" defaultValue="nguyen.van.a@example.com" disabled />
              </div>
              <Input label="Số điện thoại" defaultValue="+84 912 345 678" />
              <div className="flex justify-end">
                <Button variant="primary" size="sm">
                  Cập nhật thông tin
                </Button>
              </div>
            </div>
          </div>

          {/* AI Model Settings */}
          <div className="bg-white rounded-xl border border-[--color-border] p-6">
            <div className="flex items-center gap-3 mb-6">
              <Bot className="w-5 h-5 text-[--color-primary-600]" />
              <h4>Cài đặt mô hình AI</h4>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block mb-3">Chọn mô hình AI</label>
                <div className="space-y-2">
                  {[
                    { id: 'gpt-4', name: 'GPT-4', desc: 'Mô hình mạnh nhất, độ chính xác cao' },
                    { id: 'gpt-3.5', name: 'GPT-3.5 Turbo', desc: 'Cân bằng giữa tốc độ và chất lượng' },
                    { id: 'claude', name: 'Claude 3', desc: 'Phân tích văn bản pháp lý chuyên sâu' }
                  ].map((model) => (
                    <label
                      key={model.id}
                      className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        aiModel === model.id
                          ? 'border-[--color-primary-500] bg-[--color-primary-50]'
                          : 'border-[--color-border] hover:border-[--color-primary-300]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="aiModel"
                        value={model.id}
                        checked={aiModel === model.id}
                        onChange={(e) => setAiModel(e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="text-[--color-text-primary]">{model.name}</div>
                        <div className="text-sm text-[--color-text-secondary]">{model.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block mb-2">Độ sáng tạo (Temperature)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="30"
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-[--color-text-tertiary] mt-1">
                  <span>Chính xác</span>
                  <span>Sáng tạo</span>
                </div>
              </div>
            </div>
          </div>

          {/* Language Settings */}
          <div className="bg-white rounded-xl border border-[--color-border] p-6">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-5 h-5 text-[--color-primary-600]" />
              <h4>Ngôn ngữ</h4>
            </div>
            <div className="space-y-2">
              {[
                { id: 'vi', name: 'Tiếng Việt', native: 'Tiếng Việt' },
                { id: 'en', name: 'English', native: 'English' }
              ].map((lang) => (
                <label
                  key={lang.id}
                  className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    language === lang.id
                      ? 'border-[--color-primary-500] bg-[--color-primary-50]'
                      : 'border-[--color-border] hover:border-[--color-primary-300]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="language"
                      value={lang.id}
                      checked={language === lang.id}
                      onChange={(e) => setLanguage(e.target.value)}
                    />
                    <div>
                      <div className="text-[--color-text-primary]">{lang.name}</div>
                      <div className="text-sm text-[--color-text-secondary]">{lang.native}</div>
                    </div>
                  </div>
                  {language === lang.id && (
                    <div className="px-2 py-1 bg-[--color-primary-600] text-white text-xs rounded">
                      Đang sử dụng
                    </div>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* API Key Settings */}
          <div className="bg-white rounded-xl border border-[--color-border] p-6">
            <div className="flex items-center gap-3 mb-6">
              <Key className="w-5 h-5 text-[--color-primary-600]" />
              <h4>API Key</h4>
            </div>
            <div className="space-y-4">
              <Input
                label="OpenAI API Key"
                type="password"
                placeholder="sk-..."
                helperText="Key của bạn sẽ được mã hóa và lưu trữ an toàn"
              />
              <Input
                label="Custom API Endpoint (Tùy chọn)"
                placeholder="https://api.example.com"
                helperText="Để trống nếu sử dụng endpoint mặc định"
              />
              <div className="flex justify-end">
                <Button variant="primary" size="sm">
                  Lưu API Key
                </Button>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-xl border border-[--color-border] p-6">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-5 h-5 text-[--color-primary-600]" />
              <h4>Thông báo</h4>
            </div>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 border border-[--color-border] rounded-lg cursor-pointer">
                <div>
                  <div className="text-[--color-text-primary]">Thông báo email</div>
                  <div className="text-sm text-[--color-text-secondary]">
                    Nhận thông báo về cập nhật văn bản pháp luật mới
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                  className="w-5 h-5 rounded border-[--color-border] text-[--color-primary-600]"
                />
              </label>
              <label className="flex items-center justify-between p-4 border border-[--color-border] rounded-lg cursor-pointer">
                <div>
                  <div className="text-[--color-text-primary]">Lưu lịch sử câu hỏi</div>
                  <div className="text-sm text-[--color-text-secondary]">
                    Lưu trữ các câu hỏi đã hỏi để tra cứu sau
                  </div>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 rounded border-[--color-border] text-[--color-primary-600]"
                />
              </label>
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="bg-white rounded-xl border border-[--color-border] p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-5 h-5 text-[--color-primary-600]" />
              <h4>Quyền riêng tư & Bảo mật</h4>
            </div>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 bg-[--color-neutral-50] rounded-lg hover:bg-[--color-neutral-100] transition-colors">
                <div className="text-[--color-text-primary]">Tải xuống dữ liệu của tôi</div>
                <div className="text-sm text-[--color-text-secondary]">
                  Xuất toàn bộ dữ liệu cá nhân và lịch sử sử dụng
                </div>
              </button>
              <button className="w-full text-left px-4 py-3 bg-[--color-neutral-50] rounded-lg hover:bg-[--color-neutral-100] transition-colors">
                <div className="text-[--color-text-primary]">Xóa lịch sử tìm kiếm</div>
                <div className="text-sm text-[--color-text-secondary]">
                  Xóa toàn bộ lịch sử câu hỏi và kết quả
                </div>
              </button>
              <button className="w-full text-left px-4 py-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-red-600">
                <div>Xóa tài khoản</div>
                <div className="text-sm">
                  Xóa vĩnh viễn tài khoản và toàn bộ dữ liệu
                </div>
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3 pt-6">
            <Button variant="ghost" size="md">
              Hủy thay đổi
            </Button>
            <Button variant="primary" size="md">
              Lưu tất cả cài đặt
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
