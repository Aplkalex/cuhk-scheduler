import fs from 'node:fs';
import path from 'node:path';
import type { Course } from '@/types';

type SerializedCourse = Omit<Course, 'lastUpdated'> & {
  lastUpdated?: string;
};

let cached: Course[] | null = null;

const datasetPath =
  process.env.GENERATED_COURSES_PATH ??
  path.join(process.cwd(), 'data', 'courses-2025-26-T2.json');

const parseCourses = (raw: string): Course[] => {
  const parsed = JSON.parse(raw) as SerializedCourse[];
  return parsed.map((course) => ({
    ...course,
    lastUpdated: course.lastUpdated ? new Date(course.lastUpdated) : undefined,
  }));
};

export const loadGeneratedCourses = (): Course[] => {
  if (cached) return cached;
  try {
    const data = fs.readFileSync(datasetPath, 'utf-8');
    cached = parseCourses(data);
  } catch (error) {
    console.warn(
      `[generated-courses] Failed to load ${datasetPath}. Using empty dataset.`,
      error
    );
    cached = [];
  }
  return cached;
};

export const generatedCourses = loadGeneratedCourses();
