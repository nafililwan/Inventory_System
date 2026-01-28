import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className = '', hover = true }: CardProps) {
  return (
    <div className={`
      bg-white dark:bg-gray-800
      rounded-xl shadow-md dark:shadow-xl dark:shadow-black/20
      border border-gray-200 dark:border-gray-700
      ${hover ? 'hover:shadow-lg dark:hover:shadow-2xl dark:hover:shadow-black/30 transition-shadow' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
}

