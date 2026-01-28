import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export default function Input({ 
  label, 
  error, 
  icon,
  className = '',
  ...props 
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="
          block text-sm font-medium mb-2
          text-gray-700 dark:text-gray-300
        ">
          {label} {props.required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            {icon}
          </div>
        )}
        <input
          {...props}
          className={`
            w-full px-4 py-2.5 rounded-lg
            ${icon ? 'pl-10' : ''}
            bg-white dark:bg-gray-900
            border border-gray-300 dark:border-gray-600
            text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
            focus:border-transparent
            disabled:bg-gray-100 dark:disabled:bg-gray-800
            disabled:cursor-not-allowed
            transition-all
            ${error ? 'border-red-500 dark:border-red-500' : ''}
            ${className}
          `}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

