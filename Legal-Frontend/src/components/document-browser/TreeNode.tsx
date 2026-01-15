import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { UnitItem } from './types';

type TreeNodeProps = {
  node: UnitItem;
  depth: number;
  onSelect: (u: UnitItem) => void;
  selectedId?: string;
  term?: string;
  renderHighlighted?: (text: string, term: string) => React.ReactNode;
};

export const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  depth,
  onSelect,
  selectedId,
  term = '',
  renderHighlighted,
}) => 
{
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        selectedId === node.id
          ? 'border-indigo-400 bg-indigo-500/10'
          : 'border-white/5 bg-white/5 hover:bg-white/10'
      }`}
      style={{ marginLeft: depth * 12 }}
    >
      <div className="flex items-center justify-between text-white/80 text-sm mb-1">
        <div className="flex items-center gap-2">
          <button
            className="text-xs px-2 py-1 rounded bg-white/10 border border-white/20 hover:bg-white/20"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? '▸' : '▾'}
          </button>
          <button className="font-semibold text-left" onClick={() => onSelect(node)}>
            {renderHighlighted
              ? renderHighlighted(node.code || node.level, term)
              : node.code || node.level}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50">{node.level}</span>
          <Link
            to={`/unit/${node.id}`}
            className="text-xs px-2 py-1 rounded bg-white/10 border border-white/20 text-white/80 hover:bg-white/20"
          >
            Mở Viewer
          </Link>
        </div>
      </div>
      <div className="text-white/90 text-sm whitespace-pre-wrap leading-relaxed line-clamp-4">
        {renderHighlighted ? renderHighlighted(node.text, term) : node.text}
      </div>
      {!collapsed && node.children && node.children.length > 0 && (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedId={selectedId}
              term={term}
              renderHighlighted={renderHighlighted}
            />
          ))}
        </div>
      )}
    </div>
  );
};
