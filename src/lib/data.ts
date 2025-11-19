
import type { Lesson, MockTest, ReadingTest } from './types';

export const lessons: Lesson[] = [
    {
      "id": "GRAMMAR_001",
      "type": "Grammar",
      "title": "Present Simple vs. Present Continuous",
      "level": "Basic",
      "content_en": "The Present Simple is used for habits, routines, and facts (e.g., 'I drink coffee every morning.'). The Present Continuous is for actions happening now or around the current time (e.g., 'I am drinking coffee right now.')."
    },
    {
      "id": "GRAMMAR_002",
      "type": "Grammar",
      "title": "Articles: A/An vs. The",
      "level": "Basic",
      "content_en": "Use 'a/an' for general, non-specific nouns (e.g., 'I saw a dog.'). Use 'the' for specific nouns that have already been mentioned or are unique (e.g., 'The dog was friendly.')."
    },
    {
      "id": "GRAMMAR_003",
      "type": "Grammar",
      "title": "Past Simple Tense",
      "level": "Intermediate",
      "content_en": "The Past Simple is used to talk about completed actions in the past. For regular verbs, add '-ed' (e.g., 'walked', 'played'). Many common verbs are irregular (e.g., 'went', 'saw', 'ate'). Example: 'Yesterday, I visited my grandparents.'"
    },
    {
      "id": "VOCAB_001",
      "type": "Vocabulary",
      "title": "Technology Vocabulary",
      "level": "Intermediate",
      "content_en": "Essential words for discussing technology: innovative, cutting-edge, user-friendly, obsolete, digital native, automation, artificial intelligence. Try using them in sentences about how technology affects society."
    },
    {
      "id": "VOCAB_002",
      "type": "Vocabulary",
      "title": "Environment Vocabulary",
      "level": "Intermediate",
      "content_en": "Key terms for environmental topics: sustainability, biodiversity, renewable energy, carbon footprint, conservation, pollution, climate change. These are crucial for Writing Task 2 and Speaking Part 3."
    },
    {
      "id": "VOCAB_003",
      "type": "Vocabulary",
      "title": "Adjectives for Describing Places",
      "level": "Basic",
      "content_en": "Expand your descriptions with words like: bustling (busy), tranquil (calm), picturesque (beautiful), historic, modern, vibrant (full of life), deserted (empty)."
    },
    {
      "id": "TIPS_001",
      "type": "Tips",
      "title": "Time Management in the Reading Test",
      "level": "All Levels",
      "content_en": "Do not spend more than 20 minutes on each reading passage. If you are stuck on a question, make an educated guess and move on. You can always come back later if you have time. Skim the questions before reading the passage to know what to look for."
    },
    {
      "id": "TIPS_002",
      "type": "Tips",
      "title": "Paraphrasing in Writing Task 2",
      "level": "Intermediate",
      "content_en": "Never copy the question in your introduction. You must paraphrase it using synonyms and different sentence structures. For example, 'Some people believe that...' can be changed to 'It is argued by some that...'. This demonstrates your vocabulary and grammar range."
    },
    {
      "id": "TIPS_003",
      "type": "Tips",
      "title": "Extending Your Answers in Speaking Part 3",
      "level": "Intermediate",
      "content_en": "Don't give short answers. Use the 'A.R.E.A.' method: Answer the question directly. Give a Reason for your answer. Provide an Example to support your point. Suggest an Alternative or opposite view. This creates a well-developed, fluent response."
    },
    {
      "id": "SPEAKING_001",
      "type": "Speaking",
      "title": "Hometown",
      "level": "Part 1",
      "content_en": "Let's talk about your hometown. What kind of place is it? What's the most interesting part of your town? What kind of jobs do the people in your hometown do?"
    },
    {
      "id": "SPEAKING_002",
      "type": "Speaking",
      "title": "A Memorable Holiday",
      "level": "Part 2",
      "content_en": "Describe a memorable holiday you have had. You should say: where you went, who you were with, what you did, and explain why it was so memorable for you."
    },
    {
      "id": "SPEAKING_003",
      "type": "Speaking",
      "title": "Advertising",
      "level": "Part 3",
      "content_en": "Let's discuss advertising. What makes an advertisement effective? Do you think advertising manipulates people? What are the rules about advertising to children?"
    },
    {
        "id": "SPEAKING_004",
        "type": "Speaking",
        "title": "Daily Routine",
        "level": "Part 1",
        "content_en": "Tell me about your typical daily routine. What is your favorite part of the day? How do you like to relax in the evenings?"
    }
];

export const mockTests: MockTest[] = [
    {
      "id": "IELTS_Writing_001",
      "testType": "IELTS-Academic",
      "skill": "Writing",
      "questions": [
        {
          "task": 2,
          "topic": "Some people believe that unpaid community service should be a compulsory part of high school programmes. To what extent do you agree or disagree?",
          "taskType": "Task 2",
          "wordCountTarget": 250
        }
      ]
    },
    {
      "id": "IELTS_Writing_002",
      "testType": "IELTS-Academic",
      "skill": "Writing",
      "questions": [
        {
          "task": 2,
          "topic": "In some countries, young people are encouraged to work or travel for a year between finishing high school and starting university studies. Discuss the advantages and disadvantages for young people who decide to do this.",
          "taskType": "Task 2",
          "wordCountTarget": 250
        }
      ]
    },
    {
      "id": "IELTS_Writing_003",
      "testType": "IELTS-General",
      "skill": "Writing",
      "questions": [
        {
            "task": 2,
            "topic": "Some people think that it is better to choose a job for the enjoyment rather than for a high salary. To what extent do you agree or disagree?",
            "taskType": "Task 2",
            "wordCountTarget": 250
        }
      ]
    },
    {
      "id": "IELTS_Writing_004",
      "testType": "IELTS-Academic",
      "skill": "Writing",
      "questions": [
          {
              "task": 2,
              "topic": "Some people believe that technology has made our lives more complex and stressful, while others think it has simplified our lives. Discuss both views and give your own opinion.",
              "taskType": "Task 2",
              "wordCountTarget": 250
          }
      ]
    }
];

export const readingTests: ReadingTest[] = [
    {
      "id": "R_AC_001",
      "title": "The Rise of Urban Farming",
      "skill": "Reading",
      "passage": "Urban farming, the practice of cultivating, processing, and distributing food in or around urban areas, is experiencing a global renaissance. From rooftop gardens in New York City to vertical farms in Singapore, this movement is transforming cityscapes and challenging traditional food supply chains. The primary driver is a growing desire for fresh, locally-sourced produce, coupled with concerns about food security, carbon emissions from long-distance transport, and the environmental impact of industrial agriculture. \n\nThere are various models of urban farming. Community gardens allow residents to collectively grow produce on shared land, fostering social cohesion and providing educational opportunities. Commercial urban farms, often utilizing advanced technologies like hydroponics (growing plants in nutrient-rich water) and aeroponics (growing plants with roots suspended in the air), aim for high yields in small spaces. These high-tech farms can operate year-round, independent of weather conditions, producing crops like leafy greens and herbs with remarkable efficiency and minimal water usage compared to conventional farming.\n\nHowever, urban farming is not without its challenges. High initial setup costs, particularly for technology-intensive vertical farms, can be a significant barrier. Access to suitable land or rooftop space in dense cities is another major hurdle. Furthermore, critics argue that urban farms cannot realistically replace the vast output of rural agriculture and are limited to producing a narrow range of high-value crops. Despite these limitations, proponents argue that its value lies not in replacing traditional farming, but in supplementing it, increasing urban resilience, and reconnecting city dwellers with their food.",
      "questions": [
        {
          "id": "q1",
          "question": "What is the main motivation behind the growth of urban farming?",
          "type": "multiple-choice",
          "options": [
            "A desire for cities to become completely self-sufficient.",
            "A demand for local food and concerns about the environment.",
            "The availability of new farming technologies.",
            "To reduce the cost of produce for urban consumers."
          ],
          "answer": "A demand for local food and concerns about the environment."
        },
        {
          "id": "q2",
          "question": "Hydroponic farms use significantly more water than conventional farms.",
          "type": "true-false-not-given",
          "options": ["True", "False", "Not Given"],
          "answer": "False"
        },
        {
          "id": "q3",
          "question": "Community gardens are primarily focused on commercial profit.",
          "type": "true-false-not-given",
          "options": ["True", "False", "Not Given"],
          "answer": "False"
        },
        {
          "id": "q4",
          "question": "Urban farms can grow all types of crops that rural farms can.",
          "type": "true-false-not-given",
          "options": ["True", "False", "Not Given"],
          "answer": "False"
        },
        {
          "id": "q5",
          "question": "Which technology involves growing plants with their roots in the air?",
          "type": "multiple-choice",
          "options": [
            "Vertical Farming",
            "Aeroponics",
            "Hydroponics",
            "Industrial Agriculture"
          ],
          "answer": "Aeroponics"
        }
      ]
    },
    {
        "id": "R_AC_002",
        "title": "The Psychology of Colour",
        "skill": "Reading",
        "passage": "Colour is a powerful communication tool and can be used to signal action, influence mood, and even influence physiological reactions. Certain colours have been associated with increased blood pressure, increased metabolism, and eyestrain. So how exactly does colour work? How is it that the colour of a room can influence our mood? \n\nThe effect of colour is not entirely universal. Perceptions of colour are somewhat subjective, but there are colour effects that have universal meaning. Colours in the red area of the colour spectrum are known as warm colours and include red, orange, and yellow. These warm colours evoke emotions ranging from feelings of warmth and comfort to feelings of anger and hostility. On the other hand, colours on the blue side of the spectrum are known as cool colours and include blue, purple, and green. These colours are often described as calm, but can also call to mind feelings of sadness or indifference.\n\nCompanies use colour to influence consumer perceptions of their products. For example, the colour blue is often associated with trustworthiness and reliability, which is why many financial institutions use it in their branding. Green is linked to nature and health, making it a popular choice for organic and eco-friendly products. Red creates a sense of urgency, which is why it's often used for clearance sales. Understanding the psychological effects of colour is a critical asset for marketers, artists, and designers, enabling them to create more impactful and persuasive work.",
        "questions": [
          {
            "id": "q1",
            "question": "The perception of colour is identical for everyone.",
            "type": "true-false-not-given",
            "options": ["True", "False", "Not Given"],
            "answer": "False"
          },
          {
            "id": "q2",
            "question": "Which of the following is considered a 'cool' colour?",
            "type": "multiple-choice",
            "options": [
                "Yellow",
                "Red",
                "Green",
                "Orange"
            ],
            "answer": "Green"
          },
          {
            "id": "q3",
            "question": "Why do many banks use the colour blue?",
            "type": "multiple-choice",
            "options": [
                "It creates a sense of urgency.",
                "It is associated with nature and health.",
                "It evokes feelings of calmness.",
                "It is associated with dependability."
            ],
            "answer": "It is associated with dependability."
          },
           {
            "id": "q4",
            "question": "The text states that red is the best colour for marketing all products.",
            "type": "true-false-not-given",
            "options": ["True", "False", "Not Given"],
            "answer": "False"
          }
        ]
      }
];
