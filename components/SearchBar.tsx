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
          colors={[
            'rgba(30, 30, 30, 0.95)',
            'rgba(20, 20, 20, 0.98)',
            'rgba(15, 15, 15, 0.99)',
          ]}
          style={styles.searchGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.searchIcon}>
            <Text style={styles.searchIconText}>🔍</Text>
          </View>
          
          <TextInput
            style={[styles.searchInput, isFocused && styles.searchInputFocused]}
            value={query}
            onChangeText={handleQueryChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onSubmitEditing={handleSubmit}
            placeholder={placeholder}
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            selectionColor="#43e97b"
          />
          
          {query.length > 0 && (
            <View style={styles.inputActions}>
              <TouchableOpacity onPress={handleSubmit} style={styles.searchSubmitButton}>
                <Text style={styles.searchSubmitText}>Search</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>✕</Text>
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
                    colors={[
                      'rgba(30, 30, 30, 0.95)',
                      'rgba(20, 20, 20, 0.98)',
                      'rgba(15, 15, 15, 0.99)',
                    ]}
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
            colors={[
              'rgba(30, 30, 30, 0.95)',
              'rgba(20, 20, 20, 0.98)',
              'rgba(15, 15, 15, 0.99)',
            ]}
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
                  <Text style={styles.historyIcon}>🕐</Text>
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

const styles = StyleSheet.create({
  container: {
    zIndex: 100,
  },
  searchContainer: {
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(67, 233, 123, 0.8)',
    shadowColor: '#43e97b',
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
  },
  searchIcon: {
    marginRight: 12,
  },
  searchIconText: {
    fontSize: FontSizes.lg,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    color: '#ffffff',
    paddingVertical: 4,
  },
  searchInputFocused: {
    color: '#43e97b',
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchSubmitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(67, 233, 123, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.4)',
  },
  searchSubmitText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.semiBold,
    color: '#43e97b',
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearButtonText: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.6)',
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
    borderColor: 'rgba(67, 233, 123, 0.3)',
    shadowColor: '#43e97b',
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
    borderColor: 'rgba(67, 233, 123, 0.2)',
  },
  categoryText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: '#ffffff',
    textShadowColor: 'rgba(67, 233, 123, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  historyContainer: {
    marginHorizontal: 20,
    marginTop: 5,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.2)',
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
    color: 'rgba(255, 255, 255, 0.8)',
  },
  clearHistoryButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearHistoryText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
    color: '#43e97b',
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
    fontSize: FontSizes.sm,
    marginRight: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  historyText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    flex: 1,
  },
});