'use client';

import { Course, Section, SelectedCourse } from '@/types';
import { hasAvailableSeats } from '@/lib/schedule-utils';
import { cn } from '@/lib/utils';
import { Plus, Trash2, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useState } from 'react';

interface CourseListItemProps {
  course: Course;
  onAddSection: (course: Course, section: Section) => void;
  onRemoveSection: (course: Course, section: Section) => void;
  selectedCourses: SelectedCourse[];
}

function CourseListItem({ course, onAddSection, onRemoveSection, selectedCourses }: CourseListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Check if a section is already selected
  const isSectionSelected = (section: Section) => {
    return selectedCourses.some(
      (sc) => sc.course.courseCode === course.courseCode && sc.selectedSection.sectionId === section.sectionId
    );
  };

  const hasDetails = course.description || course.enrollmentRequirements;

  return (
    <div className="bg-white dark:bg-[#252526] rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700">
      {/* Course header - More compact */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">
            {course.courseCode}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2">
            {course.courseName}
          </p>
        </div>
        <div className="text-[10px] bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-semibold ml-2 whitespace-nowrap">
          {course.credits} {course.credits === 1 ? 'credit' : 'credits'}
        </div>
      </div>

      {/* Department */}
      <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">
        {course.department}
      </div>

      {/* Course Details Toggle Button */}
      {hasDetails && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 mb-2 font-medium transition-colors"
        >
          <Info className="w-3 h-3" />
          <span>Course Details</span>
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      )}

      {/* Expandable Course Details */}
      {isExpanded && hasDetails && (
        <div className="mb-3 p-2 bg-gray-50 dark:bg-[#1e1e1e] rounded-md border border-gray-200 dark:border-gray-700 space-y-2">
          {course.enrollmentRequirements && (
            <div>
              <h4 className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">Enrollment Requirements</h4>
              <p className="text-[10px] text-gray-600 dark:text-gray-300 leading-relaxed">
                {course.enrollmentRequirements}
              </p>
            </div>
          )}
          {course.description && (
            <div>
              <h4 className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</h4>
              <p className="text-[10px] text-gray-600 dark:text-gray-300 leading-relaxed">
                {course.description}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sections - More compact */}
      <div className="space-y-1.5">
        <div className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Sections
        </div>
        {course.sections.map((section) => {
          const isSelected = isSectionSelected(section);
          
          return (
          <div
            key={section.sectionId}
            className={cn(
              'flex items-center justify-between p-2 rounded-md border transition-all',
              isSelected
                ? 'border-purple-400 dark:border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-200 dark:ring-purple-700'
                : hasAvailableSeats(section)
                ? 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10'
                : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1e1e1e] opacity-60'
            )}
          >
            <div className="flex-1 min-w-0 mr-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-semibold text-gray-900 dark:text-white text-xs">
                  {section.sectionType} {section.sectionId}
                </span>
                {section.instructor && (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    • {section.instructor.name}
                  </span>
                )}
              </div>

              {/* Language and Consent badges for section */}
              {(section.language || section.addConsent || section.dropConsent) && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {section.language && (
                    <span className="text-[9px] bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium">
                      {section.language}
                    </span>
                  )}
                  {section.addConsent && (
                    <span className="text-[9px] bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-medium">
                      Add Consent
                    </span>
                  )}
                  {section.dropConsent && (
                    <span className="text-[9px] bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded-full font-medium">
                      Drop Consent
                    </span>
                  )}
                </div>
              )}
              
              <div className="text-[10px] text-gray-600 dark:text-gray-400 space-y-0">
                {section.timeSlots.slice(0, 2).map((slot, idx) => (
                  <div key={idx} className="truncate">
                    {slot.day.slice(0, 3)} {slot.startTime}-{slot.endTime}
                    {slot.location && ` @ ${slot.location}`}
                  </div>
                ))}
                {section.timeSlots.length > 2 && (
                  <div className="text-gray-400 dark:text-gray-500">+{section.timeSlots.length - 2} more</div>
                )}
              </div>

              <div className="mt-1 text-[10px]">
                {hasAvailableSeats(section) ? (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    {section.seatsRemaining}/{section.quota} seats
                  </span>
                ) : (
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    Full ({section.enrolled}/{section.quota})
                  </span>
                )}
              </div>
            </div>

            {isSectionSelected(section) ? (
              <button
                onClick={() => onRemoveSection(course, section)}
                className="flex-shrink-0 p-1.5 rounded-md transition-all bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white hover:scale-110"
                title="Remove from schedule"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => onAddSection(course, section)}
                disabled={!hasAvailableSeats(section)}
                className={cn(
                  'flex-shrink-0 p-1.5 rounded-md transition-all',
                  hasAvailableSeats(section)
                    ? 'bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600 text-white hover:scale-110'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                )}
                title="Add to schedule"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}

interface CourseListProps {
  courses: Course[];
  onAddSection: (course: Course, section: Section) => void;
  onRemoveSection: (course: Course, section: Section) => void;
  selectedCourses: SelectedCourse[];
}

export function CourseList({ courses, onAddSection, onRemoveSection, selectedCourses }: CourseListProps) {
  if (courses.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
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
          onRemoveSection={onRemoveSection}
          selectedCourses={selectedCourses}
        />
      ))}
    </div>
  );
}
