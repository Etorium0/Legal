import React from 'react'

const nodes = [
  { id: 'law', label: 'Luật', color: 'bg-indigo-100' },
  { id: 'decree', label: 'Nghị định', color: 'bg-emerald-100' },
  { id: 'circular', label: 'Thông tư', color: 'bg-amber-100' },
]
const edges = [
  { from: 'law', to: 'decree', label: 'Hướng dẫn thi hành' },
  { from: 'decree', to: 'circular', label: 'Chi tiết hoá' },
]

const KnowledgeGraphPage: React.FC = () => {
  return (
    <div className="p-6 panel-2 rounded-lg">
      <h2 className="text-xl font-semibold text-white">Biểu đồ tri thức</h2>
      <p className="mt-2 text-white/70">Minh hoạ quan hệ giữa các loại văn bản.</p>

      <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-6 text-white">
        <div className="grid grid-cols-3 gap-6">
          {nodes.map(n => (
            <div key={n.id} className={`rounded-md bg-white/10 p-4 text-center font-medium`}>{n.label}</div>
          ))}
        </div>
        <div className="mt-6 text-sm text-white/80">
          {edges.map((e, i) => (
            <div key={i}>
              <span className="font-semibold">{e.from}</span> → <span className="font-semibold">{e.to}</span>: {e.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default KnowledgeGraphPage
