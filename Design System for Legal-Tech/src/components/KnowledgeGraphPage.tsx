import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Download, Info, X } from 'lucide-react';
import { Button } from './Button';
import { GraphNode } from './GraphNode';

export function KnowledgeGraphPage() {
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const nodes = [
    { id: 1, type: 'concept' as const, title: 'Hợp đồng', x: 400, y: 300, connections: 8 },
    { id: 2, type: 'document' as const, title: 'Điều 385 BLDS', subtitle: 'Khái niệm hợp đồng', x: 250, y: 200, connections: 3 },
    { id: 3, type: 'document' as const, title: 'Điều 386 BLDS', subtitle: 'Nguyên tắc giao kết', x: 550, y: 200, connections: 4 },
    { id: 4, type: 'case' as const, title: 'Hợp đồng mua bán', subtitle: 'Chương XX', x: 250, y: 400, connections: 5 },
    { id: 5, type: 'case' as const, title: 'Hợp đồng thuê', subtitle: 'Chương XXI', x: 550, y: 400, connections: 6 },
    { id: 6, type: 'statute' as const, title: 'Năng lực pháp luật', x: 150, y: 300, connections: 2 },
    { id: 7, type: 'statute' as const, title: 'Vi phạm hợp đồng', x: 650, y: 300, connections: 4 }
  ];

  const connections = [
    { from: 1, to: 2 },
    { from: 1, to: 3 },
    { from: 1, to: 4 },
    { from: 1, to: 5 },
    { from: 1, to: 6 },
    { from: 1, to: 7 },
    { from: 4, to: 2 },
    { from: 5, to: 3 }
  ];

  return (
    <div className="flex-1 bg-[--color-background-alt] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[--color-border] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="mb-1">Đồ thị tri thức pháp luật</h2>
            <p className="text-[--color-text-secondary]">
              Trực quan hóa mối quan hệ giữa các khái niệm, điều luật và văn bản
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" icon={<ZoomIn className="w-4 h-4" />}>
              Phóng to
            </Button>
            <Button variant="ghost" size="sm" icon={<ZoomOut className="w-4 h-4" />}>
              Thu nhỏ
            </Button>
            <Button variant="ghost" size="sm" icon={<Maximize2 className="w-4 h-4" />}>
              Toàn màn hình
            </Button>
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4" />}>
              Xuất ảnh
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[--color-border]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[--color-primary-500] rounded-full" />
            <span className="text-sm text-[--color-text-secondary]">Khái niệm</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[--color-secondary-500] rounded-full" />
            <span className="text-sm text-[--color-text-secondary]">Điều luật</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full" />
            <span className="text-sm text-[--color-text-secondary]">Chương/Mục</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500 rounded-full" />
            <span className="text-sm text-[--color-text-secondary]">Quan hệ</span>
          </div>
        </div>
      </div>

      {/* Graph Canvas */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 bg-gradient-to-br from-[--color-neutral-50] to-white relative overflow-auto">
          {/* SVG for connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: '800px', minHeight: '600px' }}>
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#9ca3af" />
              </marker>
            </defs>
            {connections.map((conn, index) => {
              const fromNode = nodes.find(n => n.id === conn.from);
              const toNode = nodes.find(n => n.id === conn.to);
              if (!fromNode || !toNode) return null;
              
              return (
                <line
                  key={index}
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke="#d1d5db"
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          <div className="relative" style={{ minWidth: '800px', minHeight: '600px' }}>
            {nodes.map((node) => (
              <div
                key={node.id}
                className="absolute"
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <GraphNode
                  type={node.type}
                  title={node.title}
                  subtitle={node.subtitle}
                  connections={node.connections}
                  onClick={() => setSelectedNode(node)}
                />
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="absolute bottom-6 right-6 bg-white rounded-xl shadow-lg border border-[--color-border] p-2 flex flex-col gap-1">
            <button className="w-10 h-10 flex items-center justify-center hover:bg-[--color-neutral-100] rounded-lg transition-colors">
              <ZoomIn className="w-5 h-5 text-[--color-text-secondary]" />
            </button>
            <button className="w-10 h-10 flex items-center justify-center hover:bg-[--color-neutral-100] rounded-lg transition-colors">
              <ZoomOut className="w-5 h-5 text-[--color-text-secondary]" />
            </button>
            <div className="w-full h-px bg-[--color-border] my-1" />
            <button className="w-10 h-10 flex items-center justify-center hover:bg-[--color-neutral-100] rounded-lg transition-colors">
              <Maximize2 className="w-5 h-5 text-[--color-text-secondary]" />
            </button>
          </div>
        </div>

        {/* Details Panel */}
        {selectedNode && (
          <div className="w-96 bg-white border-l border-[--color-border] overflow-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h4>Chi tiết node</h4>
                <button 
                  onClick={() => setSelectedNode(null)}
                  className="p-2 hover:bg-[--color-neutral-100] rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-[--color-text-tertiary]" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Type Badge */}
                <div>
                  <div className="text-sm text-[--color-text-tertiary] mb-1">Loại</div>
                  <span className="inline-block px-3 py-1 bg-[--color-primary-50] text-[--color-primary-700] rounded-lg text-sm">
                    {selectedNode.type === 'concept' && 'Khái niệm'}
                    {selectedNode.type === 'document' && 'Điều luật'}
                    {selectedNode.type === 'case' && 'Chương/Mục'}
                    {selectedNode.type === 'statute' && 'Quan hệ'}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <div className="text-sm text-[--color-text-tertiary] mb-1">Tên</div>
                  <p className="text-[--color-text-primary]">{selectedNode.title}</p>
                  {selectedNode.subtitle && (
                    <p className="text-sm text-[--color-text-secondary] mt-1">{selectedNode.subtitle}</p>
                  )}
                </div>

                {/* Connections */}
                <div>
                  <div className="text-sm text-[--color-text-tertiary] mb-1">Số kết nối</div>
                  <p className="text-[--color-text-primary]">{selectedNode.connections} node liên quan</p>
                </div>

                {/* Description */}
                <div>
                  <div className="text-sm text-[--color-text-tertiary] mb-2">Mô tả</div>
                  <p className="text-sm text-[--color-text-secondary] leading-relaxed">
                    {selectedNode.type === 'concept' && 
                      'Hợp đồng là sự thỏa thuận giữa các bên về việc xác lập, thay đổi hoặc chấm dứt quyền, nghĩa vụ dân sự.'}
                    {selectedNode.type === 'document' && 
                      'Điều khoản pháp luật quy định về khái niệm, đặc điểm và yêu cầu của hợp đồng trong Bộ luật Dân sự.'}
                    {selectedNode.type === 'case' && 
                      'Chương quy định chi tiết về các loại hợp đồng cụ thể và điều kiện áp dụng.'}
                    {selectedNode.type === 'statute' && 
                      'Khái niệm liên quan đến quyền và nghĩa vụ của các bên trong quan hệ pháp luật.'}
                  </p>
                </div>

                {/* Related Nodes */}
                <div>
                  <div className="text-sm text-[--color-text-tertiary] mb-2">Node liên kết</div>
                  <div className="space-y-2">
                    {['Điều 385 BLDS', 'Điều 386 BLDS', 'Hợp đồng mua bán'].map((item, index) => (
                      <button
                        key={index}
                        className="w-full text-left px-3 py-2 bg-[--color-neutral-50] rounded-lg hover:bg-[--color-neutral-100] transition-colors text-sm"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-[--color-border] space-y-2">
                  <Button variant="primary" size="sm" className="w-full">
                    Xem chi tiết văn bản
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full">
                    Hiển thị node lân cận
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Toast */}
      <div className="absolute bottom-6 left-6 max-w-md bg-white rounded-xl shadow-lg border border-[--color-border] p-4">
        <div className="flex gap-3">
          <div className="w-8 h-8 bg-[--color-primary-50] rounded-lg flex items-center justify-center flex-shrink-0">
            <Info className="w-4 h-4 text-[--color-primary-600]" />
          </div>
          <div>
            <h6 className="mb-1">Cách sử dụng</h6>
            <p className="text-sm text-[--color-text-secondary]">
              Click vào node để xem chi tiết. Kéo thả để di chuyển. Cuộn chuột để zoom.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
