// Mock mode for development without database
import jwt from 'jsonwebtoken';

// In-memory storage for mock mode
export const mockUsers = new Map();
export const mockPosts: any[] = [];
export const mockInteractions = new Map();

// Check if we're in mock mode (no database)
export const isMockMode = () => {
  return process.env.MOCK_MODE === 'true' || !process.env.DATABASE_URL;
};

// Mock auth controller
export const mockAuthController = {
  connectWallet: async (req: any, res: any) => {
    try {
      const { walletAddress, signature, message } = req.body;

      if (!walletAddress || !signature || !message) {
        return res.status(400).json({ 
          error: 'Missing required fields: walletAddress, signature, message' 
        });
      }

      console.log('Mock mode - Wallet connection:', walletAddress);

      // Get or create mock user
      let user = mockUsers.get(walletAddress);
      if (!user) {
        user = {
          walletAddress,
          tier: 'standard',
          walletSource: 'app',
          genesisVerified: false,
          allyBalance: 5000,
          totalInteractionScore: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        mockUsers.set(walletAddress, user);
        console.log(`Mock mode - New user created: ${walletAddress}`);
      }

      // Generate JWT
      const token = jwt.sign(
        { walletAddress },
        process.env.JWT_SECRET || 'mock-secret',
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        token,
        user: {
          walletAddress: user.walletAddress,
          tier: user.tier,
          walletSource: user.walletSource,
          genesisVerified: user.genesisVerified,
          allyBalance: user.allyBalance.toString()
        }
      });
    } catch (error) {
      console.error('Mock auth error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getProfile: async (req: any, res: any) => {
    const walletAddress = req.userWallet;
    const user = mockUsers.get(walletAddress);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        walletAddress: user.walletAddress,
        tier: user.tier,
        walletSource: user.walletSource,
        genesisVerified: user.genesisVerified,
        allyBalance: user.allyBalance.toString(),
        totalInteractionScore: user.totalInteractionScore
      }
    });
  }
};

// Mock posts controller
export const mockPostsController = {
  getPosts: async (req: any, res: any) => {
    const { topic, subtopic, limit = 10, offset = 0 } = req.query;
    
    // Filter posts
    let filteredPosts = [...mockPosts];
    if (topic) {
      filteredPosts = filteredPosts.filter(p => p.topic === topic);
    }
    if (subtopic) {
      filteredPosts = filteredPosts.filter(p => p.subtopic === subtopic);
    }

    // Sort by creation time
    filteredPosts.sort((a, b) => {
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // Paginate
    const paginatedPosts = filteredPosts.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      posts: paginatedPosts.map(post => ({
        ...post,
        author: mockUsers.get(post.authorWallet) || { walletAddress: post.authorWallet },
        replies: [],
        _count: {
          replies: 0,
          interactions: 0
        }
      })),
      total: filteredPosts.length,
      hasMore: Number(offset) + Number(limit) < filteredPosts.length
    });
  },

  createPost: async (req: any, res: any) => {
    const { content, topic = 'GENERAL', subtopic, imageUrl, videoUrl } = req.body;
    const authorWallet = req.userWallet;

    if (!content || content.length > 500) {
      return res.status(400).json({ 
        error: 'Content is required and must be less than 500 characters' 
      });
    }

    const newPost = {
      id: `mock-${Date.now()}`,
      authorWallet,
      content,
      topic,
      subtopic,
      imageUrl,
      videoUrl,
      likeCount: 0,
      replyCount: 0,
      tipCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockPosts.unshift(newPost);

    res.status(201).json({
      success: true,
      post: {
        ...newPost,
        author: mockUsers.get(authorWallet),
        replies: [],
        _count: {
          replies: 0,
          interactions: 0
        }
      }
    });
  }
};

// Mock interactions controller
export const mockInteractionsController = {
  likePost: async (req: any, res: any) => {
    const { id: postId } = req.params;
    const userWallet = req.userWallet;
    
    const post = mockPosts.find(p => p.id === postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const interactionKey = `${userWallet}-${postId}-like`;
    const existingInteraction = mockInteractions.get(interactionKey);

    if (existingInteraction) {
      // Unlike
      mockInteractions.delete(interactionKey);
      post.likeCount = Math.max(0, post.likeCount - 1);
      
      res.json({
        success: true,
        action: 'unliked',
        post: {
          ...post,
          author: mockUsers.get(post.authorWallet)
        }
      });
    } else {
      // Like
      mockInteractions.set(interactionKey, {
        userWallet,
        targetId: postId,
        targetType: 'post',
        interactionType: 'like',
        createdAt: new Date()
      });
      post.likeCount += 1;
      
      res.json({
        success: true,
        action: 'liked',
        post: {
          ...post,
          author: mockUsers.get(post.authorWallet)
        }
      });
    }
  },

  tipPost: async (req: any, res: any) => {
    const { id: postId } = req.params;
    const { amount = 1 } = req.body;
    const userWallet = req.userWallet;
    
    const post = mockPosts.find(p => p.id === postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Can't tip your own post
    if (post.authorWallet === userWallet) {
      return res.status(400).json({ error: 'Cannot tip your own post' });
    }

    // Check user balance
    const user = mockUsers.get(userWallet);
    if (!user || user.allyBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Update balances
    user.allyBalance -= amount;
    const author = mockUsers.get(post.authorWallet);
    if (author) {
      author.allyBalance += amount;
    }

    // Update post tip count
    post.tipCount += 1;

    res.json({
      success: true,
      message: `Tipped ${amount} $ALLY`,
      amount
    });
  }
};