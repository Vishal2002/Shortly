-- AlterTable
ALTER TABLE "Segment" ADD COLUMN     "captionData" JSONB,
ADD COLUMN     "captionStyle" TEXT,
ADD COLUMN     "hasCaptions" BOOLEAN NOT NULL DEFAULT false;
