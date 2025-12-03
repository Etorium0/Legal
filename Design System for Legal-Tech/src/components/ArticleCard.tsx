import React from 'react';
import { Clock, User } from 'lucide-react';

interface ArticleCardProps {
  title: string;
  description: string;
  author?: string;
  readTime?: string;
  category?: string;
  imageUrl?: string;
  onClick?: () => void;
}

export function ArticleCard({ 
  title, 
  description, 
  author, 
  readTime,
  category,
  imageUrl,
  onClick 
}: ArticleCardProps) {
  return (
    <div 
      className="bg-white border border-[--color-border] rounded-xl overflow-hidden hover:shadow-lg hover:border-[--color-primary-300] transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      {imageUrl && (
        <div className="w-full h-48 bg-[--color-neutral-100] overflow-hidden">
          <img 
            src={imageUrl} 
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="p-6">
        {category && (
          <div className="mb-3">
            <span className="overline text-[--color-primary-600]">{category}</span>
          </div>
        )}
        
        <h3 className="text-xl mb-2 text-[--color-text-primary] line-clamp-2">
          {title}
        </h3>
        
        <p className="text-[--color-text-secondary] mb-4 line-clamp-3">
          {description}
        </p>
        
        <div className="flex items-center gap-4 text-sm text-[--color-text-tertiary]">
          {author && (
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              <span>{author}</span>
            </div>
          )}
          {readTime && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{readTime}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
