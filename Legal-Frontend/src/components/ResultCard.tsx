import React from 'react'
import Button from './ui/button'

interface ResultCardProps {
  title: string
  snippet?: string
  tags?: string[]
  onOpen?: () => void
}

const ResultCard: React.FC<ResultCardProps> = ({ title, snippet, tags = [], onOpen }) => 
{
  return (
    <article className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold">{title}</h3>
      {snippet && <p className="mt-1 text-sm text-gray-600 line-clamp-3">{snippet}</p>}
      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((t, i) => (
            <span key={i} className="rounded-full border bg-gray-50 px-2 py-1 text-xs text-gray-700">{t}</span>
          ))}
        </div>
      )}
      <div className="mt-4 text-right">
        <Button size="sm" variant="secondary" onClick={onOpen}>Mở</Button>
      </div>
    </article>
  )
}

export default ResultCard
