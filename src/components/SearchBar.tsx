'use client';

import { Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({ value, onChange, placeholder, className }: SearchBarProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Search courses by code, name, or instructor...'}
        className={cn(
          'w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700',
          'bg-white dark:bg-[#252526] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent',
          'shadow-sm hover:shadow-md transition-all'
        )}
      />
    </div>
  );
}

interface FilterButtonProps {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function FilterButton({ active, onClick, children }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2 rounded-lg font-medium transition-all text-sm',
        active
          ? 'bg-purple-600 dark:bg-purple-500 text-white shadow-md'
          : 'bg-white dark:bg-[#252526] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20'
      )}
    >
      {children}
    </button>
  );
}

interface FilterBarProps {
  showFilters: boolean;
  onToggleFilters: () => void;
  children?: React.ReactNode;
}

export function FilterBar({ showFilters, onToggleFilters, children }: FilterBarProps) {
  return (
    <div className="space-y-3">
      <button
        onClick={onToggleFilters}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
      >
        <Filter className="w-4 h-4" />
        {showFilters ? 'Hide Filters' : 'Show Filters'}
      </button>
      
      {showFilters && (
        <div className="bg-white dark:bg-[#1e1e1e] rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}
