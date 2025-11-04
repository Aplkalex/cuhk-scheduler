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
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Search courses by code, name, or instructor...'}
        className={cn(
          'w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200',
          'bg-white text-gray-900 placeholder:text-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent',
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
          ? 'bg-purple-600 text-white shadow-md'
          : 'bg-white text-gray-700 border border-gray-200 hover:border-purple-300 hover:bg-purple-50'
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
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-purple-600 transition-colors"
      >
        <Filter className="w-4 h-4" />
        {showFilters ? 'Hide Filters' : 'Show Filters'}
      </button>
      
      {showFilters && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}
