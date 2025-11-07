import { describe, it, expect } from '@jest/globals';
import {
  getActiveLectureId,
  removeDependentSectionsForLecture,
  removeLectureAndDependents,
} from '../schedule-utils';
import { Course, Section, SelectedCourse } from '@/types';

const lectureA: Section = {
  sectionId: 'A',
  sectionType: 'Lecture',
  timeSlots: [
    { day: 'Monday', startTime: '09:00', endTime: '10:15' },
    { day: 'Wednesday', startTime: '09:00', endTime: '10:15' },
  ],
  quota: 120,
  enrolled: 60,
  seatsRemaining: 60,
};

const tutorialA: Section = {
  sectionId: 'TA1',
  sectionType: 'Tutorial',
  parentLecture: 'A',
  timeSlots: [
    { day: 'Friday', startTime: '11:00', endTime: '12:00' },
  ],
  quota: 30,
  enrolled: 20,
  seatsRemaining: 10,
};

const lectureB: Section = {
  sectionId: 'B',
  sectionType: 'Lecture',
  timeSlots: [
    { day: 'Tuesday', startTime: '14:00', endTime: '15:15' },
    { day: 'Thursday', startTime: '14:00', endTime: '15:15' },
  ],
  quota: 120,
  enrolled: 50,
  seatsRemaining: 70,
};

const tutorialB: Section = {
  sectionId: 'TB1',
  sectionType: 'Tutorial',
  parentLecture: 'B',
  timeSlots: [
    { day: 'Thursday', startTime: '16:00', endTime: '17:00' },
  ],
  quota: 30,
  enrolled: 15,
  seatsRemaining: 15,
};

const orphanTutorial: Section = {
  sectionId: 'T-ORPHAN',
  sectionType: 'Tutorial',
  timeSlots: [
    { day: 'Monday', startTime: '12:00', endTime: '13:00' },
  ],
  quota: 20,
  enrolled: 10,
  seatsRemaining: 10,
};

const baseCourse: Course = {
  courseCode: 'TEST1000',
  courseName: 'Testing Basics',
  department: 'Testing Department',
  credits: 3,
  sections: [lectureA, lectureB, tutorialA, tutorialB, orphanTutorial],
  term: '2025-26-T1',
  career: 'Undergraduate',
};

const otherLecture: Section = {
  sectionId: 'X',
  sectionType: 'Lecture',
  timeSlots: [
    { day: 'Monday', startTime: '15:00', endTime: '16:15' },
  ],
  quota: 80,
  enrolled: 40,
  seatsRemaining: 40,
};

const otherCourse: Course = {
  courseCode: 'OTHER2000',
  courseName: 'Another Course',
  department: 'General Education',
  credits: 2,
  sections: [otherLecture],
  term: '2025-26-T1',
  career: 'Undergraduate',
};

const makeSelection = (section: Section, color?: string): SelectedCourse => ({
  course: baseCourse,
  selectedSection: section,
  color,
});

describe('course selection helpers', () => {
  it('identifies the directly selected lecture', () => {
    const selections: SelectedCourse[] = [makeSelection(lectureA, '#123456')];

    expect(getActiveLectureId(selections, baseCourse)).toBe('A');
  });

  it('infers the active lecture from a tutorial when lecture is missing', () => {
    const selections: SelectedCourse[] = [makeSelection(tutorialA, '#abcdef')];

    expect(getActiveLectureId(selections, baseCourse)).toBe('A');
  });

  it('prunes sections that belong to other lectures when switching lectures', () => {
    const selections: SelectedCourse[] = [
      makeSelection(lectureA, '#AAA111'),
      makeSelection(tutorialA, '#AAA111'),
      makeSelection(lectureB, '#BBB222'),
      makeSelection(tutorialB, '#BBB222'),
      {
        course: otherCourse,
        selectedSection: otherLecture,
        color: '#CCCCCC',
      },
    ];

    const result = removeDependentSectionsForLecture(
      selections,
      baseCourse.courseCode,
      'B'
    );

    const remainingIds = result
      .filter((sc) => sc.course.courseCode === baseCourse.courseCode)
      .map((sc) => sc.selectedSection.sectionId);

    expect(remainingIds).toEqual(['B', 'TB1']);
  });

  it('removes lectures and their dependents when the lecture is deleted', () => {
    const selections: SelectedCourse[] = [
      makeSelection(lectureA, '#AAA111'),
      makeSelection(tutorialA, '#AAA111'),
      makeSelection(orphanTutorial, '#AAA111'),
      makeSelection(lectureB, '#BBB222'),
      {
        course: otherCourse,
        selectedSection: otherLecture,
        color: '#CCCCCC',
      },
    ];

    const result = removeLectureAndDependents(
      selections,
      baseCourse.courseCode,
      'A'
    );

    const remainingIds = result
      .filter((sc) => sc.course.courseCode === baseCourse.courseCode)
      .map((sc) => sc.selectedSection.sectionId);

    expect(remainingIds).toEqual(['B']);
    expect(
      result.some((sc) => sc.course.courseCode === otherCourse.courseCode)
    ).toBe(true);
  });
});
