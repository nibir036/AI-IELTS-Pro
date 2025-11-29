
// This file is now deprecated as all data is fetched from Firestore.
// It can be removed in the future if no longer needed for any fallback logic.

import type { Lesson, MockTest, ReadingTest, ListeningTest, User } from './types';

// Keeping the file to prevent breaking imports, but emptying its content.
// All dynamic data for tests and lessons should be fetched from Firestore collections:
// 'lessons', 'mockTests', 'readingTests', 'listeningTests'

export const users: User[] = [];
export const lessons: Lesson[] = [];
export const mockTests: MockTest[] = [];
export const readingTests: ReadingTest[] = [];
export const listeningTests: ListeningTest[] = [];
