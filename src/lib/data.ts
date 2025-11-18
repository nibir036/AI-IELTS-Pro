import type { User, Lesson, MockTest, Submission, WritingQuestion } from './types';

export const sampleUser: User = {
  userId: 'sample-user-123',
  email: 'student@example.com',
  nativeLanguage: 'Spanish',
  currentBand: 6.5,
  targetBand: 8.0,
  learningPathId: 'path-xyz',
  totalPracticeTime: 720, // 12 hours
};

export const lessons: Lesson[] = [
  {
    lessonId: 'Tenses_L1',
    type: 'Grammar',
    title: 'Mastering Present Tenses',
    level: 'Basic',
    content_en: 'This lesson covers the simple present, present continuous, and present perfect tenses...',
  },
  {
    lessonId: 'AcademicVocab_L3',
    type: 'Vocabulary',
    title: 'Academic Vocabulary for Essays',
    level: 'Advanced',
    content_en: 'Learn key vocabulary for writing high-scoring academic essays...',
  },
  {
    lessonId: 'Tips_L2',
    type: 'Tips',
    title: 'IELTS Speaking Part 2 Strategy',
    level: 'Intermediate',
    content_en: 'A guide to structuring your 2-minute talk in the speaking test...',
  },
  {
    lessonId: 'Grammar_L2',
    type: 'Grammar',
    title: 'Conditionals and Hypotheticals',
    level: 'Intermediate',
    content_en: 'Understand the use of zero, first, second, and third conditionals...'
  },
  {
    lessonId: 'Vocab_L1',
    type: 'Vocabulary',
    title: 'Common Phrasal Verbs',
    level: 'Basic',
    content_en: 'Learn and practice 20 common phrasal verbs used in daily conversation.'
  }
];

export const mockTests: MockTest[] = [
  {
    testId: 'IELTS_Writing_001',
    testType: 'IELTS-Academic',
    skill: 'Writing',
    questions: [
      {
        task: 2,
        topic: 'Some people believe that unpaid community service should be a compulsory part of high school programmes. To what extent do you agree or disagree?',
        taskType: 'Task 2',
        wordCountTarget: 250,
      } as WritingQuestion,
    ],
  },
  {
    testId: 'IELTS_Writing_002',
    testType: 'IELTS-Academic',
    skill: 'Writing',
    questions: [
      {
        task: 2,
        topic: 'In some countries, young people are encouraged to work or travel for a year between finishing high school and starting university studies. Discuss the advantages and disadvantages for young people who decide to do this.',
        taskType: 'Task 2',
        wordCountTarget: 250,
      } as WritingQuestion,
    ],
  },
];

export const recentSubmissions: Submission[] = [
    {
        submissionId: 'sub-001',
        userId: 'user-abc',
        testId: 'IELTS_Writing_001',
        skill: 'Writing',
        inputData: 'The essay text here...',
        aiReport: {
            overallBand: 7.0,
            feedbackSummary: 'A well-structured essay with good arguments, but some grammatical errors and repetitive vocabulary.',
            criterionScores: {
                taskResponse: { band: 7.5, comment: 'You addressed all parts of the task effectively.' },
                coherenceCohesion: { band: 7.0, comment: 'Good use of cohesive devices, though paragraphing could be improved.' },
                lexicalResource: { band: 6.5, comment: 'Vocabulary is adequate but lacks range. Try to use more varied and precise language.' },
                grammaticalRangeAccuracy: { band: 6.5, comment: 'Some errors in complex sentences and article usage.' }
            },
            improvementAreas: [],
            correctedEssay: ''
        },
        scoreBand: 7.0,
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    },
    {
        submissionId: 'sub-002',
        userId: 'user-abc',
        testId: 'IELTS_Speaking_001',
        skill: 'Speaking',
        inputData: 'audio/url.mp3',
        aiReport: null,
        scoreBand: 7.5,
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
    }
]
