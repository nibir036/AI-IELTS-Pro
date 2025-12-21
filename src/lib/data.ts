
// This file is now deprecated as all data is fetched from Firestore.
// It is kept to prevent breaking existing imports, but its content is cleared.
// All dynamic data for tests and lessons should be fetched from Firestore collections.

import type { User, Lesson, MockTest, ReadingTest, ListeningTest } from './types';

export const users: User[] = [];
export const lessons: Lesson[] = [];
export const mockTests: MockTest[] = [];
export const readingTests: ReadingTest[] = [];
export const listeningTests: ListeningTest[] = [];
