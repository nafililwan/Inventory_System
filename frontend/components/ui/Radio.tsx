interface RadioProps {
  label: string;
  description?: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  name: string;
}

export default function Radio({
  label,
  description,
  value,
  checked,
  onChange,
  name,
}: RadioProps) {
  return (
    <label className={`
      flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all
      ${checked 
        ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-800'
      }
    `}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="
          mt-1 w-4 h-4 
          text-blue-600 dark:text-blue-500
          border-gray-300 dark:border-gray-600
          focus:ring-blue-500 dark:focus:ring-blue-400
          bg-white dark:bg-gray-900
        "
      />
      <div className="ml-3 flex-1">
        <div className="font-medium text-gray-900 dark:text-gray-100">
          {label}
        </div>
        {description && (
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {description}
          </div>
        )}
      </div>
    </label>
  );
}

