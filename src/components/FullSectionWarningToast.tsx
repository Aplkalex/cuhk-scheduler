'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Course, Section } from '@/types';

export interface FullSectionWarningData {
  id: number;
  course: Course;
  section: Section;
}

interface FullSectionWarningToastProps {
  warning: FullSectionWarningData;
  onDismiss: (id: number) => void;
  duration?: number;
}

export default function FullSectionWarningToast({
  warning,
  onDismiss,
  duration = 6000,
}: FullSectionWarningToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(warning.id);
    }, 300);
  }, [onDismiss, warning.id]);

  useEffect(() => {
    const timer = setTimeout(handleClose, duration);
    return () => clearTimeout(timer);
  }, [duration, handleClose]);

  return (
    <div className={`w-full max-w-md ${isExiting ? 'animate-slideOutToTop' : 'animate-slideInFromTop'}`}>
      <div className="bg-amber-50/95 dark:bg-amber-900/95 backdrop-blur-xl border-2 border-amber-400 dark:border-amber-600 rounded-xl shadow-2xl overflow-hidden">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="bg-amber-500 dark:bg-amber-600 text-white p-2 rounded-full flex-shrink-0 shadow-lg">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-1 text-base">
                Section Full - Added to Schedule
              </h4>
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                <span className="font-semibold">{warning.course.courseCode}</span>
                {' - '}
                {warning.section.sectionType} {warning.section.sectionId} has no available seats.
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                ⚠️ You may need to join a waitlist or obtain instructor consent to enroll.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 hover:bg-amber-200/50 dark:hover:bg-amber-800/30 rounded p-1 transition-all flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="h-1 bg-amber-200/50 dark:bg-amber-950/50">
          <div
            className="h-full bg-amber-500 dark:bg-amber-400 animate-shrink"
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      </div>
    </div>
  );
}
