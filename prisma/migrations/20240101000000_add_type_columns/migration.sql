-- Add type column to Lesson table
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'explanation';

-- Add category column to Pdf table
ALTER TABLE "Pdf" ADD COLUMN IF NOT EXISTS "category" TEXT DEFAULT 'explanation';