import React, { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, Lock } from 'lucide-react';

interface DocumentTreeItemProps {
  name: string;
  type: 'file' | 'folder';
  level?: number;
  children?: DocumentTreeItemProps[];
  isLocked?: boolean;
  isActive?: boolean;
  onClick?: () => void;
}

export function DocumentTreeItem({ 
  name, 
  type, 
  level = 0, 
  children = [],
  isLocked = false,
  isActive = false,
  onClick 
}: DocumentTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = children.length > 0;
  
  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
    onClick?.();
  };
  
  return (
    <div>
      <div 
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors
          hover:bg-[--color-neutral-100]
          ${isActive ? 'bg-[--color-primary-50] text-[--color-primary-700]' : 'text-[--color-text-primary]'}
        `}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={handleClick}
      >
        {/* Expand/Collapse Icon */}
        {hasChildren && (
          <button className="p-0 flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-[--color-text-tertiary]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[--color-text-tertiary]" />
            )}
          </button>
        )}
        
        {/* File/Folder Icon */}
        <div className="flex-shrink-0">
          {type === 'folder' ? (
            <Folder className={`w-4 h-4 ${isActive ? 'text-[--color-primary-600]' : 'text-[--color-text-tertiary]'}`} />
          ) : (
            <File className={`w-4 h-4 ${isActive ? 'text-[--color-primary-600]' : 'text-[--color-text-tertiary]'}`} />
          )}
        </div>
        
        {/* Name */}
        <span className="flex-1 text-sm truncate">{name}</span>
        
        {/* Lock Icon */}
        {isLocked && (
          <Lock className="w-3.5 h-3.5 text-[--color-text-tertiary] flex-shrink-0" />
        )}
      </div>
      
      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {children.map((child, index) => (
            <DocumentTreeItem
              key={index}
              {...child}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
