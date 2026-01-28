interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  size?: 'sm' | 'md';
}

export default function Badge({ 
  children, 
  variant = 'default',
  size = 'md'
}: BadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
  };

  const variantClasses = {
    success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400',
  };

  return (
    <span className={`
      inline-flex items-center font-medium rounded-full
      ${sizeClasses[size]}
      ${variantClasses[variant]}
    `}>
      {children}
    </span>
  );
}

