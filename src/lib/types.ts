

import type { DocumentReference, Timestamp } from "firebase/firestore";

export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  nativeLanguage: string;
  currentBand: number;
  targetBand: number;
  learningPathId: string; // Changed from DocumentReference to string
  totalPracticeTime: number; // in minutes
}

export interface Lesson {
  id: string;
  type: 'Grammar' | 'Vocabulary' | 'Tips' | 'Reading' | 'Listening' | 'Speaking';
  title: string;
  level: 'Basic' | 'Intermediate' | 'Advanced' | 'All Levels' | "Part 1" | "Part 2" | "Part 3";
  content_en: string;
  content_native?: string;
  explanation?: string;
}

export interface MockTest {
  id: string;
  testType: 'IELTS-Academic' | 'PTE' | 'IELTS-General';
  skill: 'Writing' | 'Speaking' | 'Reading' | 'Listening';
  questions: Array<Record<string, any>>;
}

export interface ReadingTest {
    id: string;
    title: string;
    skill: 'Reading';
    passage: string;
    questions: ReadingQuestion[];
}

export type ReadingQuestionType = 'multiple-choice' | 'true-false-not-given';

export interface ReadingQuestion {
    id: string;
    question: string;
    type: ReadingQuestionType;
    options?: string[];
    answer: string;
}

export interface ListeningTest {
    id: string;
    title: string;
    skill: 'Listening';
    audioUrl: string;
    transcript?: string; // Added optional transcript
    questions: ListeningQuestion[];
}

export type ListeningQuestionType = 'multiple-choice' | 'fill-in-the-blank';

export interface ListeningQuestion {
    id: string;
    question: string;
    type: ListeningQuestionType;
    options?: string[];
    answer: string;
}

export interface WritingQuestion {
  task: number;
  topic: string;
  taskType: 'Task 1' | 'Task 2';
  wordCountTarget: number;
  imageUrl?: string;
}

export interface Submission {
  id: string;
  userId: DocumentReference | string;
  testId: string;
  skill: 'Writing' | 'Speaking' | 'Reading' | 'Listening' | string;
  inputData: string | Record<string, string>; // Text response, URL, or map of answers
  aiReport: AiPoweredWritingEvaluationOutput | AiPoweredSpeakingEvaluationOutput | Record<string, string> | null;
  scoreBand: number | null;
  timestamp: Timestamp | Date;
}

export interface LearningPath {
  id: string;
  lessonIds: string[];
}

export interface AiPoweredWritingEvaluationOutput {
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

export interface AiPoweredSpeakingEvaluationOutput {
  overallFeedback: string;
  pronunciationFeedback: string;
  fluencyFeedback: string;
  coherenceFeedback: string;
  grammarFeedback: string;
  vocabularyFeedback: string;
  scoreBand: number;
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

export interface PredictTargetDateOutput {
    predictedDate: string;
    reasoning: string;
}
    