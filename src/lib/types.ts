import type { DocumentReference } from "firebase/firestore";

export interface User {
  userId: string;
  email: string;
  nativeLanguage: string;
  currentBand: number;
  targetBand: number;
  learningPathId: DocumentReference | string;
  totalPracticeTime: number; // in minutes
}

export interface Lesson {
  lessonId: string;
  type: 'Grammar' | 'Vocabulary' | 'Tips' | 'Reading' | 'Listening';
  title: string;
  level: 'Basic' | 'Intermediate' | 'Advanced' | string; // Or band level
  content_en: string;
  content_native?: string;
}

export interface MockTest {
  testId: string;
  testType: 'IELTS-Academic' | 'PTE' | 'IELTS-General';
  skill: 'Writing' | 'Speaking' | 'Reading' | 'Listening';
  questions: Array<Record<string, any>>;
}

export interface WritingQuestion {
  task: number;
  topic: string;
  taskType: 'Task 1' | 'Task 2';
  wordCountTarget: number;
}

export interface Submission {
  submissionId: string;
  userId: DocumentReference | string;
  testId: DocumentReference | string;
  skill: 'Writing' | 'Speaking' | 'GrammarPractice' | string;
  inputData: string; // Text response or URL to audio
  aiReport: AiReport | null;
  scoreBand: number | null;
  timestamp: Date;
}

export interface AiReport {
  overallBand: number;
  feedbackSummary: string;
  criterionScores: {
    taskResponse: CriterionScore;
    coherenceCohesion: CriterionScore;
    lexicalResource: CriterionScore;
    grammaticalRangeAccuracy: CriterionScore;
  };
  improvementAreas: ImprovementArea[];
  correctedEssay: string;
}

export interface CriterionScore {
  band: number;
  comment: string;
}

export interface ImprovementArea {
  type: string;
  rule: string;
  example: string;
}
