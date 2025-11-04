'use client';

import { useEffect, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConflictToastProps {
  conflicts: Array<{ course1: string; course2: string }>;
  onClose: () => void;
  duration?: number;
}

export default function ConflictToast({ conflicts, onClose, duration = 5000 }: ConflictToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300); // Match animation duration
  };

  if (conflicts.length === 0) return null;

  return (
    <div className={`fixed bottom-6 right-6 z-[9999] ${isExiting ? 'animate-slideOut' : 'animate-slideIn'}`}>
      <div className="bg-red-900/95 dark:bg-red-950/95 border-2 border-red-500 rounded-lg shadow-2xl backdrop-blur-md max-w-md">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-red-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-red-200 mb-2">
                Schedule Conflicts Detected!
              </h3>
              <div className="space-y-1.5">
                {conflicts.map((conflict, index) => (
                  <p key={index} className="text-sm text-white">
                    <span className="font-semibold">{conflict.course1}</span>
                    {' conflicts with '}
                    <span className="font-semibold">{conflict.course2}</span>
                  </p>
                ))}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="flex-shrink-0 p-1 rounded-md hover:bg-red-500/30 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-red-200 hover:text-white" />
            </button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-red-950/50 rounded-b-lg overflow-hidden">
          <div 
            className="h-full bg-red-400 animate-shrink"
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      </div>
    </div>
  );
}
