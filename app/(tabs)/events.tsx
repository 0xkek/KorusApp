import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Modal, TouchableWithoutFeedback } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import { Fonts, FontSizes } from '../../constants/Fonts';
import ParticleSystem from '../../components/ParticleSystem';
import { useKorusAlert } from '../../components/KorusAlertProvider';

interface Event {
  id: string;
  type: 'whitelist' | 'token_launch' | 'nft_mint' | 'airdrop' | 'ido';
  title: string;
  project: string;
  description: string;
  startTime: Date;
  endTime?: Date;
  imageUrl?: string;
  requirements?: string[];
  allocation?: string;
  price?: string;
  chain: 'Solana' | 'Ethereum' | 'Polygon';
  isLive?: boolean;
  participants?: number;
  maxParticipants?: number;
  premiumOnly?: boolean;
}

export default function EventsScreen() {
  const { colors, isDarkMode, gradients } = useTheme();
  const { isPremium, walletAddress } = useWallet();
  const { showAlert } = useKorusAlert();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [isParticipating, setIsParticipating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Mock events data
  const allEvents: Event[] = [
    {
      id: '1',
      type: 'whitelist',
      title: 'DeFi Protocol Whitelist',
      project: 'SolanaSwap',
      description: 'Get early access to the next-gen AMM on Solana. Limited spots available.',
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&q=80',
      requirements: ['Hold 100+ $ALLY', 'Complete KYC', 'Active Korus user'],
      allocation: '500 USDC',
      chain: 'Solana',
      participants: 234,
      maxParticipants: 500,
      premiumOnly: true,
    },
    {
      id: '2',
      type: 'nft_mint',
      title: 'Cyber Punks NFT Mint',
      project: 'CyberPunks',
      description: 'Exclusive NFT collection with utility in the Korus ecosystem.',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      imageUrl: 'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=400&q=80',
      price: '2 SOL',
      chain: 'Solana',
      maxParticipants: 1000,
      participants: 567,
    },
    {
      id: '3',
      type: 'token_launch',
      title: 'DEFI Token Public Sale',
      project: 'DeFiDAO',
      description: 'Governance token for the decentralized finance protocol.',
      startTime: new Date(Date.now() + 48 * 60 * 60 * 1000), // 2 days
      imageUrl: 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=400&q=80',
      price: '0.10 USDC',
      allocation: '1000 USDC',
      chain: 'Solana',
      isLive: false,
    },
    {
      id: '4',
      type: 'airdrop',
      title: 'Loyalty Rewards Airdrop',
      project: 'Korus',
      description: 'Exclusive airdrop for active Korus community members.',
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // Started 2 hours ago
      endTime: new Date(Date.now() + 22 * 60 * 60 * 1000), // Ends in 22 hours
      requirements: ['50+ posts', '100+ interactions', 'Connected wallet'],
      chain: 'Solana',
      isLive: true,
      participants: 1234,
    },
  ];

  // Filter events based on premium status
  const currentTime = new Date();
  const premiumTimeAdvantage = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
  
  const visibleEvents = allEvents.filter(event => {
    const eventVisibleTime = new Date(event.startTime.getTime() - premiumTimeAdvantage);
    
    // Premium users see all events
    if (isPremium) return true;
    
    // Basic users only see events if they're within 12 hours or already started
    return currentTime >= eventVisibleTime;
  });

  const getEventTypeIcon = (type: Event['type']) => {
    switch (type) {
      case 'whitelist':
        return 'list';
      case 'token_launch':
        return 'rocket';
      case 'nft_mint':
        return 'image';
      case 'airdrop':
        return 'gift';
      case 'ido':
        return 'trending-up';
      default:
        return 'calendar';
    }
  };

  const getEventTypeColor = (type: Event['type']) => {
    switch (type) {
      case 'whitelist':
        return '#9945FF';
      case 'token_launch':
        return '#00D4FF';
      case 'nft_mint':
        return '#FF6B9D';
      case 'airdrop':
        return '#FFD700';
      case 'ido':
        return '#43e97b';
      default:
        return colors.primary;
    }
  };

  const formatTimeRemaining = (startTime: Date) => {
    const now = new Date();
    const diff = startTime.getTime() - now.getTime();
    
    if (diff < 0) return 'Live Now';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    
    return `${hours}h ${minutes}m`;
  };

  const handleEventPress = (event: Event) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleParticipate = () => {
    if (!selectedEvent || !walletAddress) return;
    
    console.log('handleParticipate called, selectedEvent:', selectedEvent);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowConfirmModal(true);
  };

  const handleConfirmParticipation = async () => {
    if (!selectedEvent) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsParticipating(true);
    setShowConfirmModal(false);
    
    // Simulate transaction
    setTimeout(() => {
      setIsParticipating(false);
      setShowEventModal(false);
      showAlert({
        title: 'Success!',
        message: `You've successfully joined the ${selectedEvent.title}`,
        type: 'success'
      });
    }, 2000);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Background gradients */}
        <LinearGradient
          colors={gradients.surface}
          style={styles.baseBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        <LinearGradient
          colors={[
            colors.primary + '14',
            colors.secondary + '0C',
            'transparent',
            colors.primary + '0F',
            colors.secondary + '1A',
          ]}
          style={styles.greenOverlay}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Header */}
        <View style={[styles.header, { paddingTop: 50 }]}>
          <Text style={[styles.title, { color: colors.text }]}>Events</Text>
          {isPremium && (
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.premiumBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="star" size={12} color="#000" />
              <Text style={styles.premiumBadgeText}>12h Early Access</Text>
            </LinearGradient>
          )}
        </View>

        <ScrollView
          style={[styles.scrollView, { zIndex: 100 }]}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {!isPremium && (
            <TouchableOpacity
              style={[styles.premiumBanner, { borderColor: '#FFD700' }]}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.premiumBannerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="lock-open" size={24} color="#000" />
                <View style={styles.premiumBannerText}>
                  <Text style={styles.premiumBannerTitle}>Get 12-Hour Early Access</Text>
                  <Text style={styles.premiumBannerSubtitle}>See events before everyone else with Premium</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#000" />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {visibleEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons 
                name="calendar-outline" 
                size={64} 
                color={colors.textTertiary} 
              />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No events available
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                {!isPremium ? 'Upgrade to Premium to see events 12 hours early' : 'Check back soon for new opportunities'}
              </Text>
            </View>
          ) : (
            visibleEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => handleEventPress(event)}
                activeOpacity={0.8}
              >
                <LinearGradient
                    colors={event.isLive ? [
                      getEventTypeColor(event.type) + '20',
                      getEventTypeColor(event.type) + '10',
                    ] : gradients.surface}
                    style={[styles.eventGradient, { 
                      borderColor: event.isLive ? getEventTypeColor(event.type) : colors.borderLight 
                    }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {event.imageUrl && (
                      <Image 
                        source={{ uri: event.imageUrl }} 
                        style={styles.eventImage}
                      />
                    )}
                    
                    <View style={styles.eventContent}>
                      <View style={styles.eventHeader}>
                        <View style={[styles.eventTypeTag, { backgroundColor: getEventTypeColor(event.type) + '20' }]}>
                          <Ionicons 
                            name={getEventTypeIcon(event.type)} 
                            size={14} 
                            color={getEventTypeColor(event.type)} 
                          />
                          <Text style={[styles.eventTypeText, { color: getEventTypeColor(event.type) }]}>
                            {event.type.replace('_', ' ').toUpperCase()}
                          </Text>
                        </View>
                        
                        <View style={[
                          styles.timeTag, 
                          { backgroundColor: event.isLive ? '#FF4444' : colors.surface }
                        ]}>
                          <Ionicons 
                            name={event.isLive ? "radio" : "time-outline"} 
                            size={14} 
                            color={event.isLive ? '#fff' : colors.textSecondary} 
                          />
                          <Text style={[
                            styles.timeText, 
                            { color: event.isLive ? '#fff' : colors.textSecondary }
                          ]}>
                            {formatTimeRemaining(event.startTime)}
                          </Text>
                        </View>
                      </View>
                      
                      <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
                      <Text style={[styles.eventProject, { color: colors.primary }]}>{event.project}</Text>
                      <Text style={[styles.eventDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                        {event.description}
                      </Text>
                      
                      <View style={styles.eventDetails}>
                        {event.price && (
                          <View style={styles.detailItem}>
                            <Ionicons name="pricetag-outline" size={14} color={colors.textTertiary} />
                            <Text style={[styles.detailText, { color: colors.textTertiary }]}>{event.price}</Text>
                          </View>
                        )}
                        
                        {event.allocation && (
                          <View style={styles.detailItem}>
                            <Ionicons name="wallet-outline" size={14} color={colors.textTertiary} />
                            <Text style={[styles.detailText, { color: colors.textTertiary }]}>Max: {event.allocation}</Text>
                          </View>
                        )}
                        
                        <View style={styles.detailItem}>
                          <Ionicons name="link-outline" size={14} color={colors.textTertiary} />
                          <Text style={[styles.detailText, { color: colors.textTertiary }]}>{event.chain}</Text>
                        </View>
                      </View>
                      
                      {event.participants !== undefined && event.maxParticipants && (
                        <View style={styles.participantsSection}>
                          <View style={styles.participantsInfo}>
                            <Text style={[styles.participantsText, { color: colors.textSecondary }]}>
                              {event.participants}/{event.maxParticipants} participants
                            </Text>
                          </View>
                          <View style={[styles.progressBar, { backgroundColor: colors.borderLight }]}>
                            <View 
                              style={[
                                styles.progressFill, 
                                { 
                                  backgroundColor: getEventTypeColor(event.type),
                                  width: `${(event.participants / event.maxParticipants) * 100}%`
                                }
                              ]} 
                            />
                          </View>
                        </View>
                      )}
                    </View>
                    </LinearGradient>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Event Details Modal */}
        <Modal
          visible={showEventModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEventModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowEventModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <BlurView intensity={60} style={styles.modalBlur}>
                    <LinearGradient
                      colors={gradients.surface}
                      style={styles.modalGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {selectedEvent && (
                        <>
                          {/* Modal Header */}
                          <View style={styles.modalHeader}>
                            <View style={[styles.eventTypeTag, { backgroundColor: getEventTypeColor(selectedEvent.type) + '20' }]}>
                              <Ionicons 
                                name={getEventTypeIcon(selectedEvent.type)} 
                                size={16} 
                                color={getEventTypeColor(selectedEvent.type)} 
                              />
                              <Text style={[styles.eventTypeText, { color: getEventTypeColor(selectedEvent.type) }]}>
                                {selectedEvent.type.replace('_', ' ').toUpperCase()}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => setShowEventModal(false)}
                              style={styles.closeButton}
                            >
                              <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                          </View>

                          <ScrollView 
                            showsVerticalScrollIndicator={false}
                            style={styles.modalBody}
                          >
                            {/* Event Image */}
                            {selectedEvent.imageUrl && (
                              <Image 
                                source={{ uri: selectedEvent.imageUrl }} 
                                style={styles.modalEventImage}
                              />
                            )}

                            {/* Event Info */}
                            <View style={styles.modalEventInfo}>
                              <Text style={[styles.modalEventTitle, { color: colors.text }]}>
                                {selectedEvent.title}
                              </Text>
                              <Text style={[styles.modalEventProject, { color: colors.primary }]}>
                                {selectedEvent.project}
                              </Text>
                              <Text style={[styles.modalEventDescription, { color: colors.textSecondary }]}>
                                {selectedEvent.description}
                              </Text>

                              {/* Event Details Grid */}
                              <View style={styles.detailsGrid}>
                                <View style={[styles.detailCard, { backgroundColor: colors.surface + '50' }]}>
                                  <Ionicons name="time-outline" size={20} color={colors.primary} />
                                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Starts In</Text>
                                  <Text style={[styles.detailValue, { color: colors.text }]}>
                                    {formatTimeRemaining(selectedEvent.startTime)}
                                  </Text>
                                </View>

                                {selectedEvent.price && (
                                  <View style={[styles.detailCard, { backgroundColor: colors.surface + '50' }]}>
                                    <Ionicons name="pricetag-outline" size={20} color={colors.primary} />
                                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Price</Text>
                                    <Text style={[styles.detailValue, { color: colors.text }]}>
                                      {selectedEvent.price}
                                    </Text>
                                  </View>
                                )}

                                {selectedEvent.allocation && (
                                  <View style={[styles.detailCard, { backgroundColor: colors.surface + '50' }]}>
                                    <Ionicons name="wallet-outline" size={20} color={colors.primary} />
                                    <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Max Allocation</Text>
                                    <Text style={[styles.detailValue, { color: colors.text }]}>
                                      {selectedEvent.allocation}
                                    </Text>
                                  </View>
                                )}

                                <View style={[styles.detailCard, { backgroundColor: colors.surface + '50' }]}>
                                  <Ionicons name="link-outline" size={20} color={colors.primary} />
                                  <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Chain</Text>
                                  <Text style={[styles.detailValue, { color: colors.text }]}>
                                    {selectedEvent.chain}
                                  </Text>
                                </View>
                              </View>

                              {/* Requirements */}
                              {selectedEvent.requirements && (
                                <View style={styles.requirementsSection}>
                                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Requirements</Text>
                                  {selectedEvent.requirements.map((req, index) => (
                                    <View key={index} style={styles.requirementItem}>
                                      <Ionicons 
                                        name="checkmark-circle" 
                                        size={16} 
                                        color={colors.primary} 
                                      />
                                      <Text style={[styles.requirementText, { color: colors.textSecondary }]}>
                                        {req}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              )}

                              {/* Participation Progress */}
                              {selectedEvent.participants !== undefined && selectedEvent.maxParticipants && (
                                <View style={styles.participationSection}>
                                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Participation</Text>
                                  <View style={styles.participationStats}>
                                    <Text style={[styles.participationText, { color: colors.textSecondary }]}>
                                      {selectedEvent.participants} / {selectedEvent.maxParticipants} spots filled
                                    </Text>
                                    <Text style={[styles.participationPercent, { color: colors.primary }]}>
                                      {Math.round((selectedEvent.participants / selectedEvent.maxParticipants) * 100)}%
                                    </Text>
                                  </View>
                                  <View style={[styles.progressBarLarge, { backgroundColor: colors.borderLight }]}>
                                    <View 
                                      style={[
                                        styles.progressFillLarge, 
                                        { 
                                          backgroundColor: getEventTypeColor(selectedEvent.type),
                                          width: `${(selectedEvent.participants / selectedEvent.maxParticipants) * 100}%`
                                        }
                                      ]} 
                                    />
                                  </View>
                                </View>
                              )}
                            </View>
                          </ScrollView>

                          {/* Action Button */}
                          <View style={styles.modalFooter}>
                            {!walletAddress ? (
                              <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.surface }]}
                                activeOpacity={0.8}
                              >
                                <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>
                                  Connect Wallet to Participate
                                </Text>
                              </TouchableOpacity>
                            ) : (
                              <TouchableOpacity
                                style={styles.actionButton}
                                onPress={handleParticipate}
                                activeOpacity={0.8}
                                disabled={isParticipating}
                              >
                                <LinearGradient
                                  colors={gradients.primary}
                                  style={styles.actionButtonGradient}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                >
                                  {isParticipating ? (
                                    <>
                                      <Ionicons 
                                        name="hourglass-outline" 
                                        size={20} 
                                        color={isDarkMode ? '#000' : '#fff'} 
                                      />
                                      <Text style={[styles.actionButtonText, { color: isDarkMode ? '#000' : '#fff' }]}>
                                        Processing...
                                      </Text>
                                    </>
                                  ) : (
                                    <>
                                      <Ionicons 
                                        name="checkmark-circle" 
                                        size={20} 
                                        color={isDarkMode ? '#000' : '#fff'} 
                                      />
                                      <Text style={[styles.actionButtonText, { color: isDarkMode ? '#000' : '#fff' }]}>
                                        Participate {selectedEvent.price && `- ${selectedEvent.price}`}
                                      </Text>
                                    </>
                                  )}
                                </LinearGradient>
                              </TouchableOpacity>
                            )}
                          </View>
                        </>
                      )}
                    </LinearGradient>
                  </BlurView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Confirmation Modal */}
        <Modal
          visible={showConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowConfirmModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowConfirmModal(false)}>
            <View style={styles.confirmModalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.confirmModalContent, { backgroundColor: colors.surface }]}>
                    <LinearGradient
                      colors={gradients.surface}
                      style={styles.confirmModalGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {selectedEvent && (
                        <>
                          {/* Icon */}
                          <View style={[styles.confirmIcon, { backgroundColor: getEventTypeColor(selectedEvent.type) + '20' }]}>
                            <Ionicons
                              name={getEventTypeIcon(selectedEvent.type)}
                              size={32}
                              color={getEventTypeColor(selectedEvent.type)}
                            />
                          </View>

                          {/* Title */}
                          <Text style={[styles.confirmTitle, { color: colors.text }]}>
                            Confirm Participation
                          </Text>

                          {/* Event Info */}
                          <View style={[styles.confirmEventInfo, { backgroundColor: colors.surface + '50' }]}>
                            <Text style={[styles.confirmEventName, { color: colors.text }]}>
                              {selectedEvent.title}
                            </Text>
                            <Text style={[styles.confirmEventProject, { color: colors.primary }]}>
                              {selectedEvent.project}
                            </Text>
                          </View>

                          {/* Price Info */}
                          {selectedEvent.price && (
                            <View style={styles.confirmPriceSection}>
                              <Text style={[styles.confirmPriceLabel, { color: colors.textSecondary }]}>
                                Total Cost
                              </Text>
                              <Text style={[styles.confirmPriceValue, { color: colors.text }]}>
                                {selectedEvent.price}
                              </Text>
                            </View>
                          )}

                          {/* Allocation Info */}
                          {selectedEvent.allocation && (
                            <View style={styles.confirmAllocationSection}>
                              <Text style={[styles.confirmAllocationLabel, { color: colors.textSecondary }]}>
                                Maximum Allocation
                              </Text>
                              <Text style={[styles.confirmAllocationValue, { color: colors.primary }]}>
                                {selectedEvent.allocation}
                              </Text>
                            </View>
                          )}

                          {/* Warning */}
                          <View style={[styles.confirmWarning, { backgroundColor: '#FFA500' + '20' }]}>
                            <Ionicons name="information-circle" size={20} color="#FFA500" />
                            <Text style={[styles.confirmWarningText, { color: colors.textSecondary }]}>
                              This transaction cannot be reversed. Make sure you understand the risks.
                            </Text>
                          </View>

                          {/* Action Buttons */}
                          <View style={styles.confirmButtons}>
                            <TouchableOpacity
                              style={[styles.confirmCancelButton, { backgroundColor: colors.surface }]}
                              onPress={() => setShowConfirmModal(false)}
                              activeOpacity={0.8}
                            >
                              <Text style={[styles.confirmCancelText, { color: colors.textSecondary }]}>
                                Cancel
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.confirmButton}
                              onPress={handleConfirmParticipation}
                              activeOpacity={0.8}
                              disabled={isParticipating}
                            >
                              <LinearGradient
                                colors={gradients.primary}
                                style={styles.confirmButtonGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                              >
                                {isParticipating ? (
                                  <>
                                    <Ionicons
                                      name="hourglass-outline"
                                      size={20}
                                      color={isDarkMode ? '#000' : '#fff'}
                                    />
                                    <Text style={[styles.confirmButtonText, { color: isDarkMode ? '#000' : '#fff' }]}>
                                      Processing...
                                    </Text>
                                  </>
                                ) : (
                                  <>
                                    <Ionicons
                                      name="checkmark-circle"
                                      size={20}
                                      color={isDarkMode ? '#000' : '#fff'}
                                    />
                                    <Text style={[styles.confirmButtonText, { color: isDarkMode ? '#000' : '#fff' }]}>
                                      Confirm
                                    </Text>
                                  </>
                                )}
                              </LinearGradient>
                            </TouchableOpacity>
                          </View>
                        </>
                      )}
                    </LinearGradient>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  baseBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  greenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 100,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontFamily: Fonts.bold,
    letterSpacing: -0.5,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  premiumBadgeText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  premiumBanner: {
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
  premiumBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  premiumBannerText: {
    flex: 1,
  },
  premiumBannerTitle: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
    color: '#000',
  },
  premiumBannerSubtitle: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    color: '#000',
    opacity: 0.8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.medium,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  eventCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  eventBlur: {
    borderRadius: 20,
    flex: 1,
  },
  eventGradient: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    flex: 1,
  },
  eventImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  eventTypeText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  timeText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
  },
  eventTitle: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    marginBottom: 4,
  },
  eventProject: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    lineHeight: 20,
    marginBottom: 12,
  },
  eventDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
  },
  participantsSection: {
    marginTop: 8,
  },
  participantsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  participantsText: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalBlur: {
    flex: 1,
  },
  modalGradient: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
  },
  modalEventImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  modalEventInfo: {
    padding: 20,
  },
  modalEventTitle: {
    fontSize: FontSizes.xxl,
    fontFamily: Fonts.bold,
    marginBottom: 8,
  },
  modalEventProject: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.medium,
    marginBottom: 12,
  },
  modalEventDescription: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.regular,
    lineHeight: 22,
    marginBottom: 24,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  detailCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: FontSizes.xs,
    fontFamily: Fonts.medium,
  },
  detailValue: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    marginBottom: 12,
  },
  requirementsSection: {
    marginBottom: 24,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  requirementText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    flex: 1,
  },
  participationSection: {
    marginBottom: 24,
  },
  participationStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  participationText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.medium,
  },
  participationPercent: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
  },
  progressBarLarge: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFillLarge: {
    height: '100%',
    borderRadius: 4,
  },
  modalFooter: {
    padding: 20,
    paddingBottom: 30,
  },
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  actionButtonText: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    overflow: 'hidden',
  },
  confirmModalGradient: {
    padding: 24,
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: FontSizes.xl,
    fontFamily: Fonts.bold,
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmEventInfo: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  confirmEventName: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.bold,
    marginBottom: 4,
  },
  confirmEventProject: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
  },
  confirmPriceSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmPriceLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    marginBottom: 4,
  },
  confirmPriceValue: {
    fontSize: FontSizes.xxl,
    fontFamily: Fonts.bold,
  },
  confirmAllocationSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmAllocationLabel: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    marginBottom: 4,
  },
  confirmAllocationValue: {
    fontSize: FontSizes.lg,
    fontFamily: Fonts.medium,
  },
  confirmWarning: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  confirmWarningText: {
    fontSize: FontSizes.sm,
    fontFamily: Fonts.regular,
    flex: 1,
    lineHeight: 18,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.medium,
  },
  confirmButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  confirmButtonText: {
    fontSize: FontSizes.base,
    fontFamily: Fonts.bold,
  },
});