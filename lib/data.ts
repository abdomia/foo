export interface Lesson {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  duration: string;
  completed: boolean;
  topicId: string;
  type?: 'explanation' | 'practice';
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  icon: string;
  lessons: Lesson[];
  progress: number;
  pdfs?: Pdf[];
}

export interface Pdf {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  order: number;
  topicId: string;
  category: 'explanation' | 'solution' | 'quizzes';
}

export interface Exercise {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'numeric';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  hint?: string;
  topicId: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questions: Exercise[];
  timeLimit?: number;
  passingScore: number;
  completed: boolean;
  score?: number;
}

export interface UserProgress {
  lessonsCompleted: number;
  exercisesCompleted: number;
  quizzesPassed: number;
  totalHours: number;
  streak: number;
  badges: Badge[];
  recentActivity: Activity[];
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  earned: boolean;
  earnedDate?: string;
}

export interface Activity {
  id: string;
  type: 'lesson' | 'exercise' | 'quiz';
  title: string;
  date: string;
  score?: number;
}

export const topics: Topic[] = [];

export const exercises: Exercise[] = [
  {
    id: 'ex-1',
    type: 'multiple-choice',
    question: 'ما هو المتوسط الحسابي للأرقام: 5، 10، 15، 20؟',
    options: ['10', '12.5', '15', '17.5'],
    correctAnswer: '12.5',
    hint: 'المتوسط = مجموع القيم ÷ عددها',
    topicId: 'central-tendency'
  },
  {
    id: 'ex-2',
    type: 'multiple-choice',
    question: 'ما هو الوسيط للقيم: 3، 7، 2، 9، 5؟',
    options: ['3', '5', '7', '9'],
    correctAnswer: '5',
    hint: 'رتّب القيم تصاعدياً ثم اختر القيمة الوسطى',
    topicId: 'central-tendency'
  },
  {
    id: 'ex-3',
    type: 'true-false',
    question: 'المنوال هو القيمة الأكثر تكراراً في مجموعة البيانات',
    correctAnswer: 'صحيح',
    topicId: 'central-tendency'
  },
  {
    id: 'ex-4',
    type: 'numeric',
    question: 'ما هو التباين للقيم: 2، 4، 6؟',
    correctAnswer: '2.67',
    hint: 'التباين = مجموع مربعات الانحرافات ÷ عدد القيم',
    topicId: 'dispersion'
  },
  {
    id: 'ex-5',
    type: 'multiple-choice',
    question: 'إذا كان احتمال نجاح طالب 0.8، فما احتمال رسوبه؟',
    options: ['0.1', '0.2', '0.5', '0.8'],
    correctAnswer: '0.2',
    hint: 'مجموع الاحتمالات = 1',
    topicId: 'probability'
  },
  {
    id: 'ex-6',
    type: 'true-false',
    question: 'الانحراف المعياري يساوي الجذر التربيعي للتباين',
    correctAnswer: 'صحيح',
    topicId: 'dispersion'
  },
  {
    id: 'ex-7',
    type: 'multiple-choice',
    question: 'ما هو المنوال للقيم: 4، 2، 4، 6، 4، 8؟',
    options: ['2', '4', '6', '8'],
    correctAnswer: '4',
    topicId: 'central-tendency'
  },
  {
    id: 'ex-8',
    type: 'multiple-choice',
    question: 'إذا كان P(A) = 0.3 و P(B) = 0.4 و P(A∩B) = 0.1، فما قيمة P(A∪B)؟',
    options: ['0.5', '0.6', '0.7', '0.8'],
    correctAnswer: '0.6',
    hint: 'P(A∪B) = P(A) + P(B) - P(A∩B)',
    topicId: 'probability'
  },
];

export const quizzes: Quiz[] = [
  {
    id: 'quiz-1',
    title: 'اختبار مقاييس النزعة المركزية',
    description: 'اختبر فهمك للمتوسط والوسيط والمنوال',
    passingScore: 70,
    completed: false,
    questions: [
      {
        id: 'q1',
        type: 'multiple-choice',
        question: 'في مجموعة الأرقام: 2، 4، 4، 6، 8، المتوسط الحسابي يساوي:',
        options: ['4', '4.8', '5', '6'],
        correctAnswer: '4.8',
        topicId: 'central-tendency'
      },
      {
        id: 'q2',
        type: 'true-false',
        question: 'يمكن أن يكون للمجموعة الواحدة أكثر من منوال واحد',
        correctAnswer: 'صحيح',
        topicId: 'central-tendency'
      },
      {
        id: 'q3',
        type: 'multiple-choice',
        question: 'ما هو الوسيط للقيم: 12، 15، 18، 20، 25؟',
        options: ['12', '15', '18', '20'],
        correctAnswer: '18',
        topicId: 'central-tendency'
      },
      {
        id: 'q4',
        type: 'multiple-choice',
        question: 'إذا كانت مجموعة البيانات: 3، 3، 3، 3، 3، فالمنوال يساوي:',
        options: ['0', '1', '3', 'لا يوجد منوال'],
        correctAnswer: '3',
        topicId: 'central-tendency'
      },
      {
        id: 'q5',
        type: 'numeric',
        question: 'احسب المتوسط الحسابي للقيم: 10، 20، 30، 40',
        correctAnswer: '25',
        topicId: 'central-tendency'
      },
    ]
  },
  {
    id: 'quiz-2',
    title: 'اختبار مقاييس التشتت',
    description: 'اختبر فهمك للتباين والانحراف المعياري',
    passingScore: 70,
    completed: false,
    questions: [
      {
        id: 'q1',
        type: 'true-false',
        question: 'الانحراف المعياري يقيس مدى تقارب القيم من المتوسط',
        correctAnswer: 'صحيح',
        topicId: 'dispersion'
      },
      {
        id: 'q2',
        type: 'multiple-choice',
        question: 'إذا كان التباين = 16، فما الانحراف المعياري؟',
        options: ['2', '4', '8', '16'],
        correctAnswer: '4',
        topicId: 'dispersion'
      },
      {
        id: 'q3',
        type: 'multiple-choice',
        question: 'التباين يكون دائماً:',
        options: ['موجباً', 'سالباً', 'صفراً', 'لا شيء مما سبق'],
        correctAnswer: 'موجباً',
        topicId: 'dispersion'
      },
    ]
  },
  {
    id: 'quiz-3',
    title: 'اختبار الاحتمالات',
    description: 'اختبر فهمك لقواعد الاحتمال',
    timeLimit: 15,
    passingScore: 70,
    completed: false,
    questions: [
      {
        id: 'q1',
        type: 'multiple-choice',
        question: 'احتمال الحدث المؤكد يساوي:',
        options: ['0', '0.5', '1', 'لا شيء مما سبق'],
        correctAnswer: '1',
        topicId: 'probability'
      },
      {
        id: 'q2',
        type: 'multiple-choice',
        question: 'في تجربة رمي حجر النرد، ما احتمال ظهور عدد زوجي؟',
        options: ['1/6', '1/2', '1/3', '2/3'],
        correctAnswer: '1/2',
        topicId: 'probability'
      },
      {
        id: 'q3',
        type: 'true-false',
        question: 'مجموع احتمالات جميع النتائج الممكنة يساوي 1',
        correctAnswer: 'صحيح',
        topicId: 'probability'
      },
      {
        id: 'q4',
        type: 'multiple-choice',
        question: 'إذا كان P(A) = 0.3، فما قيمة P(A′)؟',
        options: ['0.3', '0.5', '0.7', '1'],
        correctAnswer: '0.7',
        topicId: 'probability'
      },
    ]
  },
];

export const userProgress: UserProgress = {
  lessonsCompleted: 2,
  exercisesCompleted: 5,
  quizzesPassed: 0,
  totalHours: 4.5,
  streak: 3,
  badges: [
    { id: 'first-lesson', name: 'البداية', icon: 'Star', earned: true, earnedDate: '2024-01-15' },
    { id: 'five-exercises', name: 'متمرن', icon: 'Trophy', earned: true, earnedDate: '2024-01-16' },
    { id: 'week-streak', name: 'سبعة أيام', icon: 'Flame', earned: false },
    { id: 'first-quiz', name: 'مختبر', icon: 'Target', earned: false },
    { id: 'master-central', name: 'أستاذ النزعة', icon: 'Crown', earned: false },
  ],
  recentActivity: [
    { id: 'act-1', type: 'lesson', title: 'الوسيط - التوزيع المنصف', date: '2024-01-18' },
    { id: 'act-2', type: 'exercise', title: 'تمارين على المنوال', date: '2024-01-17' },
    { id: 'act-3', type: 'lesson', title: 'المتوسط الحسابي - الأساسيات', date: '2024-01-16' },
  ],
};

export function getTopicById(id: string): Topic | undefined {
  return topics.find(t => t.id === id);
}

export async function fetchTopicsFromDB() {
  try {
    const res = await fetch('/api/admin/topics');
    const data = await res.json();
    if (data.success) {
      return data.data.map((t: any) => ({
        ...t,
        progress: 0,
        lessons: t.lessons.map((l: any) => ({
          ...l,
          completed: false,
          type: l.type || 'explanation',
        })),
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching topics:', error);
    return [];
  }
}

export function getLessonsByTopic(topicId: string): Lesson[] {
  const topic = topics.find(t => t.id === topicId);
  return topic?.lessons || [];
}

export function getExercisesByTopic(topicId: string): Exercise[] {
  return exercises.filter(e => e.topicId === topicId);
}

export function getQuizById(id: string): Quiz | undefined {
  return quizzes.find(q => q.id === id);
}

export function getTotalProgress(): number {
  const totalLessons = topics.reduce((acc, t) => acc + t.lessons.length, 0);
  const completedLessons = topics.reduce(
    (acc, t) => acc + t.lessons.filter(l => l.completed).length,
    0
  );
  return Math.round((completedLessons / totalLessons) * 100);
}
