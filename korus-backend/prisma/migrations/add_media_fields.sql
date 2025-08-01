-- Add imageUrl and videoUrl columns to posts table
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;