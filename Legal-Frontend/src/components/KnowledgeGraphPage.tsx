import React from 'react'
import SimpleLayout from './SimpleLayout'

const nodes = [
  { id: 'law', label: 'Luật', color: 'from-indigo-500 to-blue-500', icon: '📜' },
  { id: 'decree', label: 'Nghị định', color: 'from-emerald-500 to-green-500', icon: '📋' },
  { id: 'circular', label: 'Thông tư', color: 'from-amber-500 to-yellow-500', icon: '📝' },
]
const edges = [
  { from: 'law', to: 'decree', label: 'Hướng dẫn thi hành' },
  { from: 'decree', to: 'circular', label: 'Chi tiết hoá' },
]

const KnowledgeGraphPage: React.FC = () => 
{
  return (
    <SimpleLayout>
      <div>
        <h2 className="text-3xl font-bold text-white">Biểu đồ tri thức</h2>
        <p className="mt-2 text-white/70">Minh hoạ quan hệ giữa các loại văn bản.</p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {nodes.map(n => (
              <div key={n.id} className={`rounded-xl bg-gradient-to-br ${n.color} p-6 text-center shadow-lg`}>
                <div className="text-4xl mb-2">{n.icon}</div>
                <div className="text-xl font-bold text-white">{n.label}</div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Mối quan hệ:</h3>
            {edges.map((e, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-medium">
                  {nodes.find(n => n.id === e.from)?.label}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-px bg-gradient-to-r from-white/20 to-white/5"></div>
                  <span className="text-sm text-white/60 bg-white/5 px-3 py-1 rounded-full">{e.label}</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-white/5 to-white/20"></div>
                </div>
                <div className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-medium">
                  {nodes.find(n => n.id === e.to)?.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SimpleLayout>
  )
}

export default KnowledgeGraphPage
