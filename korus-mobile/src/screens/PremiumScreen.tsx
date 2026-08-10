import { useCallback, useEffect, useState, useMemo} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  subscriptionAPI,
  TREASURY_WALLET,
  type SubscriptionStatus,
  type SubscriptionTier,
} from '../api/subscription';
import { isUserDeclined, sendSol } from '../wallet/solTransfer';
import { usersAPI } from '../api/users';
import { notify } from '../notify';
import { useTheme , type Theme } from '../theme';

type Plan = 'monthly' | 'yearly';

/**
 * Theme colours, matching korus-web's settings page. Mint is free; the rest
 * are premium. Stored as the profile's themeColor, which is what renders the
 * avatar fallback and accents.
 */
const PREMIUM_THEMES = [
  { id: 'mint', name: 'Mint Fresh', color: '#43e97b' },
  { id: 'purple', name: 'Royal Purple', color: '#9945FF' },
  { id: 'blue', name: 'Blue Sky', color: '#00D4FF' },
  { id: 'gold', name: 'Premium Gold', color: '#FFD700' },
  { id: 'cherry', name: 'Cherry Blossom', color: '#FF6B9D' },
  { id: 'cyber', name: 'Cyber Neon', color: '#00FFF0' },
];

interface Props {
  token: string;
  walletAddress: string;
  /** Current themeColor, so the active swatch is marked on open. */
  initialThemeColor?: string | null;
  onBack: () => void;
  onSubscribed: () => void;
  onThemeChanged?: () => void;
  onEditProfile?: () => void;
}

export function PremiumScreen({
  token,
  walletAddress,
  initialThemeColor,
  onBack,
  onSubscribed,
  onThemeChanged,
  onEditProfile,
}: Props) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [pricing, setPricing] = useState<Record<Plan, SubscriptionTier> | null>(null);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [plan, setPlan] = useState<Plan>('yearly');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orphanSignature, setOrphanSignature] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string | null>(initialThemeColor ?? null);
  const [savingTheme, setSavingTheme] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [priceRes, statusRes] = await Promise.allSettled([
        subscriptionAPI.getPricing(),
        subscriptionAPI.getStatus(token),
      ]);
      if (cancelled) return;
      if (priceRes.status === 'fulfilled') setPricing(priceRes.value.pricing);
      if (statusRes.status === 'fulfilled') setStatus(statusRes.value);
      if (priceRes.status === 'rejected') setError('Could not load pricing');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const subscribe = useCallback(async () => {
    if (!pricing || busy) return;
    const amount = pricing[plan].price;

    setBusy(true);
    setError(null);
    setOrphanSignature(null);

    try {
      // Pay first, then report. The backend verifies the signature on mainnet
      // before activating anything.
      const signature = await sendSol({
        senderWallet: walletAddress,
        recipientWallet: TREASURY_WALLET,
        amountSol: amount,
      });

      try {
        await subscriptionAPI.subscribe(plan, signature, token);
        onSubscribed();
        Alert.alert('Premium active', `You're subscribed. Thanks for supporting Korus.`);
      } catch (recordErr) {
        // The SOL has moved but premium was not activated. Never hide this.
        setOrphanSignature(signature);
        setError(
          recordErr instanceof Error
            ? `Payment sent but not activated: ${recordErr.message}`
            : 'Payment sent but Korus could not activate premium.'
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(isUserDeclined(message) ? null : message);
    } finally {
      setBusy(false);
    }
  }, [pricing, plan, busy, walletAddress, token, onSubscribed]);

  const isActive = Boolean(status?.isPremium || status?.hasSubscription);

  const applyTheme = useCallback(
    async (color: string) => {
      setSavingTheme(true);
      try {
        await usersAPI.updateProfile({ themeColor: color }, token);
        setCurrentTheme(color);
        onThemeChanged?.();
        notify('Theme updated');
      } catch (err) {
        notify(err instanceof Error ? err.message : 'Could not save the theme');
      } finally {
        setSavingTheme(false);
      }
    },
    [token, onThemeChanged]
  );

  return (
    <View style={[styles.root, { backgroundColor: t.background }]}>
      <View style={[styles.navbar, { borderBottomColor: t.border, backgroundColor: t.background }]}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={[styles.back, { color: t.mint }]}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: t.text }]}>Premium</Text>
        <View style={{ width: 54 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.mint} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {isActive ? (
            <>
              <View style={styles.activeCard}>
                <Text style={styles.activeTitle}>★ Premium active</Text>
                {status?.daysUntilExpiration != null ? (
                  <Text style={styles.activeMeta}>
                    {status.daysUntilExpiration} day
                    {status.daysUntilExpiration === 1 ? '' : 's'} remaining
                    {status.subscriptionType ? ` · ${status.subscriptionType}` : ''}
                  </Text>
                ) : null}
                <Text style={styles.activeNote}>
                  This does not renew automatically — it expires and you drop
                  back to standard.
                </Text>
              </View>

              {/* The perks are only useful if you can reach them from here. */}
              <Text style={styles.perksLabel}>Your premium perks</Text>

              <Text style={styles.perkTitle}>Theme colour</Text>
              <View style={styles.themes}>
                {PREMIUM_THEMES.map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => applyTheme(t.color)}
                    disabled={savingTheme}
                    style={[
                      styles.theme,
                      { borderColor: t.color },
                      currentTheme === t.color && styles.themeActive,
                    ]}
                  >
                    <View style={[styles.themeSwatch, { backgroundColor: t.color }]} />
                    <Text style={styles.themeName}>{t.name}</Text>
                    {currentTheme === t.color ? (
                      <Text style={[styles.themeCheck, { color: t.color }]}>✓</Text>
                    ) : null}
                  </Pressable>
                ))}
              </View>

              <Pressable style={styles.perkRow} onPress={onEditProfile}>
                <View style={styles.perkText}>
                  <Text style={styles.perkRowTitle}>Change your username</Text>
                  <Text style={styles.perkRowHint}>
                    Free accounts can only set this once. Premium can change it
                    any time.
                  </Text>
                </View>
                <Text style={styles.perkChevron}>›</Text>
              </Pressable>

              <View style={styles.perkRow}>
                <View style={styles.perkText}>
                  <Text style={styles.perkRowTitle}>Premium badge</Text>
                  <Text style={styles.perkRowHint}>
                    The ★ next to your name across Korus.
                  </Text>
                </View>
                <Text style={styles.star}>★</Text>
              </View>

              <View style={styles.perkRow}>
                <View style={styles.perkText}>
                  <Text style={styles.perkRowTitle}>Sponsored posts hidden</Text>
                  <Text style={styles.perkRowHint}>
                    Applied automatically while premium is active.
                  </Text>
                </View>
              </View>
            </>
          ) : null}

          {orphanSignature ? (
            <View style={styles.warning}>
              <Text style={styles.warningTitle}>Payment sent, not activated</Text>
              <Text style={styles.warningText}>
                Your SOL left your wallet but Korus could not activate premium.
                Keep this signature — it proves the payment.
              </Text>
              <Text style={styles.signature} selectable>
                {orphanSignature}
              </Text>
            </View>
          ) : null}

          {error && !orphanSignature ? <Text style={styles.error}>{error}</Text> : null}

          {pricing ? (
            <>
              {(['yearly', 'monthly'] as Plan[]).map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPlan(p)}
                  style={[styles.plan, plan === p && styles.planSelected]}
                >
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>
                      {p === 'yearly' ? 'Yearly' : 'Monthly'}
                    </Text>
                    <Text style={styles.planPrice}>{pricing[p].price} SOL</Text>
                  </View>
                  <Text style={styles.planMeta}>
                    {pricing[p].duration}
                    {pricing[p].savings ? ` · ${pricing[p].savings}` : ''}
                  </Text>
                  {plan === p && (
                    <View style={styles.features}>
                      {pricing[p].features.map((f) => (
                        <Text key={f} style={styles.feature}>
                          · {f}
                        </Text>
                      ))}
                    </View>
                  )}
                </Pressable>
              ))}

              <Pressable
                onPress={subscribe}
                disabled={busy}
                style={[styles.cta, busy && styles.ctaDisabled]}
              >
                {busy ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.ctaText}>
                    {isActive ? 'Extend' : 'Subscribe'} · {pricing[plan].price} SOL
                  </Text>
                )}
              </Pressable>

              <Text style={styles.disclaimer}>
                Payment is a one-off SOL transfer on mainnet — it does not renew
                automatically, and it cannot be reversed.
              </Text>
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
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
  content: { padding: 16, paddingBottom: 40 },
  activeCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.mint,
    backgroundColor: 'rgba(67,233,123,0.06)',
    marginBottom: 16,
  },
  activeTitle: { color: theme.mint, fontSize: 16, fontWeight: '700' },
  activeMeta: { color: theme.textTertiary, fontSize: 13, marginTop: 4 },
  activeNote: { color: theme.textTertiary, fontSize: 12, marginTop: 8, lineHeight: 17 },
  perksLabel: {
    color: theme.textTertiary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 12,
  },
  perkTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  themes: { gap: 8, marginBottom: 20 },
  theme: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    opacity: 0.75,
  },
  themeActive: { opacity: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  themeSwatch: { width: 26, height: 26, borderRadius: 13 },
  themeName: { color: theme.text, fontSize: 14, fontWeight: '600', flex: 1 },
  themeCheck: { fontSize: 16, fontWeight: '800' },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 10,
  },
  perkText: { flex: 1 },
  perkRowTitle: { color: theme.text, fontSize: 14, fontWeight: '600' },
  perkRowHint: { color: theme.textTertiary, fontSize: 12, marginTop: 3, lineHeight: 17 },
  perkChevron: { color: theme.textTertiary, fontSize: 20 },
  star: { color: '#fbbf24', fontSize: 18 },
  plan: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 12,
  },
  planSelected: { borderColor: theme.mint, backgroundColor: 'rgba(67,233,123,0.04)' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { color: theme.text, fontSize: 17, fontWeight: '700' },
  planPrice: { color: theme.mint, fontSize: 17, fontWeight: '800' },
  planMeta: { color: theme.textTertiary, fontSize: 13, marginTop: 4 },
  features: { marginTop: 12, gap: 5 },
  feature: { color: theme.textSecondary, fontSize: 13, lineHeight: 18 },
  cta: {
    marginTop: 8,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: theme.mint,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: '#000', fontWeight: '800', fontSize: 15 },
  disclaimer: {
    color: theme.textTertiary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
    textAlign: 'center',
  },
  error: {
    color: theme.error,
    fontSize: 13,
    marginBottom: 14,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.error,
    lineHeight: 18,
  },
  warning: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  warningTitle: { color: '#f59e0b', fontWeight: '700', fontSize: 14 },
  warningText: { color: theme.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 18 },
  signature: { color: theme.textTertiary, fontSize: 11, marginTop: 8 },
});
