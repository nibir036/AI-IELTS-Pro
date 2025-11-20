
import type { Lesson, MockTest, ReadingTest, ListeningTest } from './types';
import lessonsData from '../../docs/lessons.json';
import mockTestsData from '../../docs/mock-tests.json';
import readingTestsData from '../../docs/reading-tests.json';
import listeningTestsData from '../../docs/listening-tests.json';

export const lessons: Lesson[] = lessonsData.lessons;
export const mockTests: MockTest[] = mockTestsData.mockTests;
export const readingTests: ReadingTest[] = readingTestsData.readingTests;
export const listeningTests: ListeningTest[] = listeningTestsData.listeningTests;
