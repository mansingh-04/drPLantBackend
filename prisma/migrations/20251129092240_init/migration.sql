-- AlterTable
ALTER TABLE "CareTip" ADD COLUMN     "logsUsed" TEXT,
ADD COLUMN     "recommendationId" INTEGER;

-- AddForeignKey
ALTER TABLE "CareTip" ADD CONSTRAINT "CareTip_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "AIRecommendation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
