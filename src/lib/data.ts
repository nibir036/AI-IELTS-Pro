
import type { Lesson, MockTest, ReadingTest, ListeningTest } from './types';

// These imports are now effectively empty or used for fallback data,
// as the app will primarily fetch from Firestore.
import lessonsData from '../../docs/lessons.json';
import mockTestsData from '../../docs/mock-tests.json';
import readingTestsData from '../../docs/reading-tests.json';
import listeningTestsData from '../../docs/listening-tests.json';

// You can keep these exports if you have parts of your app that
// still need synchronous access to this data or for offline support.
export const lessons: Lesson[] = lessonsData.lessons;
export const mockTests: MockTest[] = mockTestsData.mockTests;
export const readingTests: ReadingTest[] = readingTestsData.readingTests;
export const listeningTests: ListeningTest[] = listeningTestsData.listeningTests;
