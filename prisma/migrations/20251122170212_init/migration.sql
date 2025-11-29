-- DropForeignKey
ALTER TABLE "public"."AIRecommendation" DROP CONSTRAINT "AIRecommendation_plantImageId_fkey";

-- AddForeignKey
ALTER TABLE "AIRecommendation" ADD CONSTRAINT "AIRecommendation_plantImageId_fkey" FOREIGN KEY ("plantImageId") REFERENCES "PlantImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
