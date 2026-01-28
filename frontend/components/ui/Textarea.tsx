import { TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export default function Textarea({ 
  label, 
  error,
  className = '',
  ...props 
}: TextareaProps) {
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
      <textarea
        {...props}
        className={`
          w-full px-4 py-2.5 rounded-lg
          bg-white dark:bg-gray-900
          border border-gray-300 dark:border-gray-600
          text-gray-900 dark:text-gray-100
          placeholder-gray-400 dark:placeholder-gray-500
          focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
          focus:border-transparent
          disabled:bg-gray-100 dark:disabled:bg-gray-800
          disabled:cursor-not-allowed
          transition-all
          resize-none
          ${error ? 'border-red-500 dark:border-red-500' : ''}
          ${className}
        `}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

