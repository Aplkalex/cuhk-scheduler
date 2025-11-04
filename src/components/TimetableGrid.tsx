'use client';

import { useState } from 'react';
import { SelectedCourse, DayOfWeek } from '@/types';
import { TIMETABLE_CONFIG, WEEKDAYS } from '@/lib/constants';
import { timeToMinutes, formatTime } from '@/lib/schedule-utils';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface TimetableGridProps {
  selectedCourses: SelectedCourse[];
  onCourseClick?: (course: SelectedCourse) => void;
  onRemoveCourse?: (course: SelectedCourse) => void;
  onLocationClick?: (location: string) => void;
}

export function TimetableGrid({ selectedCourses, onCourseClick, onRemoveCourse, onLocationClick }: TimetableGridProps) {
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
    <div className="w-full overflow-auto bg-gray-50 rounded-xl shadow-lg p-4">
      <div className="min-w-[900px]">
        {/* Header with days */}
        <div className="grid grid-cols-6 gap-2 mb-2">
          <div className="w-20" /> {/* Empty corner */}
          {displayDays.map((day) => (
            <div
              key={day}
              className="text-center font-semibold text-gray-700 py-3 bg-white rounded-lg shadow-sm"
            >
              <div className="text-sm text-gray-500">{day.slice(0, 3)}</div>
              <div className="text-lg">{day}</div>
            </div>
          ))}
        </div>

        {/* Timetable grid */}
        <div className="relative grid grid-cols-6 gap-2">
          {/* Time labels */}
          <div className="space-y-0">
            {hours.map((hour) => (
              <div
                key={hour}
                className="text-right pr-3 text-sm text-gray-500 font-medium"
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
              className="relative bg-white rounded-lg border border-gray-200 overflow-hidden"
              style={{ height: `${slotHeight * hours.length}px` }}
            >
              {/* Hour grid lines */}
              {hours.slice(1).map((hour, idx) => (
                <div
                  key={hour}
                  className="absolute w-full border-t border-gray-100"
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
                    
                    return (
                      <div
                        key={blockId}
                        className={cn(
                          'absolute left-1 right-1 rounded-xl cursor-pointer group',
                          'transition-all hover:shadow-xl hover:scale-[1.02]',
                          'text-white flex flex-col',
                          // Compact padding for small blocks, comfortable for larger ones
                          'px-2.5 py-1.5',
                          // Allow delete button to overflow outside the block
                          'overflow-visible'
                        )}
                        style={style}
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

                        {/* Content wrapper with overflow hidden to prevent text overflow */}
                        <div className="overflow-hidden flex flex-col">
                          <div className="font-semibold text-xs leading-snug truncate">
                            {selectedCourse.course.courseCode}
                          </div>
                          <div className="text-[11px] leading-snug opacity-90 truncate">
                            {selectedCourse.selectedSection.sectionType.slice(0, 3)} {selectedCourse.selectedSection.sectionId}
                          </div>
                          {slot.location && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onLocationClick?.(slot.location!);
                              }}
                              className="text-[11px] leading-snug opacity-80 block w-full text-left cursor-pointer hover:opacity-100 hover:underline transition-opacity bg-transparent border-0 p-0 text-inherit font-inherit truncate"
                            >
                              {slot.location}
                            </button>
                          )}
                          <div className="text-[11px] leading-snug opacity-75 truncate">
                            {formatTime(slot.startTime)}-{formatTime(slot.endTime)}
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
  );
}
