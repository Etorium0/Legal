import React from 'react'
import Button from './ui/button'

const SettingsPage: React.FC = () => {
  return (
    <div className="p-6 panel-2 rounded-lg text-white">
      <h2 className="text-xl font-semibold">Cài đặt</h2>
      <p className="mt-2 text-white/70">Tuỳ chỉnh giao diện và cấu hình hệ thống.</p>

      <div className="mt-6 space-y-4">
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h3 className="font-semibold">Giao diện</h3>
          <div className="mt-2 flex items-center gap-3">
            <Button variant="secondary">Sáng</Button>
            <Button variant="secondary">Tối</Button>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h3 className="font-semibold">Ngôn ngữ</h3>
          <div className="mt-2 flex items-center gap-3">
            <Button variant="secondary">Tiếng Việt</Button>
            <Button variant="secondary">English</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
