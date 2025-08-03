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
  const [gamePosts, setGamePosts] = useState<PostType[]>([]);

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