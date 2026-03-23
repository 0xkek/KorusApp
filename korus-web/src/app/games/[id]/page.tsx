'use client';
import { logger } from '@/utils/logger';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/Button';
import { TicTacToeBoard, TicTacToeCell } from '@/components/games/TicTacToeBoard';
import { ConnectFourBoard, ConnectFourCell } from '@/components/games/ConnectFourBoard';
import { RockPaperScissorsGame, RPSMove } from '@/components/games/RockPaperScissorsGame';
import { gamesAPI, Game } from '@/lib/api/games';
import { useGameEscrow } from '@/hooks/useGameEscrow';

export default function GamePlayPage() {
  const params = useParams();
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const { joinGame } = useGameEscrow();

  const gameId = params.id as string;
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [makingMove, setMakingMove] = useState(false);

  // Fetch game data
  const loadGame = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

      logger.log('📥 Loading game:', gameId);
      logger.log('Auth token present:', !!token);

      const response = await gamesAPI.getGame(gameId, token || undefined);

      logger.log('📦 Game response:', response);

      if (response.success && response.game) {
        setGame(response.game);
      } else {
        setError('Game not found');
      }
    } catch (err) {
      logger.error('❌ Failed to load game:', err);
      setError(err instanceof Error ? err.message : 'Failed to load game');
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    loadGame();

    // Poll for game updates every 3 seconds
    const interval = setInterval(loadGame, 3000);
    return () => clearInterval(interval);
  }, [loadGame]);

  // Handle joining game
  const handleJoinGame = async () => {
    if (!connected || !publicKey || !game) return;

    setJoining(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (!token) {
        setError('Not authenticated. Please sign in with your wallet.');
        setJoining(false);
        return;
      }

      // For wagered games, join on blockchain first
      if (game.wager && parseFloat(game.wager.toString()) > 0) {
        if (!game.onChainGameId) {
          setError('This game is not properly initialized on the blockchain');
          setJoining(false);
          return;
        }

        logger.log('💰 Wagered game - joining on blockchain first...');
        const { signature } = await joinGame(parseInt(game.onChainGameId));
        logger.log('✅ Blockchain join successful:', signature);

        // Then update backend with signature
        await gamesAPI.joinGame(game.id, { onChainTxSignature: signature }, token);
      } else {
        // No wager - just join in backend
        await gamesAPI.joinGame(game.id, {}, token);
      }

      // Reload game data
      await loadGame();
    } catch (err) {
      logger.error('Failed to join game:', err);
      setError(err instanceof Error ? err.message : 'Failed to join game');
    } finally {
      setJoining(false);
    }
  };

  // Handle making a move
  const handleMove = async (move: unknown) => {
    if (!game || makingMove) return;

    setMakingMove(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (!token) {
        setError('Not authenticated');
        setMakingMove(false);
        return;
      }

      await gamesAPI.makeMove(game.id, { move }, token);

      // Reload game data
      await loadGame();
    } catch (err) {
      logger.error('Failed to make move:', err);
      setError(err instanceof Error ? err.message : 'Failed to make move');
    } finally {
      setMakingMove(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-korus-primary mx-auto mb-4"></div>
          <p className="text-[#a1a1a1]">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Game not found'}</p>
          <Button onClick={() => router.push('/games')}>Back to Games</Button>
        </div>
      </div>
    );
  }

  const isPlayer1 = publicKey?.toBase58() === game.player1;
  const isPlayer2 = publicKey?.toBase58() === game.player2;
  const isParticipant = isPlayer1 || isPlayer2;
  const isMyTurn = publicKey?.toBase58() === game.currentTurn;
  const isGameOver = game.status === 'completed' || game.status === 'cancelled';

  const getGameName = () => {
    switch (game.gameType) {
      case 'tictactoe': return 'Tic Tac Toe';
      case 'rps': return 'Rock Paper Scissors';
      case 'connectfour': return 'Connect Four';
      default: return 'Game';
    }
  };

  // Render Tic Tac Toe
  const renderTicTacToe = () => {
    const board: TicTacToeCell[] = (game.gameState as { board?: TicTacToeCell[] })?.board || Array(9).fill(null);
    const playerSymbol: 'X' | 'O' = isPlayer1 ? 'X' : 'O';

    const handleCellClick = (index: number) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      handleMove({ row, col });
    };

    return (
      <TicTacToeBoard
        board={board}
        onCellClick={handleCellClick}
        isMyTurn={isMyTurn}
        isGameOver={isGameOver}
        winner={game.winner}
        playerSymbol={playerSymbol}
        player1Address={game.player1}
        player2Address={game.player2 || undefined}
        player1DisplayName={game.player1DisplayName}
        player2DisplayName={game.player2DisplayName}
        wager={game.wager}
        currentPlayerAddress={publicKey?.toBase58()}
        payoutTxSignature={game.escrow?.payoutTxSig}
      />
    );
  };

  // Render Connect Four
  const renderConnectFour = () => {
    const board: ConnectFourCell[][] = (game.gameState as { board?: ConnectFourCell[][] })?.board ||
      Array(6).fill(null).map(() => Array(7).fill(null));
    const playerColor: 'red' | 'yellow' = isPlayer1 ? 'red' : 'yellow';

    const handleColumnClick = (col: number) => {
      handleMove({ column: col });
    };

    return (
      <ConnectFourBoard
        board={board}
        onColumnClick={handleColumnClick}
        isMyTurn={isMyTurn}
        isGameOver={isGameOver}
        winner={game.winner}
        playerColor={playerColor}
      />
    );
  };

  // Render Rock Paper Scissors
  const renderRPS = () => {
    const playerMove = (game.gameState as { playerMoves?: Record<string, RPSMove> })?.playerMoves?.[publicKey?.toBase58() || ''] || null;
    const opponentAddress = isPlayer1 ? game.player2 : game.player1;
    const opponentMove = (game.gameState as { playerMoves?: Record<string, RPSMove> })?.playerMoves?.[opponentAddress || ''] || null;

    const handleMoveSelected = (move: RPSMove) => {
      handleMove({ choice: move });
    };

    // Convert wallet address winner to 'you'/'opponent'/'draw' format
    const getWinnerDisplayValue = () => {
      if (!game.winner) return null;
      if (game.winner === 'draw') return 'draw';
      if (game.winner === publicKey?.toBase58()) return 'you';
      return 'opponent';
    };

    return (
      <RockPaperScissorsGame
        onMoveSelected={handleMoveSelected}
        playerMove={playerMove}
        opponentMove={opponentMove}
        isMyTurn={isMyTurn}
        isGameOver={isGameOver}
        winner={getWinnerDisplayValue()}
        player1Address={game.player1}
        player2Address={game.player2 || undefined}
        player1DisplayName={game.player1DisplayName}
        player2DisplayName={game.player2DisplayName}
        currentTurnAddress={game.currentTurn || undefined}
        gameCreatedAt={game.createdAt}
        wager={game.wager}
        gameState={game.gameState as { player1Score?: number; player2Score?: number; rounds?: unknown[]; round?: number; roundResults?: unknown[] }}
        payoutTxSignature={game.escrow?.payoutTxSig || undefined}
      />
    );
  };

  return (
    <div className="min-h-screen bg-[#121212]">
      {/* Header */}
      <div className="bg-[#171717] border-b border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="secondary"
              onClick={() => router.push('/games')}
            >
              ← Back to Games
            </Button>

            <div className="flex items-center gap-4">
              {game.status === 'active' && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-[#a1a1a1]">LIVE</span>
                </div>
              )}
              {game.status === 'waiting' && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-[#a1a1a1]">WAITING</span>
                </div>
              )}

              <div className="bg-gradient-to-r from-korus-primary to-korus-secondary text-[#fafafa] px-4 py-2 rounded-lg font-bold">
                {game.wager} SOL
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-[#fafafa] mb-2">{getGameName()}</h1>

          {/* Players */}
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-[#171717] border border-white/[0.06] rounded-lg p-3">
              <div className="text-xs text-[#a1a1a1] mb-1">PLAYER 1</div>
              <div className="font-mono text-sm text-[#fafafa]">
                {game.player1DisplayName || `${game.player1.slice(0, 6)}...${game.player1.slice(-4)}`}
              </div>
              {isPlayer1 && (
                <div className="inline-block mt-1 px-2 py-0.5 bg-korus-primary text-[#fafafa] text-xs rounded">
                  YOU
                </div>
              )}
            </div>

            <div className="text-[#a1a1a1] font-bold">VS</div>

            <div className="flex-1 bg-[#171717] border border-white/[0.06] rounded-lg p-3">
              <div className="text-xs text-[#a1a1a1] mb-1">PLAYER 2</div>
              {game.player2 ? (
                <>
                  <div className="font-mono text-sm text-[#fafafa]">
                    {game.player2DisplayName || `${game.player2.slice(0, 6)}...${game.player2.slice(-4)}`}
                  </div>
                  {isPlayer2 && (
                    <div className="inline-block mt-1 px-2 py-0.5 bg-korus-secondary text-[#fafafa] text-xs rounded">
                      YOU
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-yellow-500">Waiting for opponent...</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Game Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Status Messages */}
        {game.status === 'waiting' && !isParticipant && (
          <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-center">
            <p className="text-yellow-500 mb-3">This game is waiting for an opponent!</p>
            <Button
              onClick={handleJoinGame}
              disabled={joining}
            >
              {joining ? 'Joining...' : `Join Game • ${game.wager} SOL`}
            </Button>
          </div>
        )}

        {game.status === 'active' && isMyTurn && (
          <div className="mb-6 p-4 bg-korus-primary/20 border border-korus-primary rounded-lg text-center">
            <p className="text-korus-primary font-bold">Your turn!</p>
          </div>
        )}

        {game.status === 'active' && !isMyTurn && isParticipant && (
          <div className="mb-6 p-4 bg-[#171717] border border-white/[0.06] rounded-lg text-center">
            <p className="text-[#a1a1a1]">Waiting for opponent&apos;s move...</p>
          </div>
        )}

        {isGameOver && (
          <div className={`mb-6 p-4 rounded-lg text-center border ${
            game.winner === publicKey?.toBase58()
              ? 'bg-green-500/20 border-green-500'
              : game.winner === 'draw'
              ? 'bg-[#171717] border-white/[0.06]'
              : 'bg-red-500/20 border-red-500'
          }`}>
            <p className={`font-bold text-lg ${
              game.winner === publicKey?.toBase58()
                ? 'text-green-500'
                : game.winner === 'draw'
                ? 'text-[#a1a1a1]'
                : 'text-red-500'
            }`}>
              {game.winner === 'draw'
                ? "Game ended in a draw!"
                : game.winner === publicKey?.toBase58()
                ? "You won! 🎉"
                : "You lost"}
            </p>
            {game.escrow?.payoutTxSig && parseFloat(game.wager) > 0 && (
              <a
                href={`https://explorer.solana.com/tx/${game.escrow.payoutTxSig}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm text-korus-primary hover:text-korus-primaryDark underline"
              >
                View payout transaction on Solana Explorer →
              </a>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {/* Game Board */}
        <div className="bg-[#171717] border border-white/[0.06] rounded-xl p-8">
          {game.gameType === 'tictactoe' && renderTicTacToe()}
          {game.gameType === 'connectfour' && renderConnectFour()}
          {game.gameType === 'rps' && renderRPS()}
        </div>
      </div>
    </div>
  );
}
