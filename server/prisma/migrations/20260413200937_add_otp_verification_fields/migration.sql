-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resetOtp" TEXT,
ADD COLUMN     "resetOtpExpires" TIMESTAMP(3),
ADD COLUMN     "signupOtp" TEXT,
ADD COLUMN     "signupOtpExpires" TIMESTAMP(3);
