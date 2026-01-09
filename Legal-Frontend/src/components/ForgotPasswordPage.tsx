import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const ForgotPasswordPage: React.FC = () => 
{
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => 
    {
        e.preventDefault()
        setLoading(true)
        // Simulate API call
        setTimeout(() => 
        {
            setLoading(false)
            setSubmitted(true)
        }, 1500)
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="w-full max-w-md space-y-8">
                {/* Header */}
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-4">
                        <span className="text-3xl">🔐</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Khôi phục mật khẩu</h2>
                    <p className="mt-2 text-sm text-slate-400">
                        Nhập email của bạn để nhận hướng dẫn đặt lại mật khẩu.
                    </p>
                </div>

                {/* Success State */}
                {submitted ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
                        <div className="mx-auto h-12 w-12 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 text-emerald-400">
                            <span className="text-2xl">✉️</span>
                        </div>
                        <h3 className="text-lg font-medium text-emerald-400 mb-2">Đã gửi email!</h3>
                        <p className="text-sm text-slate-300 mb-6">
                            Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu đến <strong>{email}</strong>.
                            Vui lòng kiểm tra hộp thư của bạn.
                        </p>
                        <Link 
                            to="/login"
                            className="block w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors text-center"
                        >
                            Quay lại đăng nhập
                        </Link>
                        <button
                            onClick={() => setSubmitted(false)}
                            className="mt-4 text-sm text-emerald-400/80 hover:text-emerald-400 font-medium"
                        >
                            Gửi lại email?
                        </button>
                    </div>
                ) : (
                    /* Form */
                    <div className="bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-xl">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2 ml-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-white/10 bg-slate-800 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !email}
                                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-lg shadow-indigo-500/25"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Đang gửi...
                                    </span>
                                ) : 'Gửi hướng dẫn'}
                            </button>
                        </form>

                        <div className="mt-6">
                            <Link
                                to="/login"
                                className="flex items-center justify-center text-sm font-medium text-slate-400 hover:text-white transition-colors group"
                            >
                                <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span>
                                Quay lại đăng nhập
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ForgotPasswordPage
