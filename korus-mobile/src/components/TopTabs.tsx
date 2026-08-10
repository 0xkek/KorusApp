import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

/**
 * The four browsable sections.
 *
 * Account-level destinations (profile, wallet, settings) live in the drawer
 * instead — six tabs across the Seeker's 400dp would be ~66dp each, too tight
 * to read or hit reliably.
 */
export type TopTab = 'home' | 'trending' | 'games' | 'events';

const TABS: { key: TopTab; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'trending', label: 'Trending' },
  { key: 'games', label: 'Games' },
  { key: 'events', label: 'Events' },
];

interface Props {
  active: TopTab;
  onChange: (tab: TopTab) => void;
}

export function TopTabs({ active, onChange }: Props) {
  return (
    <View style={styles.tabs}>
      {TABS.map((tab) => (
        <Pressable key={tab.key} onPress={() => onChange(tab.key)} style={styles.tab}>
          <Text style={[styles.tabText, active === tab.key && styles.tabTextActive]}>
            {tab.label}
          </Text>
          {active === tab.key && <View style={styles.underline} />}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabText: { color: theme.textTertiary, fontSize: 15, fontWeight: '600' },
  tabTextActive: { color: theme.text },
  underline: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: 48,
    borderRadius: 2,
    backgroundColor: theme.mint,
  },
});
