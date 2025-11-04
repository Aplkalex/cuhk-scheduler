'use client';

import { useState } from 'react';
import { SelectedCourse, DayOfWeek } from '@/types';
import { TIMETABLE_CONFIG, WEEKDAYS } from '@/lib/constants';
import { timeToMinutes, formatTime, hasAvailableSeats } from '@/lib/schedule-utils';
import { cn } from '@/lib/utils';
import { X, AlertCircle } from 'lucide-react';

interface TimetableGridProps {
  selectedCourses: SelectedCourse[];
  onCourseClick?: (course: SelectedCourse) => void;
  onRemoveCourse?: (course: SelectedCourse) => void;
  onLocationClick?: (location: string) => void;
  conflictingCourses?: string[]; // Array of course codes that have conflicts
}

export function TimetableGrid({ selectedCourses, onCourseClick, onRemoveCourse, onLocationClick, conflictingCourses = [] }: TimetableGridProps) {
  const [hoveredCourse, setHoveredCourse] = useState<string | null>(null);
  const { startHour, endHour, slotHeight } = TIMETABLE_CONFIG;
  
  // Generate hours array (8 AM to 9 PM)
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  
  // Use only weekdays for now (Mon-Fri)
  const displayDays = WEEKDAYS.slice(0, 5) as DayOfWeek[];

  // Calculate position and height for a course block
  const getCourseStyle = (startTime: string, endTime: string, color?: string) => {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    const startOfDay = startHour * 60;
    
    const top = ((startMinutes - startOfDay) / 60) * slotHeight;
    const durationMinutes = endMinutes - startMinutes;
    const calculatedHeight = (durationMinutes / 60) * slotHeight;
    
    // Use consistent gap for visual separation - blocks size naturally to content
    const blockGap = 4;
    // Let blocks be their natural size - no forced minimum to avoid overlaps
    const finalHeight = calculatedHeight - blockGap;
    const adjustedTop = top + blockGap / 2;
    
    return {
      top: `${adjustedTop}px`,
      height: `${finalHeight}px`,
      backgroundColor: color || '#8B5CF6',
    };
  };

  return (
    <div className="w-full bg-white/60 dark:bg-[#252526]/60 backdrop-blur-xl rounded-xl shadow-xl overflow-hidden border border-gray-200/40 dark:border-gray-700/40">
      <div className="overflow-x-auto">
        <div className="min-w-[320px] sm:min-w-[600px] lg:min-w-0 w-full px-2 py-2 sm:px-3 sm:py-3 lg:px-4 lg:py-3">
          {/* Header with days */}
          <div className="grid gap-1 sm:gap-1.5 lg:gap-2 mb-2" style={{ gridTemplateColumns: '70px repeat(5, 1fr)' }}>
            <div /> {/* Empty corner */}
            {displayDays.map((day) => (
              <div
                key={day}
                className="text-center font-semibold text-gray-700 dark:text-gray-200 py-2 sm:py-2.5 lg:py-3 bg-white/50 dark:bg-[#2d2d30]/50 backdrop-blur-md rounded-lg shadow-sm border border-gray-200/40 dark:border-gray-700/40"
              >
                <div className="text-xs sm:text-sm lg:text-base">{day}</div>
              </div>
            ))}
          </div>

          {/* Timetable grid */}
          <div className="relative grid gap-1 sm:gap-1.5 lg:gap-2" style={{ gridTemplateColumns: '70px repeat(5, 1fr)' }}>
            {/* Time labels */}
            <div className="space-y-0">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="text-right pr-1.5 sm:pr-2 text-[10px] sm:text-xs lg:text-sm text-gray-500 dark:text-gray-400 font-medium"
                  style={{ height: `${slotHeight}px`, lineHeight: `${slotHeight}px` }}
                >
                  {formatTime(`${hour}:00`)}
                </div>
              ))}
            </div>

          {/* Day columns */}
          {displayDays.map((day) => (
            <div
              key={day}
              className="relative bg-white/40 dark:bg-[#1e1e1e]/40 backdrop-blur-sm rounded-lg border border-gray-200/40 dark:border-gray-700/40 overflow-hidden transition-all duration-300"
              style={{ height: `${slotHeight * hours.length}px` }}
            >
              {/* Hour grid lines */}
              {hours.slice(1).map((hour, idx) => (
                <div
                  key={hour}
                  className="absolute w-full border-t border-gray-100/50 dark:border-gray-800/50"
                  style={{ top: `${(idx + 1) * slotHeight}px` }}
                />
              ))}

              {/* Course blocks */}
              {selectedCourses.map((selectedCourse, courseIdx) =>
                selectedCourse.selectedSection.timeSlots
                  .filter((slot) => slot.day === day)
                  .map((slot, slotIdx) => {
                    const style = getCourseStyle(slot.startTime, slot.endTime, selectedCourse.color);
                    const blockId = `${courseIdx}-${slotIdx}-${day}`;
                    const isHovered = hoveredCourse === blockId;
                    const isFull = !hasAvailableSeats(selectedCourse.selectedSection);
                    const hasConflict = conflictingCourses.includes(selectedCourse.course.courseCode);
                    
                    return (
                      <div
                        key={blockId}
                        className={cn(
                          'absolute left-1 right-1 rounded-lg cursor-pointer group',
                          'timetable-block-enter',
                          'hover:shadow-xl hover:scale-[1.02]',
                          'text-white flex flex-col',
                          // Compact padding for denser layout
                          'px-1.5 py-1',
                          // Allow delete button to overflow outside the block
                          'overflow-visible',
                          // Red border for full sections
                          isFull && 'border-2 border-red-500 dark:border-red-400 shadow-[0_0_0_1px_rgba(239,68,68,0.5)]',
                          // Conflict pattern
                          hasConflict && 'conflict-pattern border-2 border-red-500'
                        )}
                        style={{
                          ...style,
                          transition: 'top 0.5s cubic-bezier(0.4, 0, 0.2, 1), height 0.5s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease, transform 0.2s ease, box-shadow 0.2s ease',
                        }}
                        onMouseEnter={() => setHoveredCourse(blockId)}
                        onMouseLeave={() => setHoveredCourse(null)}
                      >
                        {/* Delete button - shows on hover, positioned OUTSIDE the block */}
                        {onRemoveCourse && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveCourse(selectedCourse);
                            }}
                            className={cn(
                              'absolute -top-2 -right-2 w-6 h-6 rounded-full',
                              'bg-red-500 hover:bg-red-600 text-white',
                              'flex items-center justify-center shadow-lg',
                              'transition-all transform',
                              'opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100',
                              'z-[150]'
                            )}
                            title="Remove course"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Compact content - only course code and section type */}
                        <div 
                          className="overflow-hidden flex flex-col justify-center h-full"
                          onClick={() => onCourseClick?.(selectedCourse)}
                        >
                          <div className="flex items-center gap-1">
                            <div className="font-semibold text-xs leading-tight truncate flex-1">
                              {selectedCourse.course.courseCode}
                            </div>
                            {isFull && (
                              <div title="Section is full" className="flex-shrink-0">
                                <AlertCircle className="w-3 h-3 text-red-200" />
                              </div>
                            )}
                          </div>
                          <div className="text-[10px] leading-tight opacity-90 truncate">
                            {selectedCourse.selectedSection.sectionType === 'Lecture' ? 'LEC' : 'TUT'} {selectedCourse.selectedSection.sectionId}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          ))}
          </div>
        </div>
      </div>
    </div>
  );
}
