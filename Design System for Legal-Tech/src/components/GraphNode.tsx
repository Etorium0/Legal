import React from 'react';
import { FileText, Folder, Link as LinkIcon } from 'lucide-react';

interface GraphNodeProps {
  type: 'document' | 'case' | 'statute' | 'concept';
  title: string;
  subtitle?: string;
  connections?: number;
  onClick?: () => void;
}

export function GraphNode({ type, title, subtitle, connections, onClick }: GraphNodeProps) {
  const typeConfig = {
    document: {
      icon: FileText,
      bg: 'bg-[--color-primary-50]',
      border: 'border-[--color-primary-300]',
      iconColor: 'text-[--color-primary-600]'
    },
    case: {
      icon: FileText,
      bg: 'bg-[--color-secondary-50]',
      border: 'border-[--color-secondary-300]',
      iconColor: 'text-[--color-secondary-600]'
    },
    statute: {
      icon: Folder,
      bg: 'bg-purple-50',
      border: 'border-purple-300',
      iconColor: 'text-purple-600'
    },
    concept: {
      icon: LinkIcon,
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      iconColor: 'text-amber-600'
    }
  };
  
  const config = typeConfig[type];
  const Icon = config.icon;
  
  return (
    <div 
      className={`
        relative bg-white border-2 ${config.border} rounded-xl p-4 cursor-pointer
        hover:shadow-lg transition-all duration-200 hover:scale-105
        min-w-[180px] max-w-[220px]
      `}
      onClick={onClick}
    >
      {/* Connection Badge */}
      {connections !== undefined && connections > 0 && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-[--color-primary-600] text-white rounded-full flex items-center justify-center text-xs">
          {connections}
        </div>
      )}
      
      <div className="flex flex-col items-center text-center gap-2">
        <div className={`w-12 h-12 ${config.bg} rounded-lg flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${config.iconColor}`} />
        </div>
        
        <div>
          <p className="text-sm text-[--color-text-primary] line-clamp-2">
            {title}
          </p>
          {subtitle && (
            <p className="caption mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
