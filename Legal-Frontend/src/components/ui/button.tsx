import React from 'react'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
const variants: Record<string, string> = {
  default: 'bg-gray-900 text-white hover:bg-gray-800 focus-visible:ring-gray-900',
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:ring-indigo-600',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-300',
  ghost: 'bg-transparent text-gray-900 hover:bg-gray-100 focus-visible:ring-gray-300',
  destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
  outline: 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 focus-visible:ring-gray-300',
}
const sizes: Record<string, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
  icon: 'h-10 w-10',
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', className = '', children, ...props }) => {
  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`
  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}

export default Button
