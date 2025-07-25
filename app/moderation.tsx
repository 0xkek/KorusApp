import React, { useState, useEffect, useCallback } from 'react'
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  Alert
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../context/ThemeContext'
import { moderationAPI, type ModerationDashboard, type Report } from '../utils/moderationAPI'
import { logger } from '../utils/logger'
import LoadingSpinner from '../components/LoadingSpinner'
import ModerationActionModal from '../components/ModerationActionModal'
import ReportReviewModal from '../components/ReportReviewModal'

export default function ModerationPage() {
  const { theme, isDarkMode } = useTheme()
  const [dashboard, setDashboard] = useState<ModerationDashboard | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [actionModalVisible, setActionModalVisible] = useState(false)
  const [reviewModalVisible, setReviewModalVisible] = useState(false)

  const loadModerationData = useCallback(async () => {
    try {
      logger.log('[MODERATION] Loading dashboard data')
      
      const [dashboardData, reportsData] = await Promise.all([
        moderationAPI.getDashboard(selectedTimeframe),
        moderationAPI.getReports('pending', undefined, 20, 0)
      ])

      setDashboard(dashboardData)
      setReports(reportsData.reports || [])
      
      logger.log('[MODERATION] Dashboard loaded', { 
        pendingReports: dashboardData.summary.pendingReports,
        recentActions: dashboardData.recentActions.length 
      })
    } catch (error) {
      logger.error('[MODERATION] Failed to load dashboard', error)
      Alert.alert('Error', 'Failed to load moderation dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedTimeframe])

  useEffect(() => {
    loadModerationData()
  }, [loadModerationData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadModerationData()
  }, [loadModerationData])

  const handleReportPress = (report: Report) => {
    setSelectedReport(report)
    setReviewModalVisible(true)
  }

  const handleActionComplete = () => {
    loadModerationData() // Refresh data after action
  }

  const timeframes = [
    { key: '1h', label: '1 Hour' },
    { key: '24h', label: '24 Hours' },
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' }
  ]

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <LoadingSpinner />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.border
      }}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={{ padding: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: theme.text,
          fontFamily: 'Inter_600SemiBold'
        }}>
          Moderation Dashboard
        </Text>
        
        <TouchableOpacity 
          onPress={() => setActionModalVisible(true)}
          style={{ padding: 8 }}
        >
          <Ionicons name="settings" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Timeframe Selector */}
        <View style={{ padding: 16 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: theme.text,
            marginBottom: 12,
            fontFamily: 'Inter_600SemiBold'
          }}>
            Time Period
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 20 }}
          >
            {timeframes.map((timeframe) => (
              <TouchableOpacity
                key={timeframe.key}
                onPress={() => setSelectedTimeframe(timeframe.key)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  marginRight: 8,
                  borderRadius: 20,
                  backgroundColor: selectedTimeframe === timeframe.key 
                    ? theme.primary 
                    : theme.card,
                  borderWidth: 1,
                  borderColor: selectedTimeframe === timeframe.key 
                    ? theme.primary 
                    : theme.border
                }}
              >
                <Text style={{
                  color: selectedTimeframe === timeframe.key 
                    ? '#FFFFFF' 
                    : theme.text,
                  fontWeight: '500',
                  fontFamily: 'Inter_500Medium'
                }}>
                  {timeframe.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Summary Cards */}
          {dashboard && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: theme.text,
                marginBottom: 12,
                fontFamily: 'Inter_600SemiBold'
              }}>
                Summary
              </Text>
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between'
              }}>
                <StatCard
                  title="Pending Reports"
                  value={dashboard.summary.pendingReports}
                  color="#FF6B6B"
                  theme={theme}
                />
                <StatCard
                  title="Hidden Posts"
                  value={dashboard.summary.hiddenPosts}
                  color="#4ECDC4"
                  theme={theme}
                />
                <StatCard
                  title="Hidden Replies"
                  value={dashboard.summary.hiddenReplies}
                  color="#45B7D1"
                  theme={theme}
                />
                <StatCard
                  title="Suspended Users"
                  value={dashboard.summary.suspendedUsers}
                  color="#F39C12"
                  theme={theme}
                />
              </View>
            </View>
          )}

          {/* Pending Reports */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: theme.text,
              marginBottom: 12,
              fontFamily: 'Inter_600SemiBold'
            }}>
              Pending Reports ({reports.length})
            </Text>
            {reports.length === 0 ? (
              <View style={{
                padding: 20,
                backgroundColor: theme.card,
                borderRadius: 12,
                alignItems: 'center'
              }}>
                <Ionicons name="checkmark-circle" size={48} color={theme.success} />
                <Text style={{
                  color: theme.textSecondary,
                  marginTop: 8,
                  textAlign: 'center',
                  fontFamily: 'Inter_400Regular'
                }}>
                  No pending reports! All caught up.
                </Text>
              </View>
            ) : (
              reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  theme={theme}
                  onPress={() => handleReportPress(report)}
                />
              ))
            )}
          </View>

          {/* Recent Actions */}
          {dashboard && dashboard.recentActions.length > 0 && (
            <View>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: theme.text,
                marginBottom: 12,
                fontFamily: 'Inter_600SemiBold'
              }}>
                Recent Actions
              </Text>
              {dashboard.recentActions.slice(0, 10).map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  theme={theme}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <ModerationActionModal
        visible={actionModalVisible}
        onClose={() => setActionModalVisible(false)}
        onActionComplete={handleActionComplete}
      />

      {selectedReport && (
        <ReportReviewModal
          visible={reviewModalVisible}
          report={selectedReport}
          onClose={() => {
            setReviewModalVisible(false)
            setSelectedReport(null)
          }}
          onActionComplete={handleActionComplete}
        />
      )}
    </SafeAreaView>
  )
}

// Stat Card Component
function StatCard({ title, value, color, theme }: {
  title: string
  value: number
  color: string
  theme: any
}) {
  return (
    <View style={{
      width: '48%',
      backgroundColor: theme.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderLeftWidth: 4,
      borderLeftColor: color
    }}>
      <Text style={{
        fontSize: 24,
        fontWeight: 'bold',
        color,
        fontFamily: 'Inter_700Bold'
      }}>
        {value}
      </Text>
      <Text style={{
        fontSize: 12,
        color: theme.textSecondary,
        marginTop: 4,
        fontFamily: 'Inter_400Regular'
      }}>
        {title}
      </Text>
    </View>
  )
}

// Report Card Component
function ReportCard({ report, theme, onPress }: {
  report: Report
  theme: any
  onPress: () => void
}) {
  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'spam': return '#FF6B6B'
      case 'harassment': return '#E74C3C'
      case 'inappropriate': return '#F39C12'
      case 'misinformation': return '#9B59B6'
      default: return theme.textSecondary
    }
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: theme.card,
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: theme.border
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{
              fontSize: 12,
              color: getReasonColor(report.reason),
              fontWeight: '600',
              textTransform: 'uppercase',
              fontFamily: 'Inter_600SemiBold'
            }}>
              {report.reason}
            </Text>
            <Text style={{
              fontSize: 12,
              color: theme.textSecondary,
              marginLeft: 8,
              fontFamily: 'Inter_400Regular'
            }}>
              {report.targetType}
            </Text>
          </View>
          <Text style={{
            color: theme.text,
            fontSize: 14,
            fontFamily: 'Inter_400Regular'
          }}>
            Reported by {report.reporter.walletAddress.slice(0, 8)}...
          </Text>
          <Text style={{
            color: theme.textSecondary,
            fontSize: 12,
            marginTop: 4,
            fontFamily: 'Inter_400Regular'
          }}>
            {new Date(report.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
      </View>
    </TouchableOpacity>
  )
}

// Action Card Component
function ActionCard({ action, theme }: {
  action: any
  theme: any
}) {
  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'hide': return '#FF6B6B'
      case 'suspend': return '#E74C3C'
      case 'warn': return '#F39C12'
      case 'unsuspend': return '#27AE60'
      default: return theme.textSecondary
    }
  }

  return (
    <View style={{
      backgroundColor: theme.card,
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      borderLeftWidth: 3,
      borderLeftColor: getActionColor(action.actionType)
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{
            color: getActionColor(action.actionType),
            fontSize: 12,
            fontWeight: '600',
            textTransform: 'uppercase',
            fontFamily: 'Inter_600SemiBold'
          }}>
            {action.actionType}
          </Text>
          <Text style={{
            color: theme.text,
            fontSize: 13,
            marginTop: 2,
            fontFamily: 'Inter_400Regular'
          }}>
            {action.reason.length > 50 ? action.reason.slice(0, 50) + '...' : action.reason}
          </Text>
        </View>
        <Text style={{
          color: theme.textSecondary,
          fontSize: 11,
          fontFamily: 'Inter_400Regular'
        }}>
          {new Date(action.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </View>
  )
}