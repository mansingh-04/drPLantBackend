-- AlterTable
ALTER TABLE "AIRecommendation" ADD COLUMN     "plantImageId" INTEGER;

-- AddForeignKey
ALTER TABLE "AIRecommendation" ADD CONSTRAINT "AIRecommendation_plantImageId_fkey" FOREIGN KEY ("plantImageId") REFERENCES "PlantImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
