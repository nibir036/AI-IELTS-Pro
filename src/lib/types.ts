

import type { DocumentReference, Timestamp } from "firebase/firestore";

export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  nativeLanguage: string;
  currentBand: number;
  targetBand: number;
  learningPathId: string; 
  totalPracticeTime: number; // in minutes
}

export type GrammarTableRow = {
  subject: string;
  verb: string;
}

export type ContentBlock = {
  type: 'explanation' | 'example' | 'tip' | 'image_placeholder' | 'grammar_table' | 'example_list';
  sectionTitle?: string; // e.g., "A", "B", "C"
  content?: string;
  imageHint?: string;
  generatedImageUrl?: string; 
  tableRows?: GrammarTableRow[]; // For grammar_table
  examples?: string[]; // For example_list
};

export type PracticeExercise = {
  type: 'gap-fill' | 'sentence-transformation' | 'matching' | 'sentence-building';
  instructions: string;
  questions: { question: string, answer: string }[];
}

export interface Lesson {
  id: string;
  type: 'Grammar' | 'Vocabulary' | 'Tips';
  title: string;
  level: 'Basic' | 'Intermediate' | 'Advanced' | 'All Levels';
  contentBlocks: ContentBlock[];
  exercises?: PracticeExercise[]; // New field for exercises
  content_en: string; // Brief summary
}

export interface SpeakingTest {
  id: string;
  title: string;
  level: 'Part 1' | 'Part 2' | 'Part 3';
  content_en: string;
  skill: 'Speaking';
}


export interface MockTest {
  id: string;
  testType: 'IELTS-Academic' | 'PTE' | 'IELTS-General';
  skill: 'Writing';
  questions: Array<WritingQuestion>;
}

export interface ReadingQuestion {
    id: string;
    instructions?: string; // Optional instructions for a block of questions
    question: string;
    type: 'multiple-choice' | 'true-false-not-given' | 'note-completion' | 'matching-headings' | 'matching-information' | 'summary-completion' | 'yes-no-not-given' | 'matching-sentence-endings' | 'fill-in-the-blank';
    options?: string[];
    answer: string;
    answerBox?: string[]; // For summary-completion
}

export interface ReadingTestPart {
    part: number;
    title: string;
    passage: string;
    questions: ReadingQuestion[];
}

export interface ReadingTest {
    id: string;
    title: string;
    skill: 'Reading';
    parts: ReadingTestPart[];
}


export interface ListeningTestPart {
    part: number;
    title: string;
    transcript: string;
    questions: ListeningQuestion[];
}

export interface ListeningTest {
    id: string;
    title: string;
    skill: 'Listening';
    audioUrl: string;
    parts: ListeningTestPart[];
}


export type ListeningQuestionType = 'multiple-choice' | 'fill-in-the-blank' | 'note-completion' | 'summary-completion';

export interface ListeningQuestion {
    id: string;
    instructions?: string;
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

    

    