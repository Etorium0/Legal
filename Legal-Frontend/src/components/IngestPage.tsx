import React, { useState } from 'react'
import SimpleLayout from './SimpleLayout'
import { authService } from '../services/authService'

const IngestPage: React.FC = () => {
  const backendUrl = (typeof window !== 'undefined' && (window as any).__BACKEND_URL__) || import.meta.env.VITE_BACKEND_URL
  const apiBase = backendUrl ? `${backendUrl}/api/v1` : '/api/v1'
  const [payload, setPayload] = useState(`{
  "document": {"title": "", "type": ""},
  "units": []
}`)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const token = await authService.getValidAccessToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${apiBase}/query/ingest`, {
        method: 'POST',
        headers,
        body: payload,
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setResult(data)
    } catch (e: any) {
      setError(e?.message || 'Ingest thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SimpleLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-white">Ingest dữ liệu</h2>
          <p className="mt-2 text-white/70">Dán JSON tài liệu + units và gửi vào backend.</p>
        </div>

        <div className="space-y-3">
          <label className="text-sm text-white/60">Payload JSON</label>
          <textarea
            className="w-full min-h-[320px] rounded-xl bg-white/5 border border-white/10 text-white p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
          />
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {loading ? 'Đang gửi...' : 'Gửi ingest'}
            </button>
            {error && <span className="text-red-300 text-sm">{error}</span>}
          </div>
        </div>

        {result && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white text-sm space-y-2">
            <div className="font-semibold">Kết quả</div>
            <pre className="whitespace-pre-wrap break-words text-white/80">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </SimpleLayout>
  )
}

export default IngestPage
