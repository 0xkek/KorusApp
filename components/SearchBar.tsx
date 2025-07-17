import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View, 
  FlatList,
  Keyboard
} from 'react-native';
import { Fonts, FontSizes } from '../constants/Fonts';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onCategoryFilter?: (category: string | null) => void;
  placeholder?: string;
  showSuggestions?: boolean;
  searchHistory?: string[];
  onClearHistory?: () => void;
  showCategoryFilter?: boolean;
}

export default function SearchBar({ 
  onSearch, 
  onCategoryFilter, 
  placeholder = "Search posts...",
  showSuggestions = true,
  searchHistory = [],
  onClearHistory,
  showCategoryFilter = false
}: SearchBarProps) {
  const { colors, isDarkMode, gradients } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDarkMode), [colors, isDarkMode]);
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Categories for filtering
  const categories = ['All', 'Career', 'Mental Health', 'Hobbies', 'Lifestyle', 'Tech', 'Finance'];

  const handleQueryChange = (text: string) => {
    setQuery(text);
    // Don't auto-search, only search on enter or submit
  };

  let searchTimeout: NodeJS.Timeout | number;

  const handleSubmit = () => {
    if (query.trim()) {
      onSearch(query.trim());
      Keyboard.dismiss();
      setShowHistory(false);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (searchHistory.length > 0) {
      setShowHistory(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Delay hiding history to allow tap on suggestions
    setTimeout(() => setShowHistory(false), 150);
  };

  const handleSuggestionPress = (suggestion: string) => {
    setQuery(suggestion);
    onSearch(suggestion);
    setShowHistory(false);
    Keyboard.dismiss();
  };

  const handleCategoryPress = (category: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCategoryFilter?.(category === 'All' ? null : category.toLowerCase());
  };

  const clearSearch = () => {
    setQuery('');
    onSearch('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <BlurView intensity={25} style={styles.searchContainer}>
        <LinearGradient
          colors={gradients.surface}
          style={styles.searchGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.searchIcon}>
            <Ionicons 
              name="search" 
              size={20} 
              color={colors.textSecondary}
            />
          </View>
          
          <TextInput
            style={[styles.searchInput, isFocused && styles.searchInputFocused]}
            value={query}
            onChangeText={handleQueryChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onSubmitEditing={handleSubmit}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            selectionColor={colors.primary}
          />
          
          {query.length > 0 && (
            <View style={styles.inputActions}>
              <TouchableOpacity onPress={handleSubmit} style={styles.searchSubmitButton}>
                <Text style={styles.searchSubmitText}>Search</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Ionicons 
                  name="close" 
                  size={18} 
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>
      </BlurView>

      {/* Category Filter Pills - Only show if enabled */}
      {showCategoryFilter && (
        <View style={styles.categoryContainer}>
          <FlatList
            data={categories}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.categoryPill}
                onPress={() => handleCategoryPress(item)}
                activeOpacity={0.8}
              >
                <BlurView intensity={20} style={styles.categoryBlur}>
                  <LinearGradient
                    colors={gradients.surface}
                    style={styles.categoryGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.categoryText}>{item}</Text>
                  </LinearGradient>
                </BlurView>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.categoryList}
          />
        </View>
      )}

      {/* Search History/Suggestions */}
      {showHistory && searchHistory.length > 0 && (
        <BlurView intensity={40} style={styles.historyContainer}>
          <LinearGradient
            colors={gradients.surface}
            style={styles.historyGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Recent Searches</Text>
              {onClearHistory && (
                <TouchableOpacity onPress={onClearHistory} style={styles.clearHistoryButton}>
                  <Text style={styles.clearHistoryText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <FlatList
              data={searchHistory.slice(0, 5)} // Show last 5 searches
              keyExtractor={(item, index) => `${item}-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.historyItem}
                  onPress={() => handleSuggestionPress(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name="time-outline" 
                    size={16} 
                    color={colors.textSecondary}
                    style={styles.historyIcon}
                  />
                  <Text style={styles.historyText}>{item}</Text>
                </TouchableOpacity>
              )}
              style={styles.historyList}
              showsVerticalScrollIndicator={false}
            />
          </LinearGradient>
        </BlurView>
      )}
    </View>
  );
}

const createStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  container: {
    zIndex: 100,
  },
  searchContainer: {
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.primary + 'CC',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  searchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    color: colors.text,
    paddingVertical: 4,
  },
  searchInputFocused: {
    color: colors.primary,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchSubmitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary + '33',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '66',
  },
  searchSubmitText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    color: colors.primary,
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryContainer: {
    marginBottom: 10,
  },
  categoryList: {
    paddingHorizontal: 20,
  },
  categoryPill: {
    marginRight: 12,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primary + '4D',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryBlur: {
    borderRadius: 20,
  },
  categoryGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  categoryText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: colors.text,
    textShadowColor: colors.primary + '66',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  historyContainer: {
    marginHorizontal: 20,
    marginTop: 5,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primary + '33',
    maxHeight: 200,
  },
  historyGradient: {
    padding: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: colors.text,
  },
  clearHistoryButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearHistoryText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
    color: colors.primary,
  },
  historyList: {
    maxHeight: 120,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  historyIcon: {
    marginRight: 12,
  },
  historyText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: colors.textSecondary,
    flex: 1,
  },
});