import React from 'react'

interface ArticleCardProps {
  title: string
  description?: string
  imageUrl?: string
}

const ArticleCard: React.FC<ArticleCardProps> = ({ title, description, imageUrl }) => 
{
  return (
    <article className="overflow-hidden rounded-lg border bg-white shadow-sm">
      {imageUrl && <img src={imageUrl} alt="" className="h-40 w-full object-cover" />}
      <div className="p-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
      </div>
    </article>
  )
}

export default ArticleCard
