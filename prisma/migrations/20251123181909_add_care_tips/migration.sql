-- CreateTable
CREATE TABLE "CareTip" (
    "id" SERIAL NOT NULL,
    "plantId" INTEGER NOT NULL,
    "tips" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CareTip_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CareTip" ADD CONSTRAINT "CareTip_plantId_fkey" FOREIGN KEY ("plantId") REFERENCES "Plant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
