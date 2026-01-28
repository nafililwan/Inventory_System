import { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export default function Select({ 
  label, 
  error,
  options,
  className = '',
  ...props 
}: SelectProps) {
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
      <select
        {...props}
        className={`
          w-full px-4 py-2.5 rounded-lg
          bg-white dark:bg-gray-900
          border border-gray-300 dark:border-gray-600
          text-gray-900 dark:text-gray-100
          focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
          focus:border-transparent
          disabled:bg-gray-100 dark:disabled:bg-gray-800
          disabled:cursor-not-allowed
          transition-all
          ${error ? 'border-red-500 dark:border-red-500' : ''}
          ${className}
        `}
      >
        {options.map(option => (
          <option 
            key={option.value} 
            value={option.value}
            className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

