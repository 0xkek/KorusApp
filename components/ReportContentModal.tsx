import React, { useState } from 'react'
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
import { logger } from '../utils/logger'
import api from '../utils/api'

interface Props {
  visible: boolean
  targetType: 'post' | 'reply'
  targetId: string
  onClose: () => void
  onReportComplete: () => void
}

const REPORT_REASONS = [
  { key: 'spam', label: 'Spam', icon: 'ban', description: 'Repetitive, unsolicited, or promotional content' },
  { key: 'harassment', label: 'Harassment', icon: 'shield', description: 'Bullying, threats, or targeted harassment' },
  { key: 'inappropriate', label: 'Inappropriate Content', icon: 'warning', description: 'Sexual, violent, or disturbing content' },
  { key: 'misinformation', label: 'Misinformation', icon: 'information-circle', description: 'False or misleading information' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal', description: 'Other violations not listed above' }
]

export default function ReportContentModal({ 
  visible, 
  targetType, 
  targetId, 
  onClose, 
  onReportComplete 
}: Props) {
  const { theme } = useTheme()
  const [selectedReason, setSelectedReason] = useState<string>('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmitReport = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for reporting')
      return
    }

    setLoading(true)
    try {
      await api.post('/reports', {
        targetType,
        targetId,
        reason: selectedReason,
        description: description.trim() || undefined
      })

      logger.log('[REPORT] Content reported', { targetType, targetId, reason: selectedReason })
      
      Alert.alert(
        'Report Submitted',
        'Thank you for your report. Our moderation team will review this content.',
        [{ text: 'OK', onPress: () => {
          onReportComplete()
          onClose()
          resetForm()
        }}]
      )

    } catch (error) {
      logger.error('[REPORT] Failed to submit report', error)
      Alert.alert('Error', 'Failed to submit report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedReason('')
    setDescription('')
  }

  const handleClose = () => {
    if (!loading) {
      onClose()
      resetForm()
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
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
          <TouchableOpacity onPress={handleClose} disabled={loading}>
            <Text style={{ 
              color: loading ? theme.textSecondary : theme.primary, 
              fontSize: 16, 
              fontFamily: 'Inter_500Medium' 
            }}>
              Cancel
            </Text>
          </TouchableOpacity>
          
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: theme.text,
            fontFamily: 'Inter_600SemiBold'
          }}>
            Report {targetType === 'post' ? 'Post' : 'Reply'}
          </Text>
          
          <TouchableOpacity 
            onPress={handleSubmitReport}
            disabled={loading || !selectedReason}
            style={{ opacity: (loading || !selectedReason) ? 0.5 : 1 }}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Text style={{ 
                color: theme.primary, 
                fontSize: 16, 
                fontFamily: 'Inter_600SemiBold' 
              }}>
                Submit
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
          {/* Info Message */}
          <View style={{
            backgroundColor: theme.card,
            padding: 16,
            borderRadius: 12,
            marginBottom: 24,
            flexDirection: 'row',
            alignItems: 'flex-start'
          }}>
            <Ionicons 
              name="information-circle" 
              size={24} 
              color={theme.primary} 
              style={{ marginRight: 12, marginTop: 2 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{
                color: theme.text,
                fontSize: 14,
                fontWeight: '500',
                marginBottom: 4,
                fontFamily: 'Inter_500Medium'
              }}>
                Help keep Korus safe
              </Text>
              <Text style={{
                color: theme.textSecondary,
                fontSize: 13,
                lineHeight: 18,
                fontFamily: 'Inter_400Regular'
              }}>
                Reports are anonymous and help our moderation team maintain community standards. False reports may result in account restrictions.
              </Text>
            </View>
          </View>

          {/* Reason Selection */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: theme.text,
              marginBottom: 16,
              fontFamily: 'Inter_600SemiBold'
            }}>
              Why are you reporting this {targetType}?
            </Text>
            
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason.key}
                onPress={() => setSelectedReason(reason.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  padding: 16,
                  backgroundColor: selectedReason === reason.key ? `${theme.primary}15` : theme.card,
                  borderRadius: 12,
                  marginBottom: 12,
                  borderWidth: selectedReason === reason.key ? 2 : 1,
                  borderColor: selectedReason === reason.key ? theme.primary : theme.border
                }}
              >
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: selectedReason === reason.key ? theme.primary : 'transparent',
                  borderWidth: 2,
                  borderColor: selectedReason === reason.key ? theme.primary : theme.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                  marginTop: 2
                }}>
                  {selectedReason === reason.key && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>
                
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons 
                      name={reason.icon as any} 
                      size={18} 
                      color={selectedReason === reason.key ? theme.primary : theme.textSecondary}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={{
                      color: selectedReason === reason.key ? theme.primary : theme.text,
                      fontSize: 15,
                      fontWeight: '500',
                      fontFamily: 'Inter_500Medium'
                    }}>
                      {reason.label}
                    </Text>
                  </View>
                  <Text style={{
                    color: theme.textSecondary,
                    fontSize: 13,
                    lineHeight: 17,
                    fontFamily: 'Inter_400Regular'
                  }}>
                    {reason.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Optional Description */}
          <View style={{ marginBottom: 40 }}>
            <Text style={{
              fontSize: 14,
              fontWeight: '500',
              color: theme.text,
              marginBottom: 8,
              fontFamily: 'Inter_500Medium'
            }}>
              Additional Details (Optional)
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              maxLength={500}
              style={{
                backgroundColor: theme.card,
                borderRadius: 12,
                padding: 12,
                color: theme.text,
                borderWidth: 1,
                borderColor: theme.border,
                minHeight: 100,
                textAlignVertical: 'top',
                fontSize: 14,
                fontFamily: 'Inter_400Regular'
              }}
              placeholder="Provide additional context about why you're reporting this content..."
              placeholderTextColor={theme.textSecondary}
            />
            <Text style={{
              fontSize: 12,
              color: theme.textSecondary,
              marginTop: 4,
              textAlign: 'right',
              fontFamily: 'Inter_400Regular'
            }}>
              {description.length}/500
            </Text>
          </View>

          {/* Warning */}
          <View style={{
            backgroundColor: '#FFF3CD',
            borderColor: '#F39C12',
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'flex-start'
          }}>
            <Ionicons 
              name="warning" 
              size={20} 
              color="#F39C12" 
              style={{ marginRight: 8, marginTop: 2 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{
                color: '#8B6F00',
                fontSize: 13,
                fontWeight: '500',
                marginBottom: 2,
                fontFamily: 'Inter_500Medium'
              }}>
                Important
              </Text>
              <Text style={{
                color: '#8B6F00',
                fontSize: 12,
                lineHeight: 16,
                fontFamily: 'Inter_400Regular'
              }}>
                Filing false reports may result in restrictions on your account. Only report content that violates our community guidelines.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}