'use client';

import { Course, Section } from '@/types';
import { hasAvailableSeats } from '@/lib/schedule-utils';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

interface CourseListItemProps {
  course: Course;
  onAddSection: (course: Course, section: Section) => void;
}

function CourseListItem({ course, onAddSection }: CourseListItemProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
      {/* Course header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">
            {course.courseCode}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {course.courseName}
          </p>
        </div>
        <div className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">
          {course.credits} credits
        </div>
      </div>

      {/* Department */}
      <div className="text-xs text-gray-500 mb-3">
        {course.department}
      </div>

      {/* Sections */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Sections
        </div>
        {course.sections.map((section) => (
          <div
            key={section.sectionId}
            className={cn(
              'flex items-center justify-between p-3 rounded-lg border transition-all',
              hasAvailableSeats(section)
                ? 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                : 'border-gray-100 bg-gray-50 opacity-60'
            )}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-gray-900">
                  {section.sectionType} {section.sectionId}
                </span>
                {section.instructor && (
                  <span className="text-xs text-gray-500">
                    • {section.instructor.name}
                  </span>
                )}
              </div>
              
              <div className="text-xs text-gray-600 space-y-0.5">
                {section.timeSlots.map((slot, idx) => (
                  <div key={idx}>
                    {slot.day.slice(0, 3)} {slot.startTime}-{slot.endTime}
                    {slot.location && ` @ ${slot.location}`}
                  </div>
                ))}
              </div>

              <div className="mt-2 text-xs">
                {hasAvailableSeats(section) ? (
                  <span className="text-green-600 font-medium">
                    {section.seatsRemaining} / {section.quota} seats available
                  </span>
                ) : (
                  <span className="text-red-600 font-medium">
                    Full ({section.enrolled}/{section.quota})
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => onAddSection(course, section)}
              disabled={!hasAvailableSeats(section)}
              className={cn(
                'ml-3 p-2 rounded-lg transition-all',
                hasAvailableSeats(section)
                  ? 'bg-purple-600 hover:bg-purple-700 text-white hover:scale-110'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}
              title="Add to schedule"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CourseListProps {
  courses: Course[];
  onAddSection: (course: Course, section: Section) => void;
}

export function CourseList({ courses, onAddSection }: CourseListProps) {
  if (courses.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg mb-2">No courses found</p>
        <p className="text-sm">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {courses.map((course) => (
        <CourseListItem
          key={course.courseCode}
          course={course}
          onAddSection={onAddSection}
        />
      ))}
    </div>
  );
}
