import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { gamesAPI, gameLabel, type Game, type GameType } from '../api/games';
import { relativeTime, shortAddress } from '../api/types';
import { notify } from '../notify';
import { theme } from '../theme';

interface Props {
  token?: string | null;
  currentWallet?: string | null;
  header?: React.ReactElement;
  onOpenProfile?: (wallet: string) => void;
  onOpenGame?: (gameId: string) => void;
}

export function GamesScreen({
  token,
  currentWallet,
  header,
  onOpenProfile,
  onOpenGame,
}: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'refresh') setRefreshing(true);
    setError(null);
    try {
      const res = await gamesAPI.list();
      setGames(res.games ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load games');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load('initial');
  }, [load]);

  const create = useCallback(
    async (type: GameType) => {
      if (!token) {
        notify('Connect your wallet to start a game');
        return;
      }
      setCreating(true);
      try {
        await gamesAPI.create(type, token);
        notify(`${gameLabel(type)} created — waiting for an opponent`);
        await load('refresh');
      } catch (err) {
        notify(err instanceof Error ? err.message : 'Could not create the game');
      } finally {
        setCreating(false);
      }
    },
    [token, load]
  );

  const join = useCallback(
    async (game: Game) => {
      if (!token) {
        notify('Connect your wallet to join');
        return;
      }
      setJoining(game.id);
      try {
        await gamesAPI.join(game.id, token);
        notify('Joined');
        await load('refresh');
      } catch (err) {
        notify(err instanceof Error ? err.message : 'Could not join');
      } finally {
        setJoining(null);
      }
    },
    [token, load]
  );

  return (
    <FlatList
      data={games}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <>
          {header}
          {token ? (
            <View style={styles.newGame}>
              <Text style={styles.newGameLabel}>Start a game</Text>
              <View style={styles.newGameRow}>
                {(['connectfour', 'tictactoe', 'rps'] as GameType[]).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => create(type)}
                    disabled={creating}
                    style={[styles.newGameButton, creating && styles.disabled]}
                  >
                    <Text style={styles.newGameButtonText}>{gameLabel(type)}</Text>
                  </Pressable>
                ))}
              </View>
              {/* Wagered games stay disabled, so these are free to play. */}
              <Text style={styles.newGameHint}>Free to play</Text>
            </View>
          ) : null}
        </>
      }
      style={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load('refresh')}
          tintColor={theme.mint}
        />
      }
      ListEmptyComponent={
        loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.mint} />
          </View>
        ) : (
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {error ?? 'No games yet. Games started on korus.fun show up here.'}
            </Text>
          </View>
        )
      }
      renderItem={({ item }) => (
        <GameRow
          game={item}
          currentWallet={currentWallet}
          onOpenProfile={onOpenProfile}
          // Only offer to join a game that is open and not your own.
          onJoin={
            token && !item.player2 && item.player1 !== currentWallet
              ? () => join(item)
              : undefined
          }
          joining={joining === item.id}
          onOpen={onOpenGame ? () => onOpenGame(item.id) : undefined}
        />
      )}
    />
  );
}

function GameRow({
  game,
  currentWallet,
  onOpenProfile,
  onJoin,
  joining,
  onOpen,
}: {
  game: Game;
  currentWallet?: string | null;
  onOpenProfile?: (wallet: string) => void;
  onJoin?: () => void;
  joining?: boolean;
  onOpen?: () => void;
}) {
  const p1 = game.player1DisplayName || shortAddress(game.player1);
  const p2 = game.player2
    ? game.player2DisplayName || shortAddress(game.player2)
    : null;

  const isYours =
    currentWallet && (game.player1 === currentWallet || game.player2 === currentWallet);
  const yourTurn = currentWallet && game.currentTurn === currentWallet;
  // Older rows predate wagering being disabled, so show it only when set.
  const wager = Number(game.wager) || 0;

  return (
    <Pressable
      onPress={onOpen}
      disabled={!onOpen}
      style={({ pressed }) => [
        styles.card,
        isYours && styles.cardYours,
        pressed && onOpen ? styles.cardPressed : null,
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.type}>{gameLabel(game.gameType)}</Text>
        <StatusPill status={game.status} yourTurn={Boolean(yourTurn)} />
      </View>

      <View style={styles.players}>
        <Pressable
          onPress={onOpenProfile ? () => onOpenProfile(game.player1) : undefined}
          disabled={!onOpenProfile}
        >
          <Text style={styles.player}>{p1}</Text>
        </Pressable>
        <Text style={styles.vs}>vs</Text>
        {p2 ? (
          <Pressable
            onPress={
              onOpenProfile && game.player2
                ? () => onOpenProfile(game.player2!)
                : undefined
            }
            disabled={!onOpenProfile}
          >
            <Text style={styles.player}>{p2}</Text>
          </Pressable>
        ) : (
          <Text style={styles.waiting}>waiting for an opponent</Text>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.meta}>{relativeTime(game.createdAt)}</Text>
        {wager > 0 && <Text style={styles.wager}>{wager} SOL</Text>}
        {game.winner ? (
          <Text style={styles.winner}>
            Won by{' '}
            {game.winner === game.player1
              ? p1
              : game.winner === game.player2
                ? p2
                : shortAddress(game.winner)}
          </Text>
        ) : null}
      </View>

      {onJoin ? (
        <Pressable onPress={onJoin} disabled={joining} style={styles.join}>
          {joining ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.joinText}>Join game</Text>
          )}
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function StatusPill({ status, yourTurn }: { status: string; yourTurn: boolean }) {
  if (yourTurn) {
    return (
      <View style={[styles.pill, styles.pillTurn]}>
        <Text style={styles.pillTurnText}>Your turn</Text>
      </View>
    );
  }
  const label =
    status === 'waiting'
      ? 'Open'
      : status === 'active'
        ? 'In progress'
        : status === 'completed'
          ? 'Finished'
          : status;
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: theme.background },
  center: { paddingVertical: 60, alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { color: theme.textTertiary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  cardYours: { borderColor: theme.mint },
  cardPressed: { opacity: 0.75 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  type: { color: theme.text, fontSize: 15, fontWeight: '700' },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  pillText: { color: theme.textTertiary, fontSize: 11, fontWeight: '600' },
  pillTurn: { backgroundColor: theme.mint, borderColor: theme.mint },
  pillTurnText: { color: '#000', fontSize: 11, fontWeight: '800' },
  players: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  player: { color: theme.textSecondary, fontSize: 14, fontWeight: '600' },
  vs: { color: theme.textTertiary, fontSize: 12 },
  waiting: { color: theme.textTertiary, fontSize: 13, fontStyle: 'italic' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  meta: { color: theme.textTertiary, fontSize: 12 },
  wager: { color: '#f59e0b', fontSize: 12, fontWeight: '700' },
  winner: { color: theme.mint, fontSize: 12, fontWeight: '600' },
  join: {
    marginTop: 12,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: theme.mint,
    alignItems: 'center',
  },
  joinText: { color: '#000', fontWeight: '700', fontSize: 14 },
  newGame: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  newGameLabel: { color: theme.text, fontSize: 14, fontWeight: '700' },
  newGameRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  newGameButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.mint,
    alignItems: 'center',
  },
  newGameButtonText: {
    color: theme.mint,
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
  newGameHint: { color: theme.textTertiary, fontSize: 11, marginTop: 10 },
  disabled: { opacity: 0.5 },
});
