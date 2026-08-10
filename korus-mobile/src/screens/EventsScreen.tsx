import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { eventsAPI, type KorusEvent } from '../api/events';
import { notify } from '../notify';
import { theme } from '../theme';

interface Props {
  token?: string | null;
  header?: React.ReactElement;
}

export function EventsScreen({ token, header }: Props) {
  const [events, setEvents] = useState<KorusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState<string | null>(null);
  const [registered, setRegistered] = useState<Set<string>>(new Set());

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'refresh') setRefreshing(true);
    setError(null);
    try {
      const res = await eventsAPI.list();
      setEvents(res.events ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load('initial');
  }, [load]);

  const register = useCallback(
    async (event: KorusEvent) => {
      if (!token) {
        notify('Connect your wallet to register');
        return;
      }
      setRegistering(event.id);
      try {
        await eventsAPI.register(event.id, token);
        setRegistered((prev) => new Set(prev).add(event.id));
        // Reflect the new count without a full refetch.
        setEvents((prev) =>
          prev.map((e) =>
            e.id === event.id
              ? { ...e, registrationCount: (e.registrationCount ?? 0) + 1 }
              : e
          )
        );
        notify('Registered');
      } catch (err) {
        notify(err instanceof Error ? err.message : 'Could not register');
      } finally {
        setRegistering(null);
      }
    },
    [token]
  );

  return (
    <FlatList
      data={events}
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
              {error ?? 'No events right now. Whitelists and raffles show up here.'}
            </Text>
          </View>
        )
      }
      renderItem={({ item }) => (
        <EventCard
          event={item}
          busy={registering === item.id}
          registered={registered.has(item.id)}
          onRegister={() => register(item)}
        />
      )}
    />
  );
}

function EventCard({
  event,
  busy,
  registered,
  onRegister,
}: {
  event: KorusEvent;
  busy: boolean;
  registered: boolean;
  onRegister: () => void;
}) {
  const spotsLeft =
    event.maxSpots != null ? event.maxSpots - (event.registrationCount ?? 0) : null;
  const full = spotsLeft != null && spotsLeft <= 0;
  const closed = event.status && event.status !== 'active';

  return (
    <View style={styles.card}>
      {event.imageUrl ? (
        <Image source={{ uri: event.imageUrl }} style={styles.image} resizeMode="cover" />
      ) : null}

      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {event.title}
          </Text>
          {event.verified && <Text style={styles.verified}>✓</Text>}
        </View>

        {event.projectName ? (
          <Text style={styles.project}>{event.projectName}</Text>
        ) : null}

        {event.description ? (
          <Text style={styles.description} numberOfLines={3}>
            {event.description}
          </Text>
        ) : null}

        <View style={styles.statsRow}>
          <Text style={styles.stat}>{event.registrationCount ?? 0} registered</Text>
          {spotsLeft != null ? (
            <Text style={[styles.stat, full && styles.statFull]}>
              {full ? 'Full' : `${spotsLeft} spots left`}
            </Text>
          ) : null}
          {event.type ? <Text style={styles.type}>{event.type}</Text> : null}
        </View>

        <Pressable
          onPress={onRegister}
          disabled={busy || registered || full || Boolean(closed)}
          style={[
            styles.register,
            (registered || full || closed) && styles.registerDisabled,
          ]}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.registerText}>
              {registered
                ? 'Registered'
                : full
                  ? 'Full'
                  : closed
                    ? 'Closed'
                    : 'Register'}
            </Text>
          )}
        </Pressable>
      </View>
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    overflow: 'hidden',
  },
  image: { width: '100%', height: 140, backgroundColor: theme.background },
  cardBody: { padding: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: theme.text, fontSize: 16, fontWeight: '700', flex: 1 },
  verified: { color: theme.mint, fontSize: 14, fontWeight: '800' },
  project: { color: theme.mint, fontSize: 13, marginTop: 3 },
  description: {
    color: theme.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 },
  stat: { color: theme.textTertiary, fontSize: 12 },
  statFull: { color: theme.error },
  type: {
    color: theme.textTertiary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  register: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: theme.mint,
    alignItems: 'center',
  },
  registerDisabled: { opacity: 0.45 },
  registerText: { color: '#000', fontWeight: '700', fontSize: 14 },
});
