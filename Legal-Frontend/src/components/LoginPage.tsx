import React from 'react'
import Input from './ui/input'
import Button from './ui/button'

const LoginPage: React.FC = () => {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
      <div className="w-full max-w-sm rounded-lg border border-white/10 bg-white/5 p-6 shadow-sm text-white">
        <h2 className="text-center text-xl font-semibold">Đăng nhập</h2>
        <p className="mt-2 text-center text-sm text-white/70">Nhập thông tin để tiếp tục</p>

        <form className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-2 outline-none text-white placeholder-white/60" type="email" placeholder="you@example.com" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Mật khẩu</label>
            <input className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-2 outline-none text-white placeholder-white/60" type="password" placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full" variant="primary">Đăng nhập</Button>
          <p className="mt-2 text-center text-xs text-white/60">Quên mật khẩu? <a className="text-white hover:underline" href="#">Khôi phục</a></p>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
