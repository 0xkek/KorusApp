-- CreateTable
CREATE TABLE "users" (
    "walletAddress" VARCHAR(44) NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'standard',
    "walletSource" TEXT NOT NULL DEFAULT 'app',
    "genesisVerified" BOOLEAN NOT NULL DEFAULT false,
    "allyBalance" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "totalInteractionScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("walletAddress")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "authorWallet" VARCHAR(44) NOT NULL,
    "content" TEXT NOT NULL,
    "topic" VARCHAR(50) NOT NULL,
    "subtopic" VARCHAR(100) NOT NULL,
    "bumped" BOOLEAN NOT NULL DEFAULT false,
    "bumpedAt" TIMESTAMP(3),
    "bumpExpiresAt" TIMESTAMP(3),
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "tipCount" INTEGER NOT NULL DEFAULT 0,
    "bumpCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "replies" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorWallet" VARCHAR(44) NOT NULL,
    "content" TEXT NOT NULL,
    "parentReplyId" TEXT,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "tipCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactions" (
    "id" TEXT NOT NULL,
    "userWallet" VARCHAR(44) NOT NULL,
    "targetType" VARCHAR(10) NOT NULL,
    "targetId" TEXT NOT NULL,
    "interactionType" VARCHAR(10) NOT NULL,
    "amount" DECIMAL(18,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "interactions_userWallet_targetId_interactionType_key" ON "interactions"("userWallet", "targetId", "interactionType");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_authorWallet_fkey" FOREIGN KEY ("authorWallet") REFERENCES "users"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replies" ADD CONSTRAINT "replies_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replies" ADD CONSTRAINT "replies_authorWallet_fkey" FOREIGN KEY ("authorWallet") REFERENCES "users"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "replies" ADD CONSTRAINT "replies_parentReplyId_fkey" FOREIGN KEY ("parentReplyId") REFERENCES "replies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_userWallet_fkey" FOREIGN KEY ("userWallet") REFERENCES "users"("walletAddress") ON DELETE RESTRICT ON UPDATE CASCADE;