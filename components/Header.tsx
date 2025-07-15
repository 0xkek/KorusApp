import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Fonts, FontSizes } from '../constants/Fonts';

interface HeaderProps {
  onComposePress?: () => void;
  onCategoryChange?: (category: string | null, subcategory: string | null) => void;
  isCollapsed?: boolean; // New prop to control collapsed state
}

export default function Header({ onComposePress, onCategoryChange, isCollapsed = false }: HeaderProps) {
  const { colors, isDarkMode } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  
  // ScrollView refs for programmatic scrolling
  const categoryScrollRef = useRef<ScrollView>(null);
  const subScrollRef = useRef<ScrollView>(null);
  
  // Header slide-up animation
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Slide the entire header up/down
    Animated.timing(headerTranslateY, {
      toValue: isCollapsed ? -200 : 0, // Slide up 200px when collapsed
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isCollapsed]);
  
  const categories = [
    'CAREER', 'HEALTH', 'RELATIONSHIPS', 'FINANCE', 'TECHNOLOGY', 
    'LIFESTYLE', 'EDUCATION', 'ENTERTAINMENT', 'SPORTS', 'TRAVEL', 
    'BUSINESS', 'POLITICS'
  ];
  
  const subcategories: { [key: string]: string[] } = {
    CAREER: ['Job Search', 'Interviews', 'Networking', 'Salary Negotiations'],
    HEALTH: ['Mental Health', 'Fitness', 'Nutrition', 'Medical'],
    RELATIONSHIPS: ['Dating', 'Marriage', 'Family', 'Friendship'],
    FINANCE: ['Investing', 'Budgeting', 'Crypto', 'Real Estate'],
    TECHNOLOGY: ['AI/ML', 'Web Dev', 'Mobile Apps', 'Blockchain'],
    LIFESTYLE: ['Fashion', 'Home', 'Food', 'Travel'],
    EDUCATION: ['College', 'Online Learning', 'Certifications', 'Skills'],
    ENTERTAINMENT: ['Movies', 'Music', 'Gaming', 'Books'],
    SPORTS: ['Football', 'Basketball', 'Soccer', 'Fitness'],
    TRAVEL: ['Destinations', 'Tips', 'Budget Travel', 'Solo Travel'],
    BUSINESS: ['Startups', 'Marketing', 'Leadership', 'Strategy'],
    POLITICS: ['Elections', 'Policy', 'Local Gov', 'International']
  };

  const handleCategoryPress = (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
      setSelectedSubcategory(null);
      onCategoryChange?.(null, null);
    } else {
      setSelectedCategory(category);
      setSelectedSubcategory(null);
      onCategoryChange?.(category, null);
      // Reset subcategory scroll to the left when changing categories
      setSubScrollX(0);
      setTimeout(() => {
        subScrollRef.current?.scrollTo({ x: 0, animated: true });
      }, 100);
    }
  };

  const handleSubcategoryPress = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    onCategoryChange?.(selectedCategory, subcategory);
  };

  // Scroll functions with dynamic positioning
  const [categoryScrollX, setCategoryScrollX] = useState(0);
  const [subScrollX, setSubScrollX] = useState(0);

  const scrollCategoriesRight = () => {
    const newX = categoryScrollX + 250;
    setCategoryScrollX(newX);
    categoryScrollRef.current?.scrollTo({ x: newX, animated: true });
  };

  const scrollSubcategoriesRight = () => {
    const newX = subScrollX + 250;
    setSubScrollX(newX);
    subScrollRef.current?.scrollTo({ x: newX, animated: true });
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <Animated.View 
        style={[
          styles.container, 
          isCollapsed && styles.containerCollapsed,
          {
            transform: [{ translateY: headerTranslateY }],
          }
        ]}
      >
        {/* Combined Header + Categories Frame */}
        <View style={styles.mainFrame}>
          <BlurView intensity={40} style={styles.blurWrapper}>
            <LinearGradient
              colors={[
                'rgba(30, 30, 30, 0.95)',
                'rgba(20, 20, 20, 0.98)',
                'rgba(15, 15, 15, 0.99)',
                'rgba(10, 10, 10, 1)',
              ]}
              style={styles.gradientWrapper}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {/* Header Content */}
              {!isCollapsed && (
                <View style={styles.headerRow}>
                  <View style={styles.titleArea}>
                    <Text style={styles.mainTitle}>KORUS</Text>
                  </View>
                  
                  {onComposePress && (
                    <TouchableOpacity
                      style={styles.postBtn}
                      onPress={onComposePress}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['#43e97b', '#38f9d7']}
                        style={styles.postBtnGrad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={styles.postBtnTxt}>✨ Post</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Categories Section - Always visible */}
              <View style={[styles.categoriesArea, isCollapsed && styles.categoriesAreaCollapsed]}>
                <View style={styles.categoryScrollContainer}>
                  <ScrollView 
                    ref={categoryScrollRef}
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryScroll}
                    contentContainerStyle={styles.categoryScrollContent}
                  >
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category}
                        style={[
                          styles.categoryBtn,
                          selectedCategory === category && styles.categoryBtnSelected
                        ]}
                        onPress={() => handleCategoryPress(category)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={
                            selectedCategory === category
                              ? ['#43e97b', '#38f9d7']
                              : ['rgba(40, 40, 40, 0.9)', 'rgba(30, 30, 30, 0.95)']
                          }
                          style={styles.categoryBtnGrad}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Text style={[
                            styles.categoryBtnTxt,
                            selectedCategory === category && styles.categoryBtnTxtSelected
                          ]}>
                            {category} {selectedCategory === category ? '▼' : '▽'}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  
                  {/* Clickable scroll indicator arrow for categories */}
                  <TouchableOpacity 
                    style={styles.categoryScrollIndicator}
                    onPress={scrollCategoriesRight}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['transparent', 'rgba(30, 30, 30, 0.9)', 'rgba(30, 30, 30, 0.95)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.scrollIndicatorGradient}
                    >
                      <View style={styles.arrowContainer}>
                        <Text style={styles.scrollArrow}>{'>'}</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </BlurView>
        </View>

        {/* Subcategories Frame */}
        {selectedCategory && (
          <View style={styles.subContainer}>
            <View style={styles.subFrame}>
              <BlurView intensity={25} style={styles.subBlur}>
                <LinearGradient
                  colors={[
                    'rgba(30, 30, 30, 0.95)',
                    'rgba(20, 20, 20, 0.98)',
                    'rgba(15, 15, 15, 0.99)',
                    'rgba(10, 10, 10, 1)',
                  ]}
                  style={styles.subGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.subScrollContainer}>
                    <ScrollView 
                      ref={subScrollRef}
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.subScroll}
                      contentContainerStyle={styles.subScrollContent}
                    >
                      {subcategories[selectedCategory]?.map((subcategory) => (
                        <TouchableOpacity
                          key={subcategory}
                          style={styles.subBtn}
                          onPress={() => handleSubcategoryPress(subcategory)}
                          activeOpacity={0.8}
                        >
                          <LinearGradient
                            colors={['rgba(40, 40, 40, 0.9)', 'rgba(30, 30, 30, 0.95)']}
                            style={[
                              styles.subBtnGrad,
                              selectedSubcategory === subcategory && styles.subBtnGradSelected
                            ]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                          >
                            <Text style={styles.subBtnTxt}>
                              {subcategory}
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    
                    {/* Clickable scroll indicator arrow */}
                    <TouchableOpacity 
                      style={styles.scrollIndicator}
                      onPress={scrollSubcategoriesRight}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={['transparent', 'rgba(30, 30, 30, 0.9)', 'rgba(30, 30, 30, 0.95)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.scrollIndicatorGradient}
                      >
                        <View style={styles.arrowContainer}>
                          <Text style={styles.scrollArrow}>{'>'}</Text>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </BlurView>
            </View>
          </View>
        )}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    paddingTop: 50,
    paddingHorizontal: 15,
    paddingBottom: 8,
    zIndex: 1000,
  },
  containerCollapsed: {
    paddingBottom: 4,
  },
  mainFrame: {
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(67, 233, 123, 0.6)',
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 35,
    elevation: 15,
    marginBottom: 10,
  },
  blurWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  gradientWrapper: {
    padding: 15,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    height: 40, // Fixed height, no animation
  },
  titleArea: {
    flex: 1,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: FontSizes['4xl'],
    fontFamily: Fonts.extraBold,
    color: '#ffffff',
    letterSpacing: -1,
  },
  postBtn: {
    borderRadius: 25,
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  postBtnGrad: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnTxt: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
    color: '#000000',
    letterSpacing: 0.3,
  },
  categoriesArea: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(67, 233, 123, 0.1)',
  },
  categoriesAreaCollapsed: {
    paddingTop: 0,
    borderTopWidth: 0,
  },
  categoryScrollContainer: {
    position: 'relative',
  },
  categoryScroll: {
    flexGrow: 0,
  },
  categoryScrollContent: {
    paddingRight: 50,
  },
  categoryBtn: {
    marginRight: 12,
    borderRadius: 16,
  },
  categoryBtnSelected: {
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1.0,
    shadowRadius: 20,
    elevation: 10,
  },
  categoryBtnGrad: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(67, 233, 123, 0.4)',
    minWidth: 100,
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryBtnTxt: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.bold,
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  categoryBtnTxtSelected: {
    color: '#000000',
  },
  categoryScrollIndicator: {
    position: 'absolute',
    right: -15,
    top: 0,
    bottom: 0,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subContainer: {
    marginBottom: 10,
  },
  subFrame: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.15)',
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  subBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  subGradient: {
    padding: 15,
  },
  subScrollContainer: {
    position: 'relative',
  },
  subScroll: {
    flexGrow: 0,
  },
  subScrollContent: {
    paddingRight: 30,
  },
  subBtn: {
    borderRadius: 16,
    marginRight: 12,
  },
  subBtnGrad: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(67, 233, 123, 0.4)',
    minWidth: 100,
    alignItems: 'center',
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  subBtnGradSelected: {
    borderColor: 'rgba(67, 233, 123, 0.9)',
    borderWidth: 2,
    shadowColor: '#43e97b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  subBtnTxt: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.semiBold,
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  scrollIndicator: {
    position: 'absolute',
    right: -15,
    top: 0,
    bottom: 0,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollIndicatorGradient: {
    width: 40,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArrow: {
    fontSize: 16,
    color: 'rgba(67, 233, 123, 0.6)',
    fontWeight: 'bold',
  },
});