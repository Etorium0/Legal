export type HistoryItem = { question: string; answer?: string; timestamp: number }

function isHistoryItem(v: unknown): v is HistoryItem 
{
  if (!v || typeof v !== 'object') {return false}
  const obj = v as Record<string, unknown>
  return (
    typeof obj.question === 'string' &&
    (obj.answer === undefined || typeof obj.answer === 'string') &&
    typeof obj.timestamp === 'number'
  )
}

const KEY = 'legal.history.items'

export function getHistory(): HistoryItem[] 
{
  try 
{
    const raw = localStorage.getItem(KEY)
    if (!raw) {return []}
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) 
{
      const cleaned = parsed.filter(isHistoryItem)
      return cleaned
    }
    return []
  }
 catch 
{
    return []
  }
}

export function addHistory(item: HistoryItem, max = 50) 
{
  const list = getHistory()
  const next = [item, ...list].slice(0, max)
  try 
{
    localStorage.setItem(KEY, JSON.stringify(next))
  }
 catch 
{
    // ignore storage errors
  }
}

export function clearHistory() 
{
  try { localStorage.removeItem(KEY) }
 catch {}
}