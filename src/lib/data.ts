import type { User, Lesson, MockTest, Submission, WritingQuestion } from './types';

// This file is now primarily for mock test data.
// Lesson data will be fetched from Firestore.

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

    