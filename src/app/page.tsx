'use client';

import { useState } from 'react';
import { Course, Section, SelectedCourse } from '@/types';
import { mockCourses } from '@/data/mock-courses';
import { TimetableGrid } from '@/components/TimetableGrid';
import { CourseList } from '@/components/CourseList';
import { SearchBar, FilterBar, FilterButton } from '@/components/SearchBar';
import { BuildingReference } from '@/components/BuildingReference';
import { BuildingModal } from '@/components/BuildingModal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { generateCourseColor, calculateTotalCredits, detectConflicts } from '@/lib/schedule-utils';
import { DISCLAIMER } from '@/lib/constants';
import { Calendar, Book, AlertCircle, Trash2, X } from 'lucide-react';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourses, setSelectedCourses] = useState<SelectedCourse[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  // Filter courses based on search and filters
  const filteredCourses = mockCourses.filter((course) => {
    const matchesSearch = 
      course.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.sections.some(s => 
        s.instructor?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

    const matchesDepartment = !selectedDepartment || course.department === selectedDepartment;

    return matchesSearch && matchesDepartment;
  });

  // Get unique departments
  const departments = Array.from(new Set(mockCourses.map(c => c.department)));

  // Add a course section to schedule
  const handleAddSection = (course: Course, section: Section) => {
    const newCourse: SelectedCourse = {
      course,
      selectedSection: section,
      color: generateCourseColor(selectedCourses.length),
    };
    setSelectedCourses([...selectedCourses, newCourse]);
  };

  // Remove a course from schedule
  const handleRemoveCourse = (index: number) => {
    setSelectedCourses(selectedCourses.filter((_, i) => i !== index));
  };

  // Remove section from course list
  const handleRemoveSection = (course: Course, section: Section) => {
    setSelectedCourses(
      selectedCourses.filter(
        (sc) => !(sc.course.courseCode === course.courseCode && sc.selectedSection.sectionId === section.sectionId)
      )
    );
  };

  // Clear all courses
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const handleClearSchedule = () => {
    setShowClearConfirm(true);
  };

  const confirmClearSchedule = () => {
    setSelectedCourses([]);
    setShowClearConfirm(false);
  };

  // Calculate stats
  const totalCredits = calculateTotalCredits(selectedCourses);
  const conflicts = detectConflicts(selectedCourses);

  return (
    <div className="min-h-screen relative">
      {/* Dark mode background overlay - ensures solid black */}
      <div className="fixed inset-0 bg-[#1e1e1e] -z-10 dark:block hidden" />
      
      {/* Header - More compact */}
      <header className="bg-white dark:bg-[#252526] shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
        <div className="w-full px-3 sm:px-4 lg:px-6 py-3 lg:py-4">
          <div className="flex items-center justify-between max-w-[1600px] mx-auto">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-purple-600 dark:bg-purple-500 text-white p-2 lg:p-2.5 rounded-lg shadow-lg">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white">
                  CUHK Course Scheduler
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  Plan your perfect timetable
                </p>
              </div>
            </div>

            {/* Stats and Theme Toggle - More compact on mobile */}
            <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
              <ThemeToggle />
              <div className="text-center">
                <div className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600 dark:text-purple-400">{selectedCourses.length}</div>
                <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Courses</div>
              </div>
              <div className="text-center hidden sm:block">
                <div className="text-xl lg:text-2xl font-bold text-purple-600 dark:text-purple-400">{totalCredits}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Credits</div>
              </div>
              {conflicts.length > 0 && (
                <div className="text-center">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600 dark:text-red-400">{conflicts.length}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Conflicts</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-2 sm:px-4 lg:px-6 py-4 lg:py-6 bg-transparent">
        {/* Disclaimer - Compact on desktop, full on mobile */}
        <div className="mb-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-start gap-2 max-w-[1600px] mx-auto">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300">{DISCLAIMER}</p>
        </div>

        {/* Conflicts warning */}
        {conflicts.length > 0 && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3 max-w-[1600px] mx-auto">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-300 mb-1 text-sm">Schedule Conflicts Detected!</p>
                {conflicts.map((conflict, idx) => (
                  <p key={idx} className="text-xs text-red-700 dark:text-red-400">
                    {conflict.course1.course.courseCode} conflicts with {conflict.course2.course.courseCode}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 max-w-[1600px] mx-auto">
          {/* Left sidebar - Course search - Narrower on desktop */}
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 space-y-3">
            <div className="bg-white dark:bg-[#252526] rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <Book className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Find Courses</h2>
              </div>

              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search courses..."
                className="mb-3"
              />

              <FilterBar
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters(!showFilters)}
              >
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-wide mb-2 block">
                    Department
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <FilterButton
                      active={selectedDepartment === null}
                      onClick={() => setSelectedDepartment(null)}
                    >
                      All
                    </FilterButton>
                    {departments.map((dept) => (
                      <FilterButton
                        key={dept}
                        active={selectedDepartment === dept}
                        onClick={() => setSelectedDepartment(dept)}
                      >
                        {dept.split(' ')[0]}
                      </FilterButton>
                    ))}
                  </div>
                </div>
              </FilterBar>
            </div>

            {/* Course list - Scrollable */}
            <div className="max-h-[calc(100vh-280px)] lg:max-h-[calc(100vh-220px)] overflow-y-auto space-y-3 pr-1">
              <CourseList
                courses={filteredCourses}
                onAddSection={handleAddSection}
                onRemoveSection={handleRemoveSection}
                selectedCourses={selectedCourses}
              />
            </div>
          </div>

          {/* Right side - Timetable - Takes remaining space */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* My Schedule header with inline course badges */}
            <div className="bg-white dark:bg-[#252526] rounded-lg shadow-sm px-4 py-3 border border-gray-100 dark:border-gray-800">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">My Schedule</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">2025-26 Term 1</p>
                </div>
                {selectedCourses.length > 0 && (
                  <button
                    onClick={handleClearSchedule}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All
                  </button>
                )}
              </div>

              {/* Selected Courses - Inline compact badges */}
              {selectedCourses.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Selected ({selectedCourses.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCourses.map((sc, idx) => (
                      <div
                        key={idx}
                        className="group flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-md border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all text-xs"
                        style={{ 
                          backgroundColor: `${sc.color}15`,
                          borderColor: `${sc.color}40`
                        }}
                      >
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: sc.color }}
                        />
                        <span className="font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {sc.course.courseCode}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap hidden sm:inline">
                          {sc.selectedSection.sectionType} {sc.selectedSection.sectionId}
                        </span>
                        <button
                          onClick={() => handleRemoveCourse(idx)}
                          className="ml-1 p-0.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all opacity-60 group-hover:opacity-100"
                          title="Remove course"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Timetable - Fits viewport */}
            {selectedCourses.length > 0 ? (
              <TimetableGrid
                selectedCourses={selectedCourses}
                onRemoveCourse={(course) => {
                  const index = selectedCourses.indexOf(course);
                  handleRemoveCourse(index);
                }}
                onLocationClick={(location) => setSelectedLocation(location)}
              />
            ) : (
              <div className="bg-white dark:bg-[#1e1e1e] rounded-lg shadow-sm p-8 lg:p-12 text-center border border-gray-100 dark:border-gray-800">
                <Calendar className="w-12 h-12 lg:w-16 lg:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Your schedule is empty
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Search for courses and click the + button to add them to your schedule
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Building Reference floating button */}
      <BuildingReference />

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Clear Schedule?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This will remove all courses</p>
              </div>
            </div>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to clear your entire schedule? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-[#252526] hover:bg-gray-200 dark:hover:bg-[#2d2d30] text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors border border-gray-200 dark:border-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearSchedule}
                className="flex-1 px-4 py-2 bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Building Location Modal - Single instance for entire page */}
      {selectedLocation && (
        <BuildingModal
          location={selectedLocation}
          isOpen={true}
          onClose={() => setSelectedLocation(null)}
        />
      )}
    </div>
  );
}
