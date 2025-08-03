import React, { createContext, useContext, useState } from 'react';
import { Post as PostType } from '../types';

interface GameContextType {
  gamePosts: PostType[];
  addGamePost: (post: PostType) => void;
  updateGamePost: (postId: number, updatedPost: PostType) => void;
  getGamePost: (postId: number) => PostType | undefined;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  // Initialize with sample games for testing
  const sampleGames: PostType[] = [
    {
      id: 9999,
      wallet: 'DeMo1K8tQpVHgLpQeN4eSkVHgfr6k6pVxZfO3syhUser',
      time: 'Just now',
      content: 'Looking for a Tic Tac Toe opponent!',
      likes: 0,
      replies: [],
      tips: 0,
      liked: false,
      category: 'GAMES',
      gameData: {
        type: 'tictactoe',
        wager: 25,
        player1: 'DeMo1K8tQpVHgLpQeN4eSkVHgfr6k6pVxZfO3syhUser',
        status: 'waiting',
        createdAt: Date.now(),
        expiresAt: Date.now() + 300000,
        board: [[null, null, null], [null, null, null], [null, null, null]]
      }
    },
    {
      id: 9998,
      wallet: 'RpS2K8tQpVHgLpQeN4eSkVHgfr6k6pVxZfO3syhGamer',
      time: '2m ago',
      content: 'Rock Paper Scissors - Best of 3!',
      likes: 1,
      replies: [],
      tips: 0,
      liked: false,
      category: 'GAMES',
      gameData: {
        type: 'rps',
        wager: 50,
        player1: 'RpS2K8tQpVHgLpQeN4eSkVHgfr6k6pVxZfO3syhGamer',
        status: 'waiting',
        createdAt: Date.now() - 120000,
        expiresAt: Date.now() + 300000,
        rounds: [],
        currentRound: 1
      }
    },
    {
      id: 9997,
      wallet: 'C4nN3K8tQpVHgLpQeN4eSkVHgfr6k6pVxZfO3syhCon4',
      time: '5m ago',
      content: 'Connect Four challenge - get 4 in a row!',
      likes: 2,
      replies: [],
      tips: 0,
      liked: false,
      category: 'GAMES',
      gameData: {
        type: 'connect4',
        wager: 15,
        player1: 'C4nN3K8tQpVHgLpQeN4eSkVHgfr6k6pVxZfO3syhCon4',
        status: 'waiting',
        createdAt: Date.now() - 300000,
        expiresAt: Date.now() + 300000,
        board: Array(6).fill(null).map(() => Array(7).fill(null))
      }
    }
  ];
  
  const [gamePosts, setGamePosts] = useState<PostType[]>(sampleGames);

  const addGamePost = (post: PostType) => {
    setGamePosts(prev => [post, ...prev]);
  };

  const updateGamePost = (postId: number, updatedPost: PostType) => {
    setGamePosts(prev => prev.map(post => 
      post.id === postId ? updatedPost : post
    ));
  };

  const getGamePost = (postId: number): PostType | undefined => {
    return gamePosts.find(post => post.id === postId);
  };

  return (
    <GameContext.Provider value={{ gamePosts, addGamePost, updateGamePost, getGamePost }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGames() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGames must be used within a GameProvider');
  }
  return context;
}