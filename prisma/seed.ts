import { PrismaClient } from '@prisma/client';
import { mockCourses } from '../src/data/mock-courses';
import { testCourses } from '../src/data/test-courses';

const prisma = new PrismaClient();

const defaultTerms = [
  { id: '2025-26-T1', name: '2025-26 Term 1' },
  { id: '2025-26-T2', name: '2025-26 Term 2' },
  { id: '2025-26-Summer', name: '2025-26 Summer' },
];

type SeedCourse = (typeof mockCourses)[number];

const sanitizeCourse = (course: SeedCourse) => {
  const { _id: legacyMongoId, ...rest } = course as SeedCourse & { _id?: unknown };
  void legacyMongoId;
  return {
    ...rest,
    prerequisites: course.prerequisites ?? [],
    sections: course.sections ?? [],
  };
};

async function main() {
  console.log('🌱 Seeding MongoDB…');

  await prisma.term.deleteMany();
  await prisma.course.deleteMany();

  await prisma.term.createMany({
    data: defaultTerms,
  });

  const allCourses = [...mockCourses, ...testCourses];

  await prisma.course.createMany({
    data: allCourses.map(sanitizeCourse),
  });

  console.log(`✅ Seed complete (${allCourses.length} courses, ${defaultTerms.length} terms).`);
}

main()
  .catch((error) => {
    console.error('❌ Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
