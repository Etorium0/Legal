import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';

interface ResultCardProps {
  title: string;
  excerpt: string;
  source: string;
  date?: string;
  relevanceScore?: number;
  tags?: string[];
  onClick?: () => void;
}

export function ResultCard({ 
  title, 
  excerpt, 
  source, 
  date, 
  relevanceScore,
  tags = [],
  onClick 
}: ResultCardProps) {
  return (
    <div 
      className="bg-white border border-[--color-border] rounded-xl p-6 hover:shadow-lg hover:border-[--color-primary-300] transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="p-2 bg-[--color-primary-50] rounded-lg flex-shrink-0">
            <FileText className="w-5 h-5 text-[--color-primary-600]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg mb-1 text-[--color-text-primary] line-clamp-2">
              {title}
            </h3>
            <div className="flex items-center gap-2 text-sm text-[--color-text-tertiary]">
              <span>{source}</span>
              {date && (
                <>
                  <span>•</span>
                  <span>{date}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {relevanceScore && (
          <div className="flex-shrink-0 px-2.5 py-1 bg-[--color-secondary-50] text-[--color-secondary-700] rounded-md">
            <span className="text-sm">{Math.round(relevanceScore * 100)}%</span>
          </div>
        )}
      </div>
      
      <p className="text-[--color-text-secondary] mb-4 line-clamp-3">
        {excerpt}
      </p>
      
      {tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {tags.map((tag, index) => (
            <span 
              key={index}
              className="px-2.5 py-1 bg-[--color-neutral-100] text-[--color-text-secondary] rounded-md text-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      
      <div className="flex items-center gap-2 text-[--color-primary-600] hover:text-[--color-primary-700]">
        <span className="text-sm">View Document</span>
        <ExternalLink className="w-4 h-4" />
      </div>
    </div>
  );
}
