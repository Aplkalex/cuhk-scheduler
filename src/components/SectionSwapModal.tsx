'use client';

import { useState } from 'react';
import { Course, Section } from '@/types';
import { hasAvailableSeats } from '@/lib/schedule-utils';
import { cn } from '@/lib/utils';
import { X, RefreshCw, AlertCircle, ChevronDown } from 'lucide-react';

interface SectionSwapModalProps {
  course: Course;
  currentSection: Section;
  onSwap: (newSectionId: string) => void;
  onClose: () => void;
}

export function SectionSwapModal({ course, currentSection, onSwap, onClose }: SectionSwapModalProps) {
  // State to track which lecture is expanded (accordion behavior)
  const [expandedLectureId, setExpandedLectureId] = useState<string | null>(null);
  
  // Get all lecture sections for this course
  const lectureSections = course.sections.filter(s => s.sectionType === 'Lecture');
  
  // Get tutorials for each lecture to show availability
  const getTutorialsForLecture = (lectureId: string) => {
    return course.sections.filter(s => s.sectionType === 'Tutorial' && s.parentLecture === lectureId);
  };

  // Toggle expand/collapse for a lecture
  const toggleExpand = (lectureId: string) => {
    setExpandedLectureId(expandedLectureId === lectureId ? null : lectureId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Change Section
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              {course.courseCode} - {course.courseName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section List */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
          <div className="space-y-3">
            {lectureSections.map((section) => {
              const isCurrent = section.sectionId === currentSection.sectionId;
              const tutorials = getTutorialsForLecture(section.sectionId);
              const isFull = !hasAvailableSeats(section);

              const isExpanded = expandedLectureId === section.sectionId;

              return (
                <div
                  key={section.sectionId}
                  className={cn(
                    'w-full rounded-lg border-2 transition-all',
                    isCurrent && 'border-purple-500 bg-purple-50 dark:bg-purple-950/30',
                    !isCurrent && !isFull && 'border-gray-200 dark:border-gray-700 hover:border-purple-400',
                    isFull && !isCurrent && 'border-gray-200 dark:border-gray-700 opacity-50'
                  )}
                >
                  {/* Lecture Header - Clickable */}
                  <button
                    onClick={() => toggleExpand(section.sectionId)}
                    className="w-full p-4 text-left cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-t-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Section Header */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            Lecture {section.sectionId}
                          </span>
                          {isCurrent && (
                            <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full font-semibold">
                              Current
                            </span>
                          )}
                          {isFull && (
                            <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Full
                            </span>
                          )}
                        </div>

                        {/* Instructor */}
                        {section.instructor && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            👨‍🏫 {section.instructor.name}
                          </div>
                        )}

                        {/* Time Slots */}
                        <div className="space-y-1 mb-2">
                          {section.timeSlots.map((slot, idx) => (
                            <div key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                              📅 {slot.day} {slot.startTime}-{slot.endTime} @ {slot.location}
                            </div>
                          ))}
                        </div>

                        {/* Tutorials Available */}
                        {tutorials.length > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 inline-block">
                            {tutorials.length} tutorial{tutorials.length !== 1 ? 's' : ''} available - Click to {isExpanded ? 'collapse' : 'expand'}
                          </div>
                        )}

                        {/* Seats */}
                        <div className="mt-2 text-sm">
                          {hasAvailableSeats(section) ? (
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              ✓ {section.seatsRemaining}/{section.quota} seats available
                            </span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              ✗ Full ({section.enrolled}/{section.quota})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expand/Collapse Icon */}
                      {tutorials.length > 0 && (
                        <ChevronDown
                          className={cn(
                            'w-5 h-5 text-gray-400 transition-transform',
                            isExpanded && 'transform rotate-180'
                          )}
                        />
                      )}
                    </div>
                  </button>

                  {/* Tutorials List - Expandable */}
                  {isExpanded && tutorials.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4">
                      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Tutorials for Lecture {section.sectionId}:
                      </div>
                      <div className="space-y-2">
                        {tutorials.map((tutorial) => {
                          const tutFull = !hasAvailableSeats(tutorial);
                          return (
                            <div
                              key={tutorial.sectionId}
                              className={cn(
                                'p-3 rounded-lg border text-sm',
                                tutFull 
                                  ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20'
                                  : 'border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/20'
                              )}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  Tutorial {tutorial.sectionId}
                                </span>
                                {tutFull ? (
                                  <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">Full</span>
                                ) : (
                                  <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
                                    {tutorial.seatsRemaining} seats
                                  </span>
                                )}
                              </div>
                              {tutorial.instructor && (
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                  {tutorial.instructor.name}
                                </div>
                              )}
                              <div className="space-y-0.5">
                                {tutorial.timeSlots.map((slot, idx) => (
                                  <div key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                                    {slot.day} {slot.startTime}-{slot.endTime} @ {slot.location}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Swap Button */}
                  {!isCurrent && !isFull && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSwap(section.sectionId);
                          onClose();
                        }}
                        className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                      >
                        Switch to Lecture {section.sectionId}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            💡 When you change the lecture, a tutorial will be randomly assigned from the available tutorials.
          </p>
        </div>
      </div>
    </div>
  );
}
