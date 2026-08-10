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
import { gamesAPI, gameLabel, type Game } from '../api/games';
import { relativeTime, shortAddress } from '../api/types';
import { theme } from '../theme';

interface Props {
  token?: string | null;
  currentWallet?: string | null;
  header?: React.ReactElement;
  onOpenProfile?: (wallet: string) => void;
}

export function GamesScreen({ token, currentWallet, header, onOpenProfile }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <FlatList
      data={games}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
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
        />
      )}
    />
  );
}

function GameRow({
  game,
  currentWallet,
  onOpenProfile,
}: {
  game: Game;
  currentWallet?: string | null;
  onOpenProfile?: (wallet: string) => void;
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
    <View style={[styles.card, isYours && styles.cardYours]}>
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
    </View>
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
});
