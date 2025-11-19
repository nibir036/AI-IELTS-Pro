
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
  id: string; // Changed from lessonId
  type: 'Grammar' | 'Vocabulary' | 'Tips' | 'Reading' | 'Listening' | 'Speaking';
  title: string;
  level: 'Basic' | 'Intermediate' | 'Advanced' | string; // Or band level
  content_en: string;
  content_native?: string;
}

export interface MockTest {
  id: string; // Changed from testId
  testType: 'IELTS-Academic' | 'PTE' | 'IELTS-General';
  skill: 'Writing' | 'Speaking' | 'Reading' | 'Listening';
  questions: Array<Record<string, any>>;
}

export interface ReadingTest {
    id: string; // Changed from testId
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

export interface WritingQuestion {
  task: number;
  topic: string;
  taskType: 'Task 1' | 'Task 2';
  wordCountTarget: number;
}

export interface Submission {
  id: string;
  userId: DocumentReference | string;
  testId: DocumentReference | string;
  skill: 'Writing' | 'Speaking' | 'GrammarPractice' | string;
  inputData: string; // Text response or URL to audio
  aiReport: AiPoweredWritingEvaluationOutput | AiPoweredSpeakingEvaluationOutput | null;
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
