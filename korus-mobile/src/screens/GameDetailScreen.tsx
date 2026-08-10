import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { gamesAPI, gameLabel, type Game, type GameMove } from '../api/games';
import { shortAddress } from '../api/types';
import { notify } from '../notify';
import { theme, useTheme } from '../theme';

const RED = '#ef4444';
const YELLOW = '#fbbf24';

interface Props {
  gameId: string;
  token?: string | null;
  currentWallet?: string | null;
  onBack: () => void;
}

export function GameDetailScreen({ gameId, token, currentWallet, onBack }: Props) {
  const t = useTheme();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await gamesAPI.get(gameId);
      if (mounted.current) setGame(res.game);
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : 'Could not load the game');
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    mounted.current = true;
    load();
    // There is no socket connection on mobile, so poll for the opponent's
    // move. 5s is a compromise between feeling live and battery.
    const timer = setInterval(load, 5000);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [load]);

  const play = useCallback(
    async (move: GameMove) => {
      if (!token || !game || busy) return;
      setBusy(true);
      setError(null);
      try {
        const res = await gamesAPI.move(game.id, move, token);
        if (res.game) setGame(res.game);
        else await load();
      } catch (err) {
        // Invalid moves are rejected by the backend with a readable reason
        // ("Not your turn", "Column is full"), so surface it as-is.
        notify(err instanceof Error ? err.message : 'Move rejected');
      } finally {
        setBusy(false);
      }
    },
    [token, game, busy, load]
  );

  const isPlayer =
    currentWallet &&
    game &&
    (game.player1 === currentWallet || game.player2 === currentWallet);
  const yourTurn = Boolean(currentWallet && game?.currentTurn === currentWallet);
  const finished = game?.status === 'completed';
  const waiting = !game?.player2;

  return (
    <View style={[styles.root, { backgroundColor: t.background }]}>
      <View style={[styles.navbar, { borderBottomColor: t.border, backgroundColor: t.background }]}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={[styles.back, { color: t.mint }]}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: t.text }]}>
          {game ? gameLabel(game.gameType) : 'Game'}
        </Text>
        <View style={{ width: 54 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.mint} />
        </View>
      ) : !game ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? 'Game not found'}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Status
            game={game}
            currentWallet={currentWallet}
            yourTurn={yourTurn}
            finished={finished}
            waiting={waiting}
          />

          {game.gameType === 'tictactoe' ? (
            <TicTacToeBoard
              state={game.gameState}
              disabled={!isPlayer || !yourTurn || busy || finished || waiting}
              onPlay={(index) => play({ index })}
            />
          ) : game.gameType === 'connectfour' ? (
            <ConnectFourBoard
              state={game.gameState}
              disabled={!isPlayer || !yourTurn || busy || finished || waiting}
              onPlay={(column) => play({ column })}
            />
          ) : (
            <RpsBoard
              game={game}
              currentWallet={currentWallet}
              disabled={!isPlayer || busy || finished || waiting}
              onPlay={(choice) => play({ choice })}
            />
          )}

          {!isPlayer && !waiting ? (
            <Text style={styles.spectator}>You are watching this game.</Text>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function Status({
  game,
  currentWallet,
  yourTurn,
  finished,
  waiting,
}: {
  game: Game;
  currentWallet?: string | null;
  yourTurn: boolean;
  finished: boolean;
  waiting: boolean;
}) {
  const p1 = game.player1DisplayName || shortAddress(game.player1);
  const p2 = game.player2
    ? game.player2DisplayName || shortAddress(game.player2)
    : null;

  let message: string;
  if (waiting) message = 'Waiting for an opponent to join';
  else if (finished) {
    if (!game.winner) message = 'Draw';
    else if (game.winner === currentWallet) message = 'You won';
    else
      message = `${game.winner === game.player1 ? p1 : p2} won`;
  } else if (yourTurn) message = 'Your turn';
  else message = `Waiting for ${game.currentTurn === game.player1 ? p1 : p2}`;

  return (
    <View style={styles.status}>
      <Text style={[styles.statusText, yourTurn && styles.statusYours]}>
        {message}
      </Text>
      <Text style={styles.players}>
        {p1} vs {p2 ?? '—'}
      </Text>
    </View>
  );
}

/** Flat 9-array of 'X' | 'O' | null. */
function TicTacToeBoard({
  state,
  disabled,
  onPlay,
}: {
  state: Game['gameState'];
  disabled: boolean;
  onPlay: (index: number) => void;
}) {
  const board = (state?.board as (string | null)[] | undefined) ?? Array(9).fill(null);

  return (
    <View style={styles.tttBoard}>
      {board.map((cell, index) => (
        <Pressable
          key={index}
          onPress={() => onPlay(index)}
          disabled={disabled || cell !== null}
          style={styles.tttCell}
        >
          <Text style={[styles.tttMark, cell === 'X' ? styles.markX : styles.markO]}>
            {cell ?? ''}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** 6 rows x 7 columns of 'red' | 'yellow' | null. Tapping drops into a column. */
function ConnectFourBoard({
  state,
  disabled,
  onPlay,
}: {
  state: Game['gameState'];
  disabled: boolean;
  onPlay: (column: number) => void;
}) {
  const board =
    (state?.board as (string | null)[][] | undefined) ??
    Array(6)
      .fill(null)
      .map(() => Array(7).fill(null));

  return (
    <View>
      {/* Column buttons: a piece drops to the lowest free row, so the target
          is the column rather than an individual cell. */}
      <View style={styles.c4Buttons}>
        {Array.from({ length: 7 }).map((_, column) => {
          const full = board.every((row) => row[column] !== null);
          return (
            <Pressable
              key={column}
              onPress={() => onPlay(column)}
              disabled={disabled || full}
              style={[styles.c4Button, (disabled || full) && styles.c4ButtonOff]}
            >
              <Text style={styles.c4ButtonText}>▾</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.c4Board}>
        {board.map((row, r) => (
          <View key={r} style={styles.c4Row}>
            {row.map((cell, c) => (
              <View
                key={c}
                style={[
                  styles.c4Cell,
                  cell === 'red' && { backgroundColor: RED },
                  cell === 'yellow' && { backgroundColor: YELLOW },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

/** Simultaneous, played in rounds — there is no currentTurn. */
function RpsBoard({
  game,
  currentWallet,
  disabled,
  onPlay,
}: {
  game: Game;
  currentWallet?: string | null;
  disabled: boolean;
  onPlay: (choice: 'rock' | 'paper' | 'scissors') => void;
}) {
  const state = game.gameState;
  const round = state?.round ?? 1;
  const playerMoves = state?.playerMoves ?? {};
  const alreadyPlayed = Boolean(currentWallet && playerMoves[currentWallet]);
  const results = state?.roundResults ?? [];

  return (
    <View>
      <Text style={styles.roundLabel}>Round {round}</Text>

      {results.length > 0 ? (
        <Text style={styles.rounds}>
          {results
            .map((r, i) => {
              const w = r?.winner;
              if (!w) return `R${i + 1} draw`;
              return `R${i + 1} ${w === currentWallet ? 'you' : 'them'}`;
            })
            .join(' · ')}
        </Text>
      ) : null}

      <View style={styles.rpsRow}>
        {(['rock', 'paper', 'scissors'] as const).map((choice) => (
          <Pressable
            key={choice}
            onPress={() => onPlay(choice)}
            disabled={disabled || alreadyPlayed}
            style={[
              styles.rpsButton,
              (disabled || alreadyPlayed) && styles.rpsButtonOff,
              playerMoves[currentWallet ?? ''] === choice && styles.rpsButtonPicked,
            ]}
          >
            <Text style={styles.rpsEmoji}>
              {choice === 'rock' ? '✊' : choice === 'paper' ? '✋' : '✌️'}
            </Text>
            <Text style={styles.rpsLabel}>{choice}</Text>
          </Pressable>
        ))}
      </View>

      {alreadyPlayed ? (
        <Text style={styles.rpsWaiting}>
          Choice locked in — waiting for your opponent.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  back: { color: theme.mint, fontSize: 16, fontWeight: '600' },
  navTitle: { color: theme.text, fontSize: 16, fontWeight: '700' },
  center: { paddingVertical: 60, alignItems: 'center' },
  errorText: { color: theme.error, textAlign: 'center', paddingHorizontal: 24 },
  content: { padding: 16, alignItems: 'center' },
  status: { alignItems: 'center', marginBottom: 20 },
  statusText: { color: theme.text, fontSize: 17, fontWeight: '700' },
  statusYours: { color: theme.mint },
  players: { color: theme.textTertiary, fontSize: 13, marginTop: 5 },
  spectator: { color: theme.textTertiary, fontSize: 13, marginTop: 20 },

  // Tic-tac-toe
  tttBoard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 300,
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tttCell: {
    width: 100,
    height: 100,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tttMark: { fontSize: 44, fontWeight: '800' },
  markX: { color: theme.mint },
  markO: { color: YELLOW },

  // Connect four
  c4Buttons: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  c4Button: {
    width: 40,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  c4ButtonOff: { opacity: 0.3 },
  c4ButtonText: { color: theme.mint, fontSize: 14, fontWeight: '800' },
  c4Board: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  c4Row: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  c4Cell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.background,
  },

  // RPS
  roundLabel: { color: theme.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  rounds: {
    color: theme.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  rpsRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  rpsButton: {
    width: 92,
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  rpsButtonOff: { opacity: 0.4 },
  rpsButtonPicked: { borderColor: theme.mint, backgroundColor: 'rgba(67,233,123,0.08)' },
  rpsEmoji: { fontSize: 34 },
  rpsLabel: { color: theme.textSecondary, fontSize: 12, marginTop: 6 },
  rpsWaiting: {
    color: theme.textTertiary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
  },
});
