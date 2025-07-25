import api from './api'

export interface ModerationDashboard {
  summary: {
    pendingReports: number
    hiddenPosts: number
    hiddenReplies: number
    suspendedUsers: number
  }
  recentActions: ModerationAction[]
  flaggedContent: {
    posts: any[]
    replies: any[]
  }
  timeframe: string
}

export interface ModerationAction {
  id: string
  moderatorWallet: string
  targetType: 'user' | 'post' | 'reply'
  targetId: string
  actionType: 'hide' | 'warn' | 'suspend' | 'unsuspend'
  reason: string
  duration?: number
  reportId?: string
  createdAt: string
  moderator: {
    walletAddress: string
    tier: string
  }
}

export interface Report {
  id: string
  reporterWallet: string
  targetType: 'post' | 'reply'
  targetId: string
  reason: string
  description?: string
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  moderatorNotes?: string
  resolvedAt?: string
  createdAt: string
  updatedAt: string
  reporter: {
    walletAddress: string
    tier: string
    genesisVerified: boolean
  }
}

class ModerationAPI {
  // Get moderation dashboard data
  async getDashboard(timeframe: string = '24h'): Promise<ModerationDashboard> {
    const response = await api.get(`/moderation/dashboard?timeframe=${timeframe}`)
    return response.data.data
  }

  // Hide content (post or reply)
  async hideContent(targetType: 'post' | 'reply', targetId: string, reason: string, reportId?: string) {
    const response = await api.post('/moderation/hide', {
      targetType,
      targetId,
      reason,
      reportId
    })
    return response.data
  }

  // Suspend user
  async suspendUser(targetWallet: string, reason: string, duration: number, reportId?: string) {
    const response = await api.post('/moderation/suspend', {
      targetWallet,
      reason,
      duration,
      reportId
    })
    return response.data
  }

  // Warn user
  async warnUser(targetWallet: string, reason: string, reportId?: string) {
    const response = await api.post('/moderation/warn', {
      targetWallet,
      reason,
      reportId
    })
    return response.data
  }

  // Unsuspend user
  async unsuspendUser(targetWallet: string, reason: string) {
    const response = await api.post('/moderation/unsuspend', {
      targetWallet,
      reason
    })
    return response.data
  }

  // Get moderation history for specific content
  async getModerationHistory(targetType: 'user' | 'post' | 'reply', targetId: string): Promise<ModerationAction[]> {
    const response = await api.get(`/moderation/history/${targetType}/${targetId}`)
    return response.data.data
  }

  // Get reports (inherited from existing API)
  async getReports(status?: string, targetType?: string, limit: number = 50, offset: number = 0) {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (targetType) params.append('targetType', targetType)
    params.append('limit', limit.toString())
    params.append('offset', offset.toString())

    const response = await api.get(`/reports?${params.toString()}`)
    return response.data
  }

  // Update report status (inherited from existing API)
  async updateReportStatus(reportId: string, status: string, moderatorNotes?: string) {
    const response = await api.put(`/reports/${reportId}/status`, {
      status,
      moderatorNotes
    })
    return response.data
  }
}

export const moderationAPI = new ModerationAPI()