import React from 'react';

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export default function InfoCard({ icon, title, children, className = '' }: InfoCardProps) {
  return (
    <div className={`bg-white/50 dark:bg-gray-800/50 rounded-xl p-4 shadow-md backdrop-blur-sm border border-purple-200/20 dark:border-purple-800/20 ${className}`}>
      <div className="flex items-center mb-2">
        <div className="w-7 h-7 flex items-center justify-center text-purple-500 dark:text-purple-400 mr-2.5">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="text-base text-gray-900 dark:text-white pl-1">
        {children}
      </div>
    </div>
  );
}
