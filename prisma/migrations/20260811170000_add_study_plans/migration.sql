-- 🤖 خطتي الذكية — AI Study Planner
-- Adds planning metadata to Lesson + new StudyPlan / StudyPlanItem tables.
-- Safe migration: only additive changes, no data loss.

-- Add planning metadata to Lesson
ALTER TABLE "Lesson" ADD COLUMN "difficulty" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "Lesson" ADD COLUMN "prerequisites" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE INDEX "Lesson_type_grade_idx" ON "Lesson"("type", "grade");

-- CreateTable StudyPlan
CREATE TABLE "StudyPlan" (
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

-- CreateTable StudyPlanItem
CREATE TABLE "StudyPlanItem" (
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

-- CreateIndex
CREATE INDEX "StudyPlan_userId_status_idx" ON "StudyPlan"("userId", "status");
CREATE INDEX "StudyPlan_userId_createdAt_idx" ON "StudyPlan"("userId", "createdAt");
CREATE INDEX "StudyPlan_status_idx" ON "StudyPlan"("status");
CREATE INDEX "StudyPlan_grade_idx" ON "StudyPlan"("grade");
CREATE INDEX "StudyPlanItem_planId_idx" ON "StudyPlanItem"("planId");
CREATE INDEX "StudyPlanItem_planId_scheduledDate_idx" ON "StudyPlanItem"("planId", "scheduledDate");
CREATE INDEX "StudyPlanItem_planId_lessonId_idx" ON "StudyPlanItem"("planId", "lessonId");
CREATE INDEX "StudyPlanItem_lessonId_idx" ON "StudyPlanItem"("lessonId");

-- AddForeignKey
ALTER TABLE "StudyPlan" ADD CONSTRAINT "StudyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlanItem" ADD CONSTRAINT "StudyPlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "StudyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlanItem" ADD CONSTRAINT "StudyPlanItem_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
