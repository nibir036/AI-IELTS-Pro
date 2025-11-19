import type { User, Lesson, MockTest, Submission, WritingQuestion } from './types';

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
  {
    testId: 'IELTS_Writing_003',
    testType: 'IELTS-General',
    skill: 'Writing',
    questions: [
        {
            task: 2,
            topic: 'Some people think that it is better to choose a job for the enjoyment rather than for a high salary. To what extent do you agree or disagree?',
            taskType: 'Task 2',
            wordCountTarget: 250,
        } as WritingQuestion,
    ]
  },
  {
      testId: 'IELTS_Writing_004',
      testType: 'IELTS-Academic',
      skill: 'Writing',
      questions: [
          {
              task: 2,
              topic: 'Some people believe that technology has made our lives more complex and stressful, while others think it has simplified our lives. Discuss both views and give your own opinion.',
              taskType: 'Task 2',
              wordCountTarget: 250,
          } as WritingQuestion,
      ]
  }
];
