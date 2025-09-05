import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Korus Backend API',
      version: '1.0.0',
      description: 'Social media platform with blockchain integration',
      contact: {
        name: 'Korus Team',
        email: 'support@korus.app',
      },
      license: {
        name: 'Proprietary',
        url: 'https://korus.app/license',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: 'Current environment',
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.korus.app',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/connect endpoint',
        },
        csrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'x-csrf-token',
          description: 'CSRF token for state-changing operations',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  example: 'Validation failed',
                },
                statusCode: {
                  type: 'number',
                  example: 400,
                },
                details: {
                  type: 'object',
                  additionalProperties: true,
                },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            walletAddress: {
              type: 'string',
              example: 'GvQW7V9rqBhxjRczBnfCBKCK2s5bfFhL2WbLz7KQtq1h',
            },
            tier: {
              type: 'string',
              enum: ['standard', 'premium', 'moderator', 'admin'],
              example: 'standard',
            },
            genesisVerified: {
              type: 'boolean',
              example: false,
            },
            allyBalance: {
              type: 'string',
              example: '5000',
            },
            snsUsername: {
              type: 'string',
              example: 'korus.sol',
              nullable: true,
            },
            nftAvatar: {
              type: 'string',
              example: 'https://nft.storage/avatar.png',
              nullable: true,
            },
            displayName: {
              type: 'string',
              example: 'Korus User',
              nullable: true,
            },
            bio: {
              type: 'string',
              example: 'Web3 enthusiast',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Post: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            content: {
              type: 'string',
              maxLength: 5000,
              example: 'Hello Korus!',
            },
            category: {
              type: 'string',
              example: 'general',
            },
            subcategory: {
              type: 'string',
              example: 'discussion',
              nullable: true,
            },
            topic: {
              type: 'string',
              example: 'web3',
              nullable: true,
            },
            imageUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
            },
            videoUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
            },
            authorWallet: {
              type: 'string',
            },
            author: {
              $ref: '#/components/schemas/User',
            },
            likeCount: {
              type: 'integer',
              minimum: 0,
              example: 0,
            },
            replyCount: {
              type: 'integer',
              minimum: 0,
              example: 0,
            },
            tipCount: {
              type: 'integer',
              minimum: 0,
              example: 0,
            },
            isHidden: {
              type: 'boolean',
              example: false,
            },
            isFlagged: {
              type: 'boolean',
              example: false,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Reply: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            content: {
              type: 'string',
              maxLength: 1000,
            },
            postId: {
              type: 'string',
              format: 'uuid',
            },
            authorWallet: {
              type: 'string',
            },
            author: {
              $ref: '#/components/schemas/User',
            },
            likeCount: {
              type: 'integer',
              minimum: 0,
            },
            imageUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
            },
            videoUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
            meta: {
              type: 'object',
              properties: {
                total: {
                  type: 'integer',
                },
                page: {
                  type: 'integer',
                },
                limit: {
                  type: 'integer',
                },
                hasMore: {
                  type: 'boolean',
                },
              },
            },
          },
        },
      },
      parameters: {
        walletAddress: {
          in: 'path',
          name: 'walletAddress',
          required: true,
          schema: {
            type: 'string',
            pattern: '^[1-9A-HJ-NP-Za-km-z]{32,44}$',
          },
          description: 'Solana wallet address',
        },
        postId: {
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
          description: 'Post ID',
        },
        pagination: {
          in: 'query',
          name: 'pagination',
          schema: {
            type: 'object',
            properties: {
              page: {
                type: 'integer',
                minimum: 1,
                default: 1,
              },
              limit: {
                type: 'integer',
                minimum: 1,
                maximum: 100,
                default: 20,
              },
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  code: 'UNAUTHORIZED',
                  message: 'Authentication required',
                  statusCode: 401,
                },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  code: 'FORBIDDEN',
                  message: 'Insufficient privileges',
                  statusCode: 403,
                },
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  code: 'NOT_FOUND',
                  message: 'Resource not found',
                  statusCode: 404,
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  code: 'VALIDATION_ERROR',
                  message: 'Validation failed',
                  statusCode: 400,
                  details: {
                    field: 'content',
                    message: 'Content is required',
                  },
                },
              },
            },
          },
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: {
                    type: 'string',
                    example: 'Too many requests. Please wait 30 seconds before trying again.',
                  },
                  retryAfter: {
                    type: 'integer',
                    example: 30,
                  },
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'Wallet-based authentication endpoints',
      },
      {
        name: 'Posts',
        description: 'Create, read, and manage posts',
      },
      {
        name: 'Replies',
        description: 'Reply to posts and manage replies',
      },
      {
        name: 'Interactions',
        description: 'Like and tip posts/replies',
      },
      {
        name: 'NFTs',
        description: 'NFT-related endpoints',
      },
      {
        name: 'SNS',
        description: 'Solana Name Service endpoints',
      },
      {
        name: 'Search',
        description: 'Search posts and users',
      },
      {
        name: 'Games',
        description: 'Blockchain-based games',
      },
      {
        name: 'Reputation',
        description: 'User reputation system',
      },
      {
        name: 'Distribution',
        description: 'Token distribution endpoints',
      },
      {
        name: 'Moderation',
        description: 'Content moderation (moderator only)',
      },
      {
        name: 'Reports',
        description: 'Report inappropriate content',
      },
      {
        name: 'Sponsored',
        description: 'Sponsored posts management',
      },
      {
        name: 'Notifications',
        description: 'User notifications',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);