import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../context/ThemeContext'
import { moderationAPI, type Report } from '../utils/moderationAPI'
import { logger } from '../utils/logger'

interface Props {
  visible: boolean
  report: Report
  onClose: () => void
  onActionComplete: () => void
}

export default function ReportReviewModal({ visible, report, onClose, onActionComplete }: Props) {
  const { theme } = useTheme()
  const [loading, setLoading] = useState(false)
  const [contentData, setContentData] = useState<any>(null)
  const [moderatorNotes, setModeratorNotes] = useState('')
  const [actionType, setActionType] = useState<'hide' | 'warn' | 'suspend' | 'dismiss'>('hide')
  const [suspensionDuration, setSuspensionDuration] = useState('24')
  const [actionReason, setActionReason] = useState('')

  useEffect(() => {
    if (visible && report) {
      loadContentData()
      setModeratorNotes('')
      setActionReason(`Report: ${report.reason}`)
    }
  }, [visible, report])

  const loadContentData = async () => {
    try {
      // In a real implementation, you'd fetch the actual post/reply content
      // For now, we'll use placeholder data
      setContentData({
        id: report.targetId,
        type: report.targetType,
        content: 'Content would be loaded here...',
        author: 'Author info...'
      })
    } catch (error) {
      logger.error('[MODERATION] Failed to load content', error)
    }
  }

  const handleAction = async () => {
    if (!actionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for this action')
      return
    }

    setLoading(true)
    try {
      let result

      switch (actionType) {
        case 'hide':
          result = await moderationAPI.hideContent(
            report.targetType,
            report.targetId,
            actionReason,
            report.id
          )
          break

        case 'warn':
          // Extract wallet from report - you'd need to get the content author's wallet
          const authorWallet = 'placeholder_wallet' // This would come from content data
          result = await moderationAPI.warnUser(
            authorWallet,
            actionReason,
            report.id
          )
          break

        case 'suspend':
          const targetWallet = 'placeholder_wallet' // This would come from content data
          result = await moderationAPI.suspendUser(
            targetWallet,
            actionReason,
            parseInt(suspensionDuration),
            report.id
          )
          break

        case 'dismiss':
          result = await moderationAPI.updateReportStatus(
            report.id,
            'dismissed',
            moderatorNotes || 'Report dismissed - no violation found'
          )
          break
      }

      logger.log('[MODERATION] Action completed', { actionType, reportId: report.id })
      
      Alert.alert(
        'Success',
        `${actionType === 'hide' ? 'Content hidden' : 
          actionType === 'warn' ? 'User warned' :
          actionType === 'suspend' ? 'User suspended' :
          'Report dismissed'} successfully`,
        [{ text: 'OK', onPress: () => {
          onActionComplete()
          onClose()
        }}]
      )

    } catch (error) {
      logger.error('[MODERATION] Action failed', error)
      Alert.alert('Error', 'Failed to complete moderation action')
    } finally {
      setLoading(false)
    }
  }

  const actionTypes = [
    { key: 'hide', label: 'Hide Content', icon: 'eye-off', color: '#FF6B6B' },
    { key: 'warn', label: 'Warn User', icon: 'warning', color: '#F39C12' },
    { key: 'suspend', label: 'Suspend User', icon: 'ban', color: '#E74C3C' },
    { key: 'dismiss', label: 'Dismiss Report', icon: 'close-circle', color: '#95A5A6' }
  ]

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          paddingTop: 50
        }}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: theme.primary, fontSize: 16, fontFamily: 'Inter_500Medium' }}>
              Cancel
            </Text>
          </TouchableOpacity>
          
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: theme.text,
            fontFamily: 'Inter_600SemiBold'
          }}>
            Review Report
          </Text>
          
          <TouchableOpacity 
            onPress={handleAction}
            disabled={loading}
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Text style={{ color: theme.primary, fontSize: 16, fontFamily: 'Inter_600SemiBold' }}>
                Action
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Report Details */}
          <View style={{ padding: 16 }}>
            <View style={{
              backgroundColor: theme.card,
              padding: 16,
              borderRadius: 12,
              marginBottom: 20
            }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: theme.text,
                marginBottom: 12,
                fontFamily: 'Inter_600SemiBold'
              }}>
                Report Details
              </Text>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: theme.textSecondary, fontFamily: 'Inter_400Regular' }}>Reason:</Text>
                <Text style={{ 
                  color: theme.text, 
                  fontWeight: '500',
                  textTransform: 'capitalize',
                  fontFamily: 'Inter_500Medium'
                }}>
                  {report.reason}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: theme.textSecondary, fontFamily: 'Inter_400Regular' }}>Type:</Text>
                <Text style={{ color: theme.text, fontFamily: 'Inter_400Regular' }}>{report.targetType}</Text>
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: theme.textSecondary, fontFamily: 'Inter_400Regular' }}>Reporter:</Text>
                <Text style={{ color: theme.text, fontFamily: 'Inter_400Regular' }}>
                  {report.reporter.walletAddress.slice(0, 8)}...
                  {report.reporter.tier === 'premium' && (
                    <Text style={{ color: theme.primary }}> ✓</Text>
                  )}
                </Text>
              </View>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: theme.textSecondary, fontFamily: 'Inter_400Regular' }}>Date:</Text>
                <Text style={{ color: theme.text, fontFamily: 'Inter_400Regular' }}>
                  {new Date(report.createdAt).toLocaleDateString()}
                </Text>
              </View>

              {report.description && (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ 
                    color: theme.textSecondary, 
                    marginBottom: 4,
                    fontFamily: 'Inter_400Regular'
                  }}>
                    Description:
                  </Text>
                  <Text style={{ color: theme.text, fontFamily: 'Inter_400Regular' }}>
                    {report.description}
                  </Text>
                </View>
              )}
            </View>

            {/* Reported Content */}
            <View style={{
              backgroundColor: theme.card,
              padding: 16,
              borderRadius: 12,
              marginBottom: 20
            }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: theme.text,
                marginBottom: 12,
                fontFamily: 'Inter_600SemiBold'
              }}>
                Reported Content
              </Text>
              
              <View style={{
                backgroundColor: theme.background,
                padding: 12,
                borderRadius: 8,
                borderLeftWidth: 4,
                borderLeftColor: '#FF6B6B'
              }}>
                <Text style={{ 
                  color: theme.text,
                  fontSize: 14,
                  lineHeight: 20,
                  fontFamily: 'Inter_400Regular'
                }}>
                  {contentData?.content || 'Loading content...'}
                </Text>
              </View>
            </View>

            {/* Action Selection */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: theme.text,
                marginBottom: 12,
                fontFamily: 'Inter_600SemiBold'
              }}>
                Moderation Action
              </Text>
              
              {actionTypes.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  onPress={() => setActionType(type.key as any)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 12,
                    backgroundColor: actionType === type.key ? `${type.color}20` : theme.card,
                    borderRadius: 8,
                    marginBottom: 8,
                    borderWidth: actionType === type.key ? 2 : 1,
                    borderColor: actionType === type.key ? type.color : theme.border
                  }}
                >
                  <Ionicons 
                    name={type.icon as any} 
                    size={20} 
                    color={actionType === type.key ? type.color : theme.textSecondary} 
                  />
                  <Text style={{
                    color: actionType === type.key ? type.color : theme.text,
                    marginLeft: 12,
                    fontWeight: actionType === type.key ? '600' : '400',
                    fontFamily: actionType === type.key ? 'Inter_600SemiBold' : 'Inter_400Regular'
                  }}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Suspension Duration (if suspending) */}
            {actionType === 'suspend' && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: theme.text,
                  marginBottom: 8,
                  fontFamily: 'Inter_500Medium'
                }}>
                  Suspension Duration (hours)
                </Text>
                <TextInput
                  value={suspensionDuration}
                  onChangeText={setSuspensionDuration}
                  keyboardType="numeric"
                  style={{
                    backgroundColor: theme.card,
                    borderRadius: 8,
                    padding: 12,
                    color: theme.text,
                    borderWidth: 1,
                    borderColor: theme.border,
                    fontFamily: 'Inter_400Regular'
                  }}
                  placeholder="24"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            )}

            {/* Action Reason */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                color: theme.text,
                marginBottom: 8,
                fontFamily: 'Inter_500Medium'
              }}>
                Action Reason
              </Text>
              <TextInput
                value={actionReason}
                onChangeText={setActionReason}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 8,
                  padding: 12,
                  color: theme.text,
                  borderWidth: 1,
                  borderColor: theme.border,
                  minHeight: 80,
                  textAlignVertical: 'top',
                  fontFamily: 'Inter_400Regular'
                }}
                placeholder="Explain why you're taking this action..."
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            {/* Moderator Notes */}
            <View style={{ marginBottom: 40 }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                color: theme.text,
                marginBottom: 8,
                fontFamily: 'Inter_500Medium'
              }}>
                Moderator Notes (Optional)
              </Text>
              <TextInput
                value={moderatorNotes}
                onChangeText={setModeratorNotes}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 8,
                  padding: 12,
                  color: theme.text,
                  borderWidth: 1,
                  borderColor: theme.border,
                  minHeight: 80,
                  textAlignVertical: 'top',
                  fontFamily: 'Inter_400Regular'
                }}
                placeholder="Internal notes about this decision..."
                placeholderTextColor={theme.textSecondary}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}