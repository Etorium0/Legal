import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import SimpleLayout from './SimpleLayout'
import { authService } from '../services/authService'
import { Sparkles } from 'lucide-react'

type UnitDetail =
{
  document: { title?: string; type?: string; number?: string; year?: number }
  unit: { id?: string; level?: string; code?: string; text?: string }
}

const prettifyText = (txt: string): string =>
{
  return (txt || '')
    .replace(/\uFFFD/g, '')
    .replace(/\r?\n/g, '\n')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const UnitDetailPage: React.FC = () =>
{
  const { id } = useParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<UnitDetail | null>(null)

  useEffect(() =>
  {
    const fetchData = async () =>
    {
      if (!id)
      {
        setError('Thiếu ID đơn vị')
        return
      }
      setLoading(true)
      setError(null)
      try
      {
        const token = await authService.getValidAccessToken()
        const headers: Record<string, string> = {}
        if (token)
        {
          headers['Authorization'] = `Bearer ${token}`
        }
        const res = await fetch(`/api/v1/query/units/${id}`, { headers })
        if (!res.ok)
        {
          const text = await res.text().catch(() => '')
          throw new Error(text || `HTTP ${res.status}`)
        }
        const json = await res.json()
        setData(json as UnitDetail)
      }
      catch (e: any)
      {
        setError(e?.message || 'Tải dữ liệu thất bại')
      }
      finally
      {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  const title =
    (data?.document?.title ? data?.document?.title : '') ||
    (data?.unit?.level ? `${String(data?.unit?.level).toUpperCase()} ${data?.unit?.code || ''}`.trim() : '') ||
    'Đơn vị văn bản'

  return (
    <SimpleLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-2xl font-bold text-white">{title}</h2>
          </div>
          {data?.document?.number && (
            <div className="text-sm text-white/60">
              Số hiệu: {data.document.number} • Năm: {data.document.year || ''}
            </div>
          )}
        </div>

        {loading && (
          <div className="text-white/70">Đang tải...</div>
        )}

        {error && (
          <div className="text-red-300 text-sm">{error}</div>
        )}

        {!loading && !error && data?.unit?.text && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-white leading-relaxed whitespace-pre-wrap">
            {prettifyText(data.unit.text)}
          </div>
        )}

        {!loading && !error && !data?.unit?.text && (
          <div className="text-white/60">Không có nội dung cho đơn vị này.</div>
        )}
      </div>
    </SimpleLayout>
  )
}

export default UnitDetailPage
