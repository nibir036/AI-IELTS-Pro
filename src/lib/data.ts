// This file is now deprecated as all data is fetched from Firestore.
// It can be removed in the future if no longer needed for any fallback logic.

import type { Lesson, MockTest, ReadingTest, ListeningTest, User } from './types';

// Keeping the file to prevent breaking imports, but emptying its content.
// All dynamic data for tests and lessons should be fetched from Firestore collections:
// 'lessons', 'mockTests', 'readingTests', 'listeningTests'

export const users: User[] = [];
export const lessons: Lesson[] = [
  {
    "id": "GRAMMAR_p9q3r7t2",
    "type": "Grammar",
    "title": "Present continuous and present simple 2 (I am doing and I do)",
    "level": "Intermediate",
    "content_en": "Learn when to use continuous forms for actions vs. simple forms for states with verbs like 'know', 'like', 'think', and 'see'.",
    "contentBlocks": [
      {
        "type": "explanation",
        "sectionTitle": "A Stative Verbs",
        "content": "We use continuous forms (<b>I’m waiting, it’s raining</b> etc.) for actions and happenings that have started but not finished. <br/><br/>Some verbs (for example, <b>know</b> and <b>like</b>) are not normally used in this way. We don’t say ‘I am knowing’, ‘they are liking’. We say ‘I know’, ‘they like’."
      },
      {
        "type": "example_list",
        "examples": [
          "I’m hungry. I <b>want</b> something to eat. (<i>not</i> I’m wanting)",
          "Do you <b>understand</b> what I <b>mean</b>?",
          "Anna <b>doesn’t seem</b> very happy right now."
        ]
      },
      {
        "type": "explanation",
        "sectionTitle": "B Think",
        "content": "When <b>think</b> means ‘believe’ or ‘have an opinion’, we do not use the continuous:<br/><i>I <b>think</b> Mary is Canadian, but I’m not sure.</i><br/><br/>When <b>think</b> means ‘consider’, the continuous is possible:"
      },
      {
        "type": "image_placeholder",
        "content": "Nicky <b>is thinking</b> of giving up her job.",
        "imageHint": "woman thinking job",
        "generatedImageUrl": "https://storage.googleapis.com/studioprod-51f49.appspot.com/lesson-images/GRAMMAR_p9q3r7t2/block_3.png"
      },
      {
        "type": "explanation",
        "sectionTitle": "C See, hear, smell, taste",
        "content": "We normally use the present simple (not continuous) with <b>see, hear, smell, taste</b>:<br/><i><b>Do you see</b> that man over there?</i><br/><i>This soup <b>doesn’t taste</b> very good.</i><br/><br/>You can use the present simple or continuous to say how somebody <b>looks</b> or <b>feels</b> now:<br/><i>You <b>look</b> well today. or You’<b>re looking</b> well today.</i>"
      },
      {
        "type": "explanation",
        "sectionTitle": "D am/is/are being",
        "content": "You can say <b>he’s being</b> …, <b>you’re being</b> … etc. to say how somebody is behaving now:"
      },
      {
        "type": "image_placeholder",
        "content": "I can’t understand why he’<b>s being</b> so selfish. He isn’t usually like that.",
        "imageHint": "man being selfish",
        "generatedImageUrl": "https://storage.googleapis.com/studioprod-51f49.appspot.com/lesson-images/GRAMMAR_p9q3r7t2/block_6.png"
      },
      {
        "type": "explanation",
        "content": "Compare:<br/><i>He never thinks about other people. He <b>is</b> very selfish. (= he is selfish generally, not only now)</i><br/><br/>We use <b>am/is/are being</b> to say how a person is behaving. It is not usually possible in other situations:<br/><i>Sam <b>is</b> ill. (not is being ill)</i>"
      }
    ]
  }
];
export const mockTests: MockTest[] = [];
export const readingTests: ReadingTest[] = [];
export const listeningTests: ListeningTest[] = [];
