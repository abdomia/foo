import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('بريد إلكتروني غير صالح').toLowerCase(),
  password: z.string().min(1, 'كلمة المرور مطلوبة').max(128),
});

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'الاسم قصير جداً').max(100),
  email: z.string().trim().email('بريد إلكتروني غير صالح').toLowerCase(),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل').max(128),
  phone: z.string().trim().regex(/^[0-9+\s-]{10,15}$/, 'رقم الهاتف غير صالح'),
  parentPhone: z.string().trim().regex(/^[0-9+\s-]{10,15}$/, 'رقم ولي الأمر غير صالح'),
  avatar: z.string().trim().url('رابط صورة غير صالح').optional().or(z.literal('')),
  grade: z.string().trim().max(60).optional(),
});

export const activateCodeSchema = z.object({
  code: z.string().trim().min(4).max(20).toUpperCase(),
});

export const lessonProgressSchema = z.object({
  lessonId: z.string().min(1),
  progress: z.number().int().min(0).max(100).optional(),
  watchSeconds: z.number().int().min(0).optional(),
  timeSpentSeconds: z.number().int().min(0).optional(),
  completed: z.boolean().optional(),
});

export const quizResultSchema = z.object({
  quizId: z.string().min(1),
  score: z.number().int().min(0).max(100),
  passed: z.boolean(),
  answers: z
    .array(
      z.object({
        id: z.string().min(1),
        selected: z.string().nullable().optional(),
      })
    )
    .optional(),
});

export const planIdSchema = z.enum(['monthly', 'semester', 'yearly']);

export const classKeySchema = z.enum([
  'third_preparatory',
  'first_secondary',
  'second_secondary',
  'third_secondary_literary',
  'third_secondary_math',
]);

export const accessTypeSchema = z.enum(['FREE', 'SUBSCRIBER', 'PREMIUM']).default('FREE');

export const paymentCreateSchema = z.object({
  plan: planIdSchema,
  paymentMethod: z.enum(['vodafone_cash', 'instapay']),
  classKey: classKeySchema.optional(),
});

export const paymentConfirmSchema = z.object({
  paymentId: z.string().min(1),
  transactionId: z.string().min(3).max(100),
});

export const avatarSchema = z.object({
  avatar: z.string().trim().url('رابط صورة غير صالح'),
});

export const adminSubscriptionCodeSchema = z.object({
  plan: planIdSchema,
  durationDays: z.number().int().min(1).max(3650),
});

export const adminTopicSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  icon: z.string().trim().max(60).optional(),
  order: z.number().int().min(0).optional(),
  grade: z.string().trim().max(60).optional().nullable(),
});

export const adminLessonSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(1000).optional().or(z.literal('')),
  videoUrl: z.string().trim().min(1).max(1000),
  duration: z.string().trim().max(20).optional(),
  type: z.string().trim().max(40).optional(),
  accessType: accessTypeSchema,
  summary: z.string().max(5000).optional().nullable(),
  keyPoints: z.array(z.string().trim().min(1).max(500)).max(30).optional(),
  files: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        url: z.string().trim().min(1).max(1000),
        type: z.string().trim().max(40).optional(),
      })
    )
    .max(20)
    .optional(),
  grade: z.string().trim().max(60).optional().nullable(),
  order: z.number().int().min(0).optional(),
  topicId: z.string().min(1),
});

export const adminQuizSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  accessType: accessTypeSchema,
  grade: z.string().trim().max(60).optional().nullable(),
  topicId: z.string().min(1),
  timeLimit: z.number().int().min(0).nullable().optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
  questions: z
    .array(
      z.object({
        id: z.string().optional(),
        question: z.string().trim().min(1),
        type: z.string().trim().default('multiple-choice'),
        options: z.array(z.string()).min(1),
        correctAnswer: z.string().trim().min(1),
        difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
        explanation: z.string().max(2000).optional().nullable(),
        order: z.number().int().min(0).optional(),
      })
    )
    .max(200),
});

export const adminPdfSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  fileUrl: z.string().trim().min(1).max(1000),
  category: z.string().trim().max(40).optional(),
  accessType: accessTypeSchema,
  grade: z.string().trim().max(60).optional().nullable(),
  order: z.number().int().min(0).optional(),
  topicId: z.string().min(1).optional().nullable(),
});

export const adminAdviceSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(10000),
  videoUrl: z.string().trim().max(1000).optional().nullable(),
  type: z.string().trim().max(40).optional(),
  grade: z.string().trim().max(60).optional().nullable(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});
