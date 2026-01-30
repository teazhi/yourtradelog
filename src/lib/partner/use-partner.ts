/**
 * Partner Hook - Real-time partner data management
 * Provides state management and real-time subscriptions for the partner feature
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import * as partnerService from './partner-service';
import type {
  AccountabilityPartnership,
  PartnerRule,
  PartnerChallenge,
  PartnerCheckIn,
  PartnerBalance,
  PartnerStats,
  TodayStatus,
  PartnerNotification,
  PartnerProfile,
  PartnerRuleInsert,
  PartnerChallengeInsert,
  PartnerCheckInInsert,
  RuleViolationInsert,
} from '@/types/partner';

interface UsePartnerState {
  isLoading: boolean;
  error: string | null;
  currentUserId: string | null;
  currentUsername: string | null;
  partnership: AccountabilityPartnership | null;
  partnerProfile: PartnerProfile | null;
  pendingRequests: AccountabilityPartnership[];
  rules: PartnerRule[];
  activeChallenges: PartnerChallenge[];
  pastChallenges: PartnerChallenge[];
  todayStatus: TodayStatus;
  balance: PartnerBalance | null;
  stats: PartnerStats;
  notifications: PartnerNotification[];
  unreadCount: number;
}

interface UsePartnerActions {
  refresh: () => Promise<void>;
  searchUser: (username: string) => Promise<PartnerProfile | null>;
  sendRequest: (partnerId: string) => Promise<{ success: boolean; error?: string }>;
  respondToRequest: (requestId: string, accept: boolean) => Promise<{ success: boolean; error?: string }>;
  endPartnership: () => Promise<{ success: boolean; error?: string }>;
  createRule: (rule: Omit<PartnerRuleInsert, 'partnership_id' | 'created_by'>) => Promise<{ success: boolean; error?: string }>;
  deleteRule: (ruleId: string) => Promise<{ success: boolean; error?: string }>;
  reportViolation: (ruleId: string, notes?: string) => Promise<{ success: boolean; error?: string }>;
  createChallenge: (challenge: Omit<PartnerChallengeInsert, 'partnership_id' | 'created_by'>) => Promise<{ success: boolean; error?: string }>;
  updateProgress: (challengeId: string, progress: number) => Promise<{ success: boolean; error?: string }>;
  incrementProgress: (challengeId: string) => Promise<{ success: boolean; error?: string }>;
  submitCheckIn: (checkIn: Omit<PartnerCheckInInsert, 'partnership_id' | 'user_id'>) => Promise<{ success: boolean; error?: string }>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const initialStats: PartnerStats = {
  total_challenges: 0,
  challenges_won: 0,
  challenges_lost: 0,
  win_rate: 0,
  total_earned: 0,
  total_lost: 0,
  net_profit: 0,
  current_streak: 0,
  longest_streak: 0,
  total_violations: 0,
  total_violation_amount: 0,
};

const initialTodayStatus: TodayStatus = {
  pre_market_done: false,
  post_market_done: false,
  partner_pre_market_done: false,
  partner_post_market_done: false,
};

export function usePartner(): [UsePartnerState, UsePartnerActions] {
  const [state, setState] = useState<UsePartnerState>({
    isLoading: true,
    error: null,
    currentUserId: null,
    currentUsername: null,
    partnership: null,
    partnerProfile: null,
    pendingRequests: [],
    rules: [],
    activeChallenges: [],
    pastChallenges: [],
    todayStatus: initialTodayStatus,
    balance: null,
    stats: initialStats,
    notifications: [],
    unreadCount: 0,
  });

  const subscriptionsRef = useRef<(() => void)[]>([]);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchAllData = useCallback(async () => {
    try {
      const user = await partnerService.getCurrentUser();
      if (!user) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const [partnership, pendingRequests, notifications] = await Promise.all([
        partnerService.getActivePartnership(user.id),
        partnerService.getPendingRequests(user.id),
        partnerService.getNotifications(user.id),
      ]);

      let rules: PartnerRule[] = [];
      let activeChallenges: PartnerChallenge[] = [];
      let pastChallenges: PartnerChallenge[] = [];
      let todayStatus: TodayStatus = initialTodayStatus;
      let balance: PartnerBalance | null = null;
      let stats: PartnerStats = initialStats;

      if (partnership) {
        const [rulesData, challengesData, todayData, balanceData, statsData] = await Promise.all([
          partnerService.getRules(partnership.id, user.id),
          partnerService.getChallenges(partnership.id, user.id),
          partnerService.getTodayCheckIns(partnership.id, user.id),
          partnerService.getPartnerBalance(partnership.id, user.id),
          partnerService.getPartnerStats(partnership.id, user.id),
        ]);

        rules = rulesData;
        activeChallenges = challengesData.active;
        pastChallenges = challengesData.past;
        todayStatus = todayData;
        balance = balanceData;
        stats = statsData;
      }

      setState({
        isLoading: false,
        error: null,
        currentUserId: user.id,
        currentUsername: user.username,
        partnership,
        partnerProfile: partnership?.partner_profile || null,
        pendingRequests,
        rules,
        activeChallenges,
        pastChallenges,
        todayStatus,
        balance,
        stats,
        notifications,
        unreadCount: notifications.filter(n => !n.is_read).length,
      });
    } catch (err) {
      console.error('Error fetching partner data:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load partner data',
      }));
    }
  }, []);

  // ============================================================================
  // Real-time Subscriptions
  // ============================================================================

  const setupSubscriptions = useCallback(() => {
    if (!state.currentUserId) return;

    const supabase = createClient();
    const cleanups: (() => void)[] = [];

    // Subscribe to partnership changes
    const partnershipChannel = supabase
      .channel('partnership-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accountability_partners',
          filter: `user_id=eq.${state.currentUserId}`,
        },
        () => fetchAllData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accountability_partners',
          filter: `partner_id=eq.${state.currentUserId}`,
        },
        () => fetchAllData()
      )
      .subscribe();

    cleanups.push(() => supabase.removeChannel(partnershipChannel));

    if (state.partnership) {
      // Subscribe to rules changes
      const rulesChannel = supabase
        .channel('rules-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'partner_rules',
            filter: `partnership_id=eq.${state.partnership.id}`,
          },
          () => fetchAllData()
        )
        .subscribe();

      cleanups.push(() => supabase.removeChannel(rulesChannel));

      // Subscribe to violations
      const violationsChannel = supabase
        .channel('violations-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'partner_rule_violations',
          },
          () => fetchAllData()
        )
        .subscribe();

      cleanups.push(() => supabase.removeChannel(violationsChannel));

      // Subscribe to challenges
      const challengesChannel = supabase
        .channel('challenges-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'partner_challenges',
            filter: `partnership_id=eq.${state.partnership.id}`,
          },
          () => fetchAllData()
        )
        .subscribe();

      cleanups.push(() => supabase.removeChannel(challengesChannel));

      // Subscribe to progress
      const progressChannel = supabase
        .channel('progress-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'partner_challenge_progress',
          },
          () => fetchAllData()
        )
        .subscribe();

      cleanups.push(() => supabase.removeChannel(progressChannel));

      // Subscribe to check-ins
      const checkInsChannel = supabase
        .channel('checkins-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'partner_check_ins',
            filter: `partnership_id=eq.${state.partnership.id}`,
          },
          () => fetchAllData()
        )
        .subscribe();

      cleanups.push(() => supabase.removeChannel(checkInsChannel));
    }

    // Subscribe to notifications
    const notificationsChannel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'partner_notifications',
          filter: `user_id=eq.${state.currentUserId}`,
        },
        () => fetchAllData()
      )
      .subscribe();

    cleanups.push(() => supabase.removeChannel(notificationsChannel));

    subscriptionsRef.current = cleanups;
  }, [state.currentUserId, state.partnership?.id, fetchAllData]);

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    setupSubscriptions();

    return () => {
      subscriptionsRef.current.forEach(cleanup => cleanup());
      subscriptionsRef.current = [];
    };
  }, [setupSubscriptions]);

  // ============================================================================
  // Actions
  // ============================================================================

  const actions: UsePartnerActions = {
    refresh: fetchAllData,

    searchUser: async (username: string) => {
      return partnerService.searchUserByUsername(username);
    },

    sendRequest: async (partnerId: string) => {
      if (!state.currentUserId) return { success: false, error: 'Not logged in' };
      const result = await partnerService.sendPartnerRequest(state.currentUserId, partnerId);
      if (result.success) await fetchAllData();
      return result;
    },

    respondToRequest: async (requestId: string, accept: boolean) => {
      const result = await partnerService.respondToRequest(requestId, accept);
      if (result.success) await fetchAllData();
      return result;
    },

    endPartnership: async () => {
      if (!state.partnership) return { success: false, error: 'No active partnership' };
      const result = await partnerService.endPartnership(state.partnership.id);
      if (result.success) await fetchAllData();
      return result;
    },

    createRule: async (rule) => {
      if (!state.partnership || !state.currentUserId) {
        return { success: false, error: 'No active partnership' };
      }
      const result = await partnerService.createRule({
        ...rule,
        partnership_id: state.partnership.id,
        created_by: state.currentUserId,
      });
      if (result.success) await fetchAllData();
      return result;
    },

    deleteRule: async (ruleId: string) => {
      const result = await partnerService.deleteRule(ruleId);
      if (result.success) await fetchAllData();
      return result;
    },

    reportViolation: async (ruleId: string, notes?: string) => {
      if (!state.currentUserId) return { success: false, error: 'Not logged in' };

      const rule = state.rules.find(r => r.id === ruleId);
      if (!rule) return { success: false, error: 'Rule not found' };

      const result = await partnerService.reportViolation({
        rule_id: ruleId,
        user_id: state.currentUserId,
        reported_by: state.currentUserId,
        amount_owed: rule.stake_amount,
        notes,
      });
      if (result.success) await fetchAllData();
      return result;
    },

    createChallenge: async (challenge) => {
      if (!state.partnership || !state.currentUserId) {
        return { success: false, error: 'No active partnership' };
      }
      const result = await partnerService.createChallenge({
        ...challenge,
        partnership_id: state.partnership.id,
        created_by: state.currentUserId,
      });
      if (result.success) await fetchAllData();
      return result;
    },

    updateProgress: async (challengeId: string, progress: number) => {
      if (!state.currentUserId) return { success: false, error: 'Not logged in' };
      const result = await partnerService.updateChallengeProgress(challengeId, state.currentUserId, progress);
      if (result.success) await fetchAllData();
      return result;
    },

    incrementProgress: async (challengeId: string) => {
      if (!state.currentUserId) return { success: false, error: 'Not logged in' };
      const challenge = state.activeChallenges.find(c => c.id === challengeId);
      if (!challenge) return { success: false, error: 'Challenge not found' };
      const newProgress = (challenge.my_progress || 0) + 1;
      const result = await partnerService.updateChallengeProgress(challengeId, state.currentUserId, newProgress);
      if (result.success) await fetchAllData();
      return result;
    },

    submitCheckIn: async (checkIn) => {
      if (!state.partnership || !state.currentUserId) {
        return { success: false, error: 'No active partnership' };
      }
      const result = await partnerService.createCheckIn({
        ...checkIn,
        partnership_id: state.partnership.id,
        user_id: state.currentUserId,
      });
      if (result.success) await fetchAllData();
      return result;
    },

    markNotificationRead: async (notificationId: string) => {
      await partnerService.markNotificationRead(notificationId);
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));
    },

    markAllNotificationsRead: async () => {
      if (!state.currentUserId) return;
      await partnerService.markAllNotificationsRead(state.currentUserId);
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0,
      }));
    },
  };

  return [state, actions];
}

export default usePartner;
