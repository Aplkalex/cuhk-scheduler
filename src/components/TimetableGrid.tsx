'use client';

import { SelectedCourse, DayOfWeek } from '@/types';
import { TIMETABLE_CONFIG, WEEKDAYS } from '@/lib/constants';
import { timeToMinutes, formatTime } from '@/lib/schedule-utils';
import { cn } from '@/lib/utils';
import { LocationTooltip } from '@/components/LocationTooltip';

interface TimetableGridProps {
  selectedCourses: SelectedCourse[];
  onCourseClick?: (course: SelectedCourse) => void;
}

export function TimetableGrid({ selectedCourses, onCourseClick }: TimetableGridProps) {
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
    const height = ((endMinutes - startMinutes) / 60) * slotHeight;
    
    return {
      top: `${top}px`,
      height: `${height - 4}px`, // Subtract 4px for gap
      backgroundColor: color || '#8B5CF6',
    };
  };

  return (
    <div className="w-full overflow-auto bg-gray-50 rounded-xl shadow-lg p-4">
      <div className="min-w-[800px]">
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
              className="relative bg-white rounded-lg border border-gray-200"
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
                    
                    return (
                      <div
                        key={`${courseIdx}-${slotIdx}`}
                        className={cn(
                          'absolute left-1 right-1 rounded-lg p-2 cursor-pointer',
                          'transition-all hover:shadow-lg hover:scale-[1.02]',
                          'text-white text-xs overflow-hidden'
                        )}
                        style={style}
                        onClick={() => onCourseClick?.(selectedCourse)}
                      >
                        <div className="font-bold text-sm mb-1">
                          {selectedCourse.course.courseCode}
                        </div>
                        <div className="text-xs opacity-90">
                          {selectedCourse.selectedSection.sectionType} {selectedCourse.selectedSection.sectionId}
                        </div>
                        {slot.location && (
                          <LocationTooltip location={slot.location}>
                            <div className="text-xs opacity-75 mt-1 border-b border-white/30 border-dotted inline-block">
                              {slot.location}
                            </div>
                          </LocationTooltip>
                        )}
                        <div className="text-xs opacity-75 mt-1">
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
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
