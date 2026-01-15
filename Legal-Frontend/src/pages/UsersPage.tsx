import React, { useEffect, useState } from 'react'
import { authService } from '../services/authService'
import { getBackendUrl } from '../config'
import { useAuth } from '../components/AuthContext'
import SimpleLayout from '../components/SimpleLayout'

interface User {
    id: string
    email: string
    name: string
    role: string
    created_at: string
}

const UsersPage: React.FC = () => 
{
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [deletingUser, setDeletingUser] = useState<User | null>(null)

    // Form state
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [role, setRole] = useState('user')

    const { user: currentUser } = useAuth()

    useEffect(() => 
{
        loadUsers()
    }, [])

    const loadUsers = async () => 
{
        try 
{
            setLoading(true)
            const res = await authService.authFetch(`${getBackendUrl()}/api/v1/users`)
            if (!res.ok) {throw new Error('Failed to load users')}
            const data = await res.json()
            setUsers(data)
        }
 catch (err: any) 
{
            setError(err.message)
        }
 finally 
{
            setLoading(false)
        }
    }

    const promptDelete = (user: User) => 
{
        setDeletingUser(user)
    }

    const confirmDelete = async () => 
{
        if (!deletingUser) {return}
        try 
{
            const res = await authService.authFetch(`${getBackendUrl()}/api/v1/users/${deletingUser.id}`, {
                method: 'DELETE'
            })
            if (!res.ok) {throw new Error('Failed to delete user')}
            loadUsers()
            setDeletingUser(null)
        }
 catch (err: any) 
{
            alert(err.message)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => 
{
        e.preventDefault()
        try 
{
            if (editingUser) 
{
                // Update
                const res = await authService.authFetch(`${getBackendUrl()}/api/v1/users/${editingUser.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ email, name, role, password: password || undefined })
                })
                if (!res.ok) {throw new Error('Failed to update user')}
            }
 else 
{
                // Create
                const res = await authService.authFetch(`${getBackendUrl()}/api/v1/users`, {
                    method: 'POST',
                    body: JSON.stringify({ email, password, name, role })
                })
                if (!res.ok) {throw new Error('Failed to create user')}
            }
            closeModal()
            loadUsers()
        }
 catch (err: any) 
{
            alert(err.message)
        }
    }

    const openModal = (user?: User) => 
{
        if (user) 
{
            setEditingUser(user)
            setEmail(user.email)
            setName(user.name)
            setRole(user.role)
            setPassword('')
        }
 else 
{
            setEditingUser(null)
            setEmail('')
            setName('')
            setRole('user')
            setPassword('')
        }
        setIsModalOpen(true)
    }

    const closeModal = () => 
{
        setIsModalOpen(false)
        setEditingUser(null)
    }

    const isLoading = loading && users.length === 0

    return (
        <SimpleLayout>
            <div className="pb-24">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Quản lý người dùng</h1>
                        <p className="mt-2 text-white/70">Quản lý tài khoản và quyền truy cập hệ thống.</p>
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-3 text-white shadow-lg hover:shadow-blue-500/25 hover:scale-105 transition-all font-medium"
                    >
                        + Thêm người dùng
                    </button>
                </div>

                {isLoading ? (
                    <div className="p-12 text-center text-white/50">Đang tải danh sách...</div>
                ) : error ? (
                    <div className="p-8 text-center text-red-400 bg-red-900/20 rounded-xl border border-red-500/30">Lỗi: {error}</div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-white/10">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/70">Tên</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/70">Email</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/70">Vai trò</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-white/70">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <div className="font-medium text-white">{u.name || 'N/A'}</div>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-white/70">{u.email}</td>
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${u.role === 'admin'
                                                    ? 'bg-purple-400/10 text-purple-400 ring-purple-400/30'
                                                    : 'bg-green-400/10 text-green-400 ring-green-400/30'
                                                    }`}>
                                                    {u.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                                <button
                                                    onClick={() => openModal(u)}
                                                    className="text-blue-400 hover:text-blue-300 mr-4 transition-colors"
                                                >
                                                    Sửa
                                                </button>
                                                {u.id !== currentUser?.id && (
                                                    <button
                                                        onClick={() => promptDelete(u)}
                                                        className="text-red-400 hover:text-red-300 transition-colors"
                                                    >
                                                        Xoá
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {users.length === 0 && <div className="p-8 text-center text-white/50">Chưa có người dùng nào.</div>}
                    </div>
                )}
            </div>

            {/* Modal Edit/Create */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 px-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl bg-[#1e1e24] border border-white/10 p-6 shadow-2xl ring-1 ring-white/10">
                        <h2 className="mb-6 text-xl font-bold text-white">{editingUser ? 'Sửa thông tin' : 'Thêm người dùng mới'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1">Tên hiển thị</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/30 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                    placeholder="Nhập tên..."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/30 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                    placeholder="email@example.com"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1">
                                    Mật khẩu {editingUser && <span className="text-white/40 font-normal">(Để trống nếu không đổi)</span>}
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-white/30 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                    placeholder="••••••••"
                                    required={!editingUser}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-1">Vai trò</label>
                                <div className="relative">
                                    <select
                                        value={role}
                                        onChange={e => setRole(e.target.value)}
                                        className="block w-full appearance-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                    >
                                        <option value="user" className="bg-[#1e1e24]">Người dùng</option>
                                        <option value="admin" className="bg-[#1e1e24]">Quản trị viên</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white/70">
                                        <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-lg px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                                >
                                    Huỷ
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20"
                                >
                                    {editingUser ? 'Lưu thay đổi' : 'Tạo người dùng'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Delete Confirmation */}
            {deletingUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 px-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm rounded-2xl bg-[#1e1e24] border border-white/10 p-6 shadow-2xl ring-1 ring-white/10">
                        <h2 className="mb-4 text-xl font-bold text-white">Xác nhận xoá</h2>
                        <p className="mb-6 text-white/70">
                            Bạn có chắc chắn muốn xoá người dùng <span className="text-white font-medium">{deletingUser.name}</span> không? Hành động này không thể hoàn tác.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setDeletingUser(null)}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                            >
                                Huỷ
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors shadow-lg shadow-red-500/20"
                            >
                                Xoá
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </SimpleLayout>
    )
}

export default UsersPage
