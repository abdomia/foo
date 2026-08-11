-- Sync database schema to match prisma/schema.prisma.
-- All statements are idempotent so this migration is safe to run on any database
-- state (created via db push, older migrations, or a fresh deploy).
-- Covers columns/tables/indexes added by commits that shipped without a migration.

-- ============ User ============
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'student';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "xp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "level" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "streak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "streakBest" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastActiveDate" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "questionsAnswered" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "quizzesTaken" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "unitsCompleted" INTEGER NOT NULL DEFAULT 0;

-- ============ Session ============
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "deviceId" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "deviceName" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "browser" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "os" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3);

-- ============ SiteSetting ============
ALTER TABLE "SiteSetting" ADD COLUMN IF NOT EXISTS "teacherName" TEXT NOT NULL DEFAULT 'منصة الرائد';
ALTER TABLE "SiteSetting" ADD COLUMN IF NOT EXISTS "maxDevices" INTEGER NOT NULL DEFAULT 3;

-- ============ Lesson ============
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "accessType" TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "keyPoints" JSONB;
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "files" JSONB;
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "difficulty" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "prerequisites" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- ============ Payment ============
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "classKey" TEXT;

-- ============ Pdf ============
ALTER TABLE "Pdf" ADD COLUMN IF NOT EXISTS "accessType" TEXT NOT NULL DEFAULT 'FREE';

-- ============ Quiz ============
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS "accessType" TEXT NOT NULL DEFAULT 'FREE';

-- ============ Question ============
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "difficulty" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "explanation" TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "points" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "topicId" TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "lessonId" TEXT;
ALTER TABLE "Question" ALTER COLUMN "quizId" DROP NOT NULL;

-- ============ UserQuizProgress ============
ALTER TABLE "UserQuizProgress" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "UserQuizProgress" ADD COLUMN IF NOT EXISTS "bestScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserQuizProgress" ADD COLUMN IF NOT EXISTS "answers" JSONB;

-- ============ UserLessonProgress ============
ALTER TABLE "UserLessonProgress" ADD COLUMN IF NOT EXISTS "watchSeconds" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserLessonProgress" ADD COLUMN IF NOT EXISTS "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserLessonProgress" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ============ Tables added without a migration ============
CREATE TABLE IF NOT EXISTS "ParentStudent" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ParentStudent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Certificate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseTitle" TEXT NOT NULL,
    "completionPercent" INTEGER NOT NULL,
    "studentName" TEXT NOT NULL,
    "teacherName" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "XpLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "XpLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Badge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Award',
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "classKey" TEXT,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudyPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "grade" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "dailyMinutes" INTEGER NOT NULL,
    "selectedDays" INTEGER[] NOT NULL,
    "contentScope" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "selectedUnitIds" TEXT[] NOT NULL,
    "selectedLessonIds" TEXT[] NOT NULL,
    "difficultyLevel" TEXT NOT NULL,
    "priorKnowledge" TEXT NOT NULL,
    "studyIntensity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "totalVideos" INTEGER NOT NULL DEFAULT 0,
    "explanationVideos" INTEGER NOT NULL DEFAULT 0,
    "practiceVideos" INTEGER NOT NULL DEFAULT 0,
    "reviewVideos" INTEGER NOT NULL DEFAULT 0,
    "examVideos" INTEGER NOT NULL DEFAULT 0,
    "totalContentMinutes" INTEGER NOT NULL DEFAULT 0,
    "aiUsed" BOOLEAN NOT NULL DEFAULT false,
    "resetCount" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudyPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudyPlanItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "videoType" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudyPlanItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- ============ Missing indexes ============
CREATE INDEX IF NOT EXISTS "User_role_createdAt_idx" ON "User"("role", "createdAt");
CREATE INDEX IF NOT EXISTS "User_lastActiveDate_idx" ON "User"("lastActiveDate");
CREATE INDEX IF NOT EXISTS "ParentStudent_parentId_idx" ON "ParentStudent"("parentId");
CREATE INDEX IF NOT EXISTS "ParentStudent_studentId_idx" ON "ParentStudent"("studentId");
CREATE UNIQUE INDEX IF NOT EXISTS "ParentStudent_parentId_studentId_key" ON "ParentStudent"("parentId", "studentId");
CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_certificateId_key" ON "Certificate"("certificateId");
CREATE INDEX IF NOT EXISTS "Certificate_userId_idx" ON "Certificate"("userId");
CREATE INDEX IF NOT EXISTS "Certificate_certificateId_idx" ON "Certificate"("certificateId");
CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_userId_courseId_key" ON "Certificate"("userId", "courseId");
CREATE INDEX IF NOT EXISTS "XpLog_userId_idx" ON "XpLog"("userId");
CREATE INDEX IF NOT EXISTS "XpLog_userId_createdAt_idx" ON "XpLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Badge_userId_idx" ON "Badge"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Badge_userId_type_key" ON "Badge"("userId", "type");
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_paymentId_key" ON "Subscription"("paymentId");
CREATE INDEX IF NOT EXISTS "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX IF NOT EXISTS "Subscription_expiryDate_idx" ON "Subscription"("expiryDate");
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Session_userId_deviceId_idx" ON "Session"("userId", "deviceId");
CREATE INDEX IF NOT EXISTS "Lesson_topicId_order_idx" ON "Lesson"("topicId", "order");
CREATE INDEX IF NOT EXISTS "Lesson_grade_order_idx" ON "Lesson"("grade", "order");
CREATE INDEX IF NOT EXISTS "Lesson_type_grade_idx" ON "Lesson"("type", "grade");
CREATE INDEX IF NOT EXISTS "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Pdf_grade_order_idx" ON "Pdf"("grade", "order");
CREATE INDEX IF NOT EXISTS "Pdf_topicId_order_idx" ON "Pdf"("topicId", "order");
CREATE INDEX IF NOT EXISTS "Quiz_grade_createdAt_idx" ON "Quiz"("grade", "createdAt");
CREATE INDEX IF NOT EXISTS "Quiz_topicId_idx" ON "Quiz"("topicId");
CREATE INDEX IF NOT EXISTS "Question_quizId_difficulty_idx" ON "Question"("quizId", "difficulty");
CREATE INDEX IF NOT EXISTS "Question_topicId_difficulty_idx" ON "Question"("topicId", "difficulty");
CREATE INDEX IF NOT EXISTS "Question_lessonId_idx" ON "Question"("lessonId");
CREATE INDEX IF NOT EXISTS "Question_createdAt_idx" ON "Question"("createdAt");
CREATE INDEX IF NOT EXISTS "UserQuizProgress_userId_completedAt_idx" ON "UserQuizProgress"("userId", "completedAt");
CREATE INDEX IF NOT EXISTS "UserQuizProgress_completedAt_idx" ON "UserQuizProgress"("completedAt");
CREATE INDEX IF NOT EXISTS "UserLessonProgress_userId_completedAt_idx" ON "UserLessonProgress"("userId", "completedAt");
CREATE INDEX IF NOT EXISTS "UserLessonProgress_updatedAt_idx" ON "UserLessonProgress"("updatedAt");
CREATE INDEX IF NOT EXISTS "Favorite_userId_idx" ON "Favorite"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Favorite_userId_itemType_itemId_key" ON "Favorite"("userId", "itemType", "itemId");
CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");

-- ============ Foreign keys (idempotent via DO blocks) ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ParentStudent_parentId_fkey') THEN
    ALTER TABLE "ParentStudent" ADD CONSTRAINT "ParentStudent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ParentStudent_studentId_fkey') THEN
    ALTER TABLE "ParentStudent" ADD CONSTRAINT "ParentStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Certificate_userId_fkey') THEN
    ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'XpLog_userId_fkey') THEN
    ALTER TABLE "XpLog" ADD CONSTRAINT "XpLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Badge_userId_fkey') THEN
    ALTER TABLE "Badge" ADD CONSTRAINT "Badge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Subscription_userId_fkey') THEN
    ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Session_userId_fkey') THEN
    ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Lesson_topicId_fkey') THEN
    ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudyPlan_userId_fkey') THEN
    ALTER TABLE "StudyPlan" ADD CONSTRAINT "StudyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudyPlanItem_planId_fkey') THEN
    ALTER TABLE "StudyPlanItem" ADD CONSTRAINT "StudyPlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "StudyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudyPlanItem_lessonId_fkey') THEN
    ALTER TABLE "StudyPlanItem" ADD CONSTRAINT "StudyPlanItem_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_userId_fkey') THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Pdf_topicId_fkey') THEN
    ALTER TABLE "Pdf" ADD CONSTRAINT "Pdf_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Quiz_topicId_fkey') THEN
    ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Question_topicId_fkey') THEN
    ALTER TABLE "Question" ADD CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Question_lessonId_fkey') THEN
    ALTER TABLE "Question" ADD CONSTRAINT "Question_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Question_quizId_fkey') THEN
    ALTER TABLE "Question" ADD CONSTRAINT "Question_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserQuizProgress_userId_fkey') THEN
    ALTER TABLE "UserQuizProgress" ADD CONSTRAINT "UserQuizProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserQuizProgress_quizId_fkey') THEN
    ALTER TABLE "UserQuizProgress" ADD CONSTRAINT "UserQuizProgress_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserLessonProgress_userId_fkey') THEN
    ALTER TABLE "UserLessonProgress" ADD CONSTRAINT "UserLessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserLessonProgress_lessonId_fkey') THEN
    ALTER TABLE "UserLessonProgress" ADD CONSTRAINT "UserLessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Favorite_userId_fkey') THEN
    ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_userId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
