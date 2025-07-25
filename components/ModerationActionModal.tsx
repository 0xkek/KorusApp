import React, { useState } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../context/ThemeContext'
import { moderationAPI } from '../utils/moderationAPI'
import { logger } from '../utils/logger'

interface Props {
  visible: boolean
  onClose: () => void
  onActionComplete: () => void
}

export default function ModerationActionModal({ visible, onClose, onActionComplete }: Props) {
  const { theme } = useTheme()
  const [loading, setLoading] = useState(false)
  const [actionType, setActionType] = useState<'hide' | 'warn' | 'suspend' | 'unsuspend'>('hide')
  const [targetId, setTargetId] = useState('')
  const [targetType, setTargetType] = useState<'post' | 'reply' | 'user'>('post')
  const [targetWallet, setTargetWallet] = useState('')
  const [reason, setReason] = useState('')
  const [duration, setDuration] = useState('24')

  const handleAction = async () => {
    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason')
      return
    }

    if (actionType === 'hide' && !targetId.trim()) {
      Alert.alert('Error', 'Please provide target ID for content to hide')
      return
    }

    if ((actionType === 'warn' || actionType === 'suspend' || actionType === 'unsuspend') && !targetWallet.trim()) {
      Alert.alert('Error', 'Please provide user wallet address')
      return
    }

    setLoading(true)
    try {
      let result

      switch (actionType) {
        case 'hide':
          result = await moderationAPI.hideContent(
            targetType as 'post' | 'reply',
            targetId,
            reason
          )
          break

        case 'warn':
          result = await moderationAPI.warnUser(targetWallet, reason)
          break

        case 'suspend':
          result = await moderationAPI.suspendUser(
            targetWallet,
            reason,
            parseInt(duration)
          )
          break

        case 'unsuspend':
          result = await moderationAPI.unsuspendUser(targetWallet, reason)
          break
      }

      logger.log('[MODERATION] Manual action completed', { actionType, targetId, targetWallet })
      
      Alert.alert(
        'Success',
        `${actionType === 'hide' ? 'Content hidden' : 
          actionType === 'warn' ? 'User warned' :
          actionType === 'suspend' ? 'User suspended' :
          'User unsuspended'} successfully`,
        [{ text: 'OK', onPress: () => {
          onActionComplete()
          onClose()
          resetForm()
        }}]
      )

    } catch (error) {
      logger.error('[MODERATION] Manual action failed', error)
      Alert.alert('Error', 'Failed to complete moderation action')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setTargetId('')
    setTargetWallet('')
    setReason('')
    setDuration('24')
    setActionType('hide')
    setTargetType('post')
  }

  const actionTypes = [
    { key: 'hide', label: 'Hide Content', icon: 'eye-off', color: '#FF6B6B' },
    { key: 'warn', label: 'Warn User', icon: 'warning', color: '#F39C12' },
    { key: 'suspend', label: 'Suspend User', icon: 'ban', color: '#E74C3C' },
    { key: 'unsuspend', label: 'Unsuspend User', icon: 'checkmark-circle', color: '#27AE60' }
  ]

  const contentTypes = [
    { key: 'post', label: 'Post' },
    { key: 'reply', label: 'Reply' }
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
            Manual Action
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
                Execute
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, padding: 16 }} showsVerticalScrollIndicator={false}>
          {/* Action Type Selection */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: theme.text,
              marginBottom: 12,
              fontFamily: 'Inter_600SemiBold'
            }}>
              Action Type
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

          {/* Content Type (for hide action) */}
          {actionType === 'hide' && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                color: theme.text,
                marginBottom: 8,
                fontFamily: 'Inter_500Medium'
              }}>
                Content Type
              </Text>
              <View style={{ flexDirection: 'row' }}>
                {contentTypes.map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    onPress={() => setTargetType(type.key as any)}
                    style={{
                      flex: 1,
                      padding: 12,
                      backgroundColor: targetType === type.key ? theme.primary : theme.card,
                      borderRadius: 8,
                      marginRight: type.key === 'post' ? 8 : 0,
                      borderWidth: 1,
                      borderColor: targetType === type.key ? theme.primary : theme.border,
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{
                      color: targetType === type.key ? '#FFFFFF' : theme.text,
                      fontWeight: '500',
                      fontFamily: 'Inter_500Medium'
                    }}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Target ID (for content actions) */}
          {actionType === 'hide' && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                color: theme.text,
                marginBottom: 8,
                fontFamily: 'Inter_500Medium'
              }}>
                {targetType === 'post' ? 'Post ID' : 'Reply ID'}
              </Text>
              <TextInput
                value={targetId}
                onChangeText={setTargetId}
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 8,
                  padding: 12,
                  color: theme.text,
                  borderWidth: 1,
                  borderColor: theme.border,
                  fontFamily: 'Inter_400Regular'
                }}
                placeholder={`Enter ${targetType} ID to hide`}
                placeholderTextColor={theme.textSecondary}
              />
            </View>
          )}

          {/* Target Wallet (for user actions) */}
          {(actionType === 'warn' || actionType === 'suspend' || actionType === 'unsuspend') && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                color: theme.text,
                marginBottom: 8,
                fontFamily: 'Inter_500Medium'
              }}>
                User Wallet Address
              </Text>
              <TextInput
                value={targetWallet}
                onChangeText={setTargetWallet}
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 8,
                  padding: 12,
                  color: theme.text,
                  borderWidth: 1,
                  borderColor: theme.border,
                  fontFamily: 'Inter_400Regular'
                }}
                placeholder="Enter user wallet address"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
          )}

          {/* Suspension Duration */}
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
                value={duration}
                onChangeText={setDuration}
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
              <Text style={{
                fontSize: 12,
                color: theme.textSecondary,
                marginTop: 4,
                fontFamily: 'Inter_400Regular'
              }}>
                1-8760 hours (1 hour to 1 year)
              </Text>
            </View>
          )}

          {/* Reason */}
          <View style={{ marginBottom: 40 }}>
            <Text style={{
              fontSize: 14,
              fontWeight: '500',
              color: theme.text,
              marginBottom: 8,
              fontFamily: 'Inter_500Medium'
            }}>
              Reason *
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              style={{
                backgroundColor: theme.card,
                borderRadius: 8,
                padding: 12,
                color: theme.text,
                borderWidth: 1,
                borderColor: theme.border,
                minHeight: 100,
                textAlignVertical: 'top',
                fontFamily: 'Inter_400Regular'
              }}
              placeholder={`Explain why you're ${actionType === 'hide' ? 'hiding this content' : 
                actionType === 'warn' ? 'warning this user' :
                actionType === 'suspend' ? 'suspending this user' :
                'unsuspending this user'}...`}
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          {/* Warning Box */}
          <View style={{
            backgroundColor: '#FFF3CD',
            borderColor: '#F39C12',
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'flex-start'
          }}>
            <Ionicons name="warning" size={20} color="#F39C12" style={{ marginRight: 8, marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{
                color: '#8B6F00',
                fontSize: 14,
                fontWeight: '600',
                marginBottom: 4,
                fontFamily: 'Inter_600SemiBold'
              }}>
                Warning
              </Text>
              <Text style={{
                color: '#8B6F00',
                fontSize: 12,
                lineHeight: 16,
                fontFamily: 'Inter_400Regular'
              }}>
                This action will be logged and cannot be undone. Make sure you have reviewed the content/user carefully.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}