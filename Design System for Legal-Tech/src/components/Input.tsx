import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export function Input({ 
  label, 
  error, 
  helperText, 
  icon,
  className = '',
  ...props 
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block mb-2 text-[--color-text-primary]">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[--color-text-tertiary]">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full px-4 py-2.5 rounded-lg
            border border-[--color-border]
            bg-white
            text-[--color-text-primary]
            placeholder:text-[--color-text-tertiary]
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-[--color-primary-500] focus:border-transparent
            hover:border-[--color-border-strong]
            disabled:bg-[--color-neutral-100] disabled:cursor-not-allowed
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-[--color-accent-error] focus:ring-[--color-accent-error]' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-[--color-accent-error]">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-[--color-text-tertiary]">{helperText}</p>
      )}
    </div>
  );
}
