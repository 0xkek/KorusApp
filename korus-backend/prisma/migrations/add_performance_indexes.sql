-- Performance indexes for production
-- These indexes will speed up common queries without breaking existing functionality

-- Posts table indexes
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON "posts" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_created ON "posts" ("authorWallet", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_posts_topic ON "posts" ("topic") WHERE "topic" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_hidden ON "posts" ("isHidden") WHERE "isHidden" = false;

-- Replies table indexes
CREATE INDEX IF NOT EXISTS idx_replies_post_id ON "replies" ("postId");
CREATE INDEX IF NOT EXISTS idx_replies_author ON "replies" ("authorWallet");
CREATE INDEX IF NOT EXISTS idx_replies_parent ON "replies" ("parentId") WHERE "parentId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_replies_created ON "replies" ("createdAt" DESC);

-- Interactions table indexes
CREATE INDEX IF NOT EXISTS idx_interactions_post ON "interactions" ("postId");
CREATE INDEX IF NOT EXISTS idx_interactions_user ON "interactions" ("userWallet");
CREATE INDEX IF NOT EXISTS idx_interactions_type ON "interactions" ("type");
CREATE INDEX IF NOT EXISTS idx_interactions_composite ON "interactions" ("postId", "userWallet", "type");

-- Games table indexes
CREATE INDEX IF NOT EXISTS idx_games_status ON "games" ("status");
CREATE INDEX IF NOT EXISTS idx_games_players ON "games" ("player1Wallet", "player2Wallet");
CREATE INDEX IF NOT EXISTS idx_games_created ON "games" ("createdAt" DESC);

-- Notifications table indexes  
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON "notifications" ("recipientWallet", "read", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON "notifications" ("recipientWallet", "read") WHERE "read" = false;

-- Reports table indexes
CREATE INDEX IF NOT EXISTS idx_reports_status ON "reports" ("status") WHERE "status" = 'pending';
CREATE INDEX IF NOT EXISTS idx_reports_content ON "reports" ("contentId", "contentType");

-- Token distribution indexes
CREATE INDEX IF NOT EXISTS idx_token_dist_week ON "token_distributions" ("weekStartDate" DESC);
CREATE INDEX IF NOT EXISTS idx_token_dist_user ON "token_distributions" ("userWallet", "weekStartDate" DESC);

-- Analyze tables for query optimization
ANALYZE "users";
ANALYZE "posts";
ANALYZE "replies";
ANALYZE "interactions";
ANALYZE "games";
ANALYZE "notifications";