import React from 'react'

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  leadingIcon?: React.ReactNode
}

export const Input: React.FC<InputProps> = ({ className = '', leadingIcon, ...props }) => {
  return (
    <div className={`relative ${leadingIcon ? 'pl-9' : ''}`}>
      {leadingIcon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {leadingIcon}
        </span>
      )}
      <input
        className={`w-full border bg-white rounded-lg px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${className}`}
        {...props}
      />
    </div>
  )
}

export default Input
