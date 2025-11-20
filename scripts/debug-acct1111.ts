
import { generatedCourses } from '../src/data/generated-courses';

const course = generatedCourses.find(c => c.courseCode === 'ACCT1111');

if (course) {
    console.log('Found ACCT1111:');
    console.log(JSON.stringify(course, null, 2));
} else {
    console.log('ACCT1111 not found in generatedCourses');
}
