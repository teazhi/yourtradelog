/**
 * Partner Accountability Service
 * Handles all database operations for the partner feature
 */

import { createClient } from '@/lib/supabase/client';
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
} from '@/types/partner';

// Type helpers for Supabase queries - tables not yet in generated types
type AnyRow = Record<string, unknown>;

// ============================================================================
// Partnership Operations
// ============================================================================

export async function getActivePartnership(userId: string): Promise<AccountabilityPartnership | null> {
  const supabase = createClient();

  const { data, error } = await (supabase
    .from('accountability_partners') as any)
    .select('*')
    .or(`user_id.eq.${userId},partner_id.eq.${userId}`)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (error || !data) return null;

  // Get partner profile
  const partnerId = data.user_id === userId ? data.partner_id : data.user_id;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('id', partnerId)
    .single();

  return {
    ...data,
    partner_profile: (profile || undefined) as PartnerProfile | undefined,
  } as AccountabilityPartnership;
}

export async function getPendingRequests(userId: string): Promise<AccountabilityPartnership[]> {
  const supabase = createClient();

  // Get requests where I'm the partner (receiving requests)
  const { data: incoming, error: incomingError } = await (supabase
    .from('accountability_partners') as any)
    .select('*')
    .eq('partner_id', userId)
    .eq('status', 'pending');

  if (incomingError || !incoming) return [];

  // Get requester profiles
  const requesterIds = incoming.map((r: AnyRow) => r.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', requesterIds as string[]);

  return incoming.map((request: AnyRow) => ({
    ...request,
    partner_profile: profiles?.find((p: AnyRow) => p.id === request.user_id) as PartnerProfile | undefined,
  })) as AccountabilityPartnership[];
}

export async function searchUserByUsername(username: string): Promise<PartnerProfile | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .ilike('username', username.toLowerCase().trim())
    .single();

  if (error || !data) return null;
  return data as unknown as PartnerProfile;
}

export async function sendPartnerRequest(userId: string, partnerId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  // Check if partnership already exists
  const { data: existing } = await (supabase
    .from('accountability_partners') as any)
    .select('id, status')
    .or(`and(user_id.eq.${userId},partner_id.eq.${partnerId}),and(user_id.eq.${partnerId},partner_id.eq.${userId})`)
    .limit(1);

  if (existing && existing.length > 0) {
    const status = (existing[0] as AnyRow).status;
    if (status === 'active') return { success: false, error: 'Partnership already exists' };
    if (status === 'pending') return { success: false, error: 'Request already pending' };
  }

  const { error } = await (supabase
    .from('accountability_partners') as any)
    .insert({
      user_id: userId,
      partner_id: partnerId,
      status: 'pending',
    });

  if (error) return { success: false, error: error.message };

  // Create notification for partner
  await createNotification(partnerId, null, 'partner_request', 'New Partner Request', 'Someone wants to be your accountability partner!');

  return { success: true };
}

export async function respondToRequest(requestId: string, accept: boolean): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  if (accept) {
    const { error } = await (supabase
      .from('accountability_partners') as any)
      .update({ status: 'active' })
      .eq('id', requestId);

    if (error) return { success: false, error: error.message };

    // Get the request to notify the sender
    const { data: request } = await (supabase
      .from('accountability_partners') as any)
      .select('user_id')
      .eq('id', requestId)
      .single();

    if (request) {
      await createNotification((request as AnyRow).user_id as string, requestId, 'partner_accepted', 'Partner Request Accepted!', 'Your partnership is now active. Start competing!');
    }
  } else {
    const { error } = await (supabase
      .from('accountability_partners') as any)
      .delete()
      .eq('id', requestId);

    if (error) return { success: false, error: error.message };
  }

  return { success: true };
}

export async function endPartnership(partnershipId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  // Get both users for notification
  const { data: partnership } = await (supabase
    .from('accountability_partners') as any)
    .select('user_id, partner_id')
    .eq('id', partnershipId)
    .single();

  const { error } = await (supabase
    .from('accountability_partners') as any)
    .update({ status: 'ended' })
    .eq('id', partnershipId);

  if (error) return { success: false, error: error.message };

  // Notify both users
  if (partnership) {
    const p = partnership as AnyRow;
    await createNotification(p.user_id as string, partnershipId, 'partnership_ended', 'Partnership Ended', 'Your accountability partnership has ended.');
    await createNotification(p.partner_id as string, partnershipId, 'partnership_ended', 'Partnership Ended', 'Your accountability partnership has ended.');
  }

  return { success: true };
}

// ============================================================================
// Rules Operations
// ============================================================================

export async function getRules(partnershipId: string, userId: string): Promise<PartnerRule[]> {
  const supabase = createClient();

  const { data: rules, error } = await (supabase
    .from('partner_rules') as any)
    .select('*')
    .eq('partnership_id', partnershipId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error || !rules) return [];

  // Get violation counts for each rule
  const rulesWithCounts = await Promise.all(
    (rules as AnyRow[]).map(async (rule) => {
      const { data: violations } = await (supabase
        .from('partner_rule_violations') as any)
        .select('user_id, amount_owed, is_settled')
        .eq('rule_id', rule.id)
        .eq('is_settled', false);

      const violationList = (violations || []) as AnyRow[];
      const myViolations = violationList.filter(v => v.user_id === userId).length;
      const partnerViolations = violationList.filter(v => v.user_id !== userId).length;
      const totalOwedByMe = violationList.filter(v => v.user_id === userId).reduce((sum, v) => sum + Number(v.amount_owed), 0);
      const totalOwedToMe = violationList.filter(v => v.user_id !== userId).reduce((sum, v) => sum + Number(v.amount_owed), 0);

      return {
        ...rule,
        stake_amount: Number(rule.stake_amount),
        my_violations: myViolations,
        partner_violations: partnerViolations,
        total_owed_by_me: totalOwedByMe,
        total_owed_to_me: totalOwedToMe,
      } as PartnerRule;
    })
  );

  return rulesWithCounts;
}

export async function createRule(rule: {
  partnership_id: string;
  created_by: string;
  title: string;
  description?: string;
  stake_amount: number;
}): Promise<{ success: boolean; rule?: PartnerRule; error?: string }> {
  const supabase = createClient();

  const { data, error } = await (supabase
    .from('partner_rules') as any)
    .insert(rule)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Notify partner
  const { data: partnership } = await (supabase
    .from('accountability_partners') as any)
    .select('user_id, partner_id')
    .eq('id', rule.partnership_id)
    .single();

  if (partnership) {
    const p = partnership as AnyRow;
    const partnerId = p.user_id === rule.created_by ? p.partner_id : p.user_id;
    await createNotification(partnerId as string, rule.partnership_id, 'new_rule', 'New Rule Added', `"${rule.title}" - $${rule.stake_amount} stake`);
  }

  return { success: true, rule: { ...(data as AnyRow), stake_amount: Number((data as AnyRow).stake_amount) } as PartnerRule };
}

export async function updateRule(ruleId: string, updates: Partial<{ title: string; description: string; stake_amount: number; is_active: boolean }>): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await (supabase
    .from('partner_rules') as any)
    .update(updates)
    .eq('id', ruleId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteRule(ruleId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  // Soft delete by setting is_active to false
  const { error } = await (supabase
    .from('partner_rules') as any)
    .update({ is_active: false })
    .eq('id', ruleId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================================================
// Violation Operations
// ============================================================================

export async function reportViolation(violation: {
  rule_id: string;
  user_id: string;
  reported_by: string;
  amount_owed: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await (supabase
    .from('partner_rule_violations') as any)
    .insert(violation);

  if (error) return { success: false, error: error.message };

  // Get rule details for notification
  const { data: rule } = await (supabase
    .from('partner_rules') as any)
    .select('title, partnership_id')
    .eq('id', violation.rule_id)
    .single();

  // Get partner to notify
  if (rule) {
    const r = rule as AnyRow;
    const { data: partnership } = await (supabase
      .from('accountability_partners') as any)
      .select('user_id, partner_id')
      .eq('id', r.partnership_id)
      .single();

    if (partnership) {
      const p = partnership as AnyRow;
      const partnerId = violation.user_id === p.user_id ? p.partner_id : p.user_id;
      await createNotification(
        partnerId as string,
        r.partnership_id as string,
        'rule_violation',
        'Rule Violation Reported',
        `Partner broke "${r.title}" - $${violation.amount_owed} owed`
      );
    }
  }

  return { success: true };
}

export async function settleViolation(violationId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await (supabase
    .from('partner_rule_violations') as any)
    .update({ is_settled: true, settled_at: new Date().toISOString() })
    .eq('id', violationId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================================================
// Challenge Operations
// ============================================================================

export async function getChallenges(partnershipId: string, userId: string): Promise<{ active: PartnerChallenge[]; past: PartnerChallenge[] }> {
  const supabase = createClient();

  const { data: challenges, error } = await (supabase
    .from('partner_challenges') as any)
    .select('*')
    .eq('partnership_id', partnershipId)
    .order('created_at', { ascending: false });

  if (error || !challenges) return { active: [], past: [] };

  // Get progress for all challenges
  const challengeList = challenges as AnyRow[];
  const challengeIds = challengeList.map(c => c.id as string);
  const { data: progress } = await (supabase
    .from('partner_challenge_progress') as any)
    .select('*')
    .in('challenge_id', challengeIds);

  // Get partner info
  const { data: partnership } = await (supabase
    .from('accountability_partners') as any)
    .select('user_id, partner_id')
    .eq('id', partnershipId)
    .single();

  const p = partnership as AnyRow | null;
  const partnerId = p?.user_id === userId ? p?.partner_id : p?.user_id;

  const progressList = (progress || []) as AnyRow[];

  const enrichedChallenges = challengeList.map(challenge => {
    const myProgress = progressList.find(pr => pr.challenge_id === challenge.id && pr.user_id === userId);
    const partnerProgress = progressList.find(pr => pr.challenge_id === challenge.id && pr.user_id === partnerId);
    const daysRemaining = Math.max(0, Math.ceil((new Date(challenge.end_date as string).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    return {
      ...challenge,
      stake_amount: Number(challenge.stake_amount),
      target_value: Number(challenge.target_value),
      my_progress: Number(myProgress?.progress_value || 0),
      partner_progress: Number(partnerProgress?.progress_value || 0),
      days_remaining: daysRemaining,
      is_my_challenge: challenge.created_by === userId,
      i_am_winning: Number(myProgress?.progress_value || 0) > Number(partnerProgress?.progress_value || 0),
    } as PartnerChallenge;
  });

  const now = new Date();
  const active = enrichedChallenges.filter(c =>
    c.status === 'active' || (c.status === 'pending' && new Date(c.start_date) <= now && new Date(c.end_date) >= now)
  );
  const past = enrichedChallenges.filter(c => c.status === 'completed' || c.status === 'cancelled');

  return { active, past };
}

export async function createChallenge(challenge: {
  partnership_id: string;
  created_by: string;
  title: string;
  description?: string;
  challenge_type: string;
  metric?: string;
  target_value: number;
  stake_amount: number;
  start_date: string;
  end_date: string;
}): Promise<{ success: boolean; challenge?: PartnerChallenge; error?: string }> {
  const supabase = createClient();

  // Determine initial status
  const now = new Date();
  const startDate = new Date(challenge.start_date);
  const status = startDate <= now ? 'active' : 'pending';

  const { data, error } = await (supabase
    .from('partner_challenges') as any)
    .insert({ ...challenge, status })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Create initial progress records for both users
  const { data: partnership } = await (supabase
    .from('accountability_partners') as any)
    .select('user_id, partner_id')
    .eq('id', challenge.partnership_id)
    .single();

  if (partnership) {
    const p = partnership as AnyRow;
    const d = data as AnyRow;
    await (supabase.from('partner_challenge_progress') as any).insert([
      { challenge_id: d.id, user_id: p.user_id, progress_value: 0 },
      { challenge_id: d.id, user_id: p.partner_id, progress_value: 0 },
    ]);

    // Notify partner
    const partnerId = p.user_id === challenge.created_by ? p.partner_id : p.user_id;
    await createNotification(
      partnerId as string,
      challenge.partnership_id,
      'new_challenge',
      'New Challenge!',
      `"${challenge.title}" - $${challenge.stake_amount} stake`
    );
  }

  return {
    success: true,
    challenge: {
      ...(data as AnyRow),
      stake_amount: Number((data as AnyRow).stake_amount),
      target_value: Number((data as AnyRow).target_value),
      my_progress: 0,
      partner_progress: 0,
    } as PartnerChallenge
  };
}

export async function updateChallengeProgress(challengeId: string, usrId: string, progressValue: number): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await (supabase
    .from('partner_challenge_progress') as any)
    .upsert({
      challenge_id: challengeId,
      user_id: usrId,
      progress_value: progressValue,
      last_updated: new Date().toISOString(),
    }, { onConflict: 'challenge_id,user_id' });

  if (error) return { success: false, error: error.message };

  // Check if challenge should be completed
  const { data: challenge } = await (supabase
    .from('partner_challenges') as any)
    .select('*, partnership_id')
    .eq('id', challengeId)
    .single();

  if (challenge && progressValue >= Number((challenge as AnyRow).target_value)) {
    // Get partner to notify
    const { data: partnership } = await (supabase
      .from('accountability_partners') as any)
      .select('user_id, partner_id')
      .eq('id', (challenge as AnyRow).partnership_id)
      .single();

    if (partnership) {
      const p = partnership as AnyRow;
      const c = challenge as AnyRow;
      const partnerId = p.user_id === usrId ? p.partner_id : p.user_id;
      await createNotification(
        partnerId as string,
        c.partnership_id as string,
        'challenge_progress',
        'Challenge Update',
        `Your partner hit their target in "${c.title}"!`
      );
    }
  }

  return { success: true };
}

export async function completeChallenge(challengeId: string, winnerId: string | null, outcome: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await (supabase
    .from('partner_challenges') as any)
    .update({
      status: 'completed',
      winner_id: winnerId,
      outcome: outcome,
    })
    .eq('id', challengeId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================================================
// Check-In Operations
// ============================================================================

export async function getTodayCheckIns(partnershipId: string, userId: string): Promise<TodayStatus> {
  const supabase = createClient();
  // Use local timezone for "today" to match discipline page
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Get partnership to find partner ID
  const { data: partnership } = await (supabase
    .from('accountability_partners') as any)
    .select('user_id, partner_id')
    .eq('id', partnershipId)
    .single();

  const p = partnership as AnyRow | null;
  const partnerId = p?.user_id === userId ? p?.partner_id : p?.user_id;

  // Get both users' check-ins for today
  const { data: checkIns } = await (supabase
    .from('partner_check_ins') as any)
    .select('*')
    .eq('partnership_id', partnershipId)
    .eq('check_in_date', today);

  const checkInList = (checkIns || []) as AnyRow[];
  const myCheckIns = checkInList.filter(c => c.user_id === userId);
  const partnerCheckIns = checkInList.filter(c => c.user_id !== userId);

  // Check for weekly reviews in journal_entries for both users
  let myWeeklyReviewDone = false;
  let partnerWeeklyReviewDone = false;

  // Get my journal entry for today
  const { data: myJournal } = await supabase
    .from('journal_entries')
    .select('weekly_review_notes, weekly_wins, weekly_improvements')
    .eq('user_id', userId)
    .eq('entry_date', today)
    .single();

  if (myJournal) {
    const j = myJournal as AnyRow;
    myWeeklyReviewDone = !!(j.weekly_review_notes || j.weekly_wins || j.weekly_improvements);
  }

  // Get partner's journal entry for today
  if (partnerId) {
    const { data: partnerJournal } = await supabase
      .from('journal_entries')
      .select('weekly_review_notes, weekly_wins, weekly_improvements')
      .eq('user_id', partnerId as string)
      .eq('entry_date', today)
      .single();

    if (partnerJournal) {
      const j = partnerJournal as AnyRow;
      partnerWeeklyReviewDone = !!(j.weekly_review_notes || j.weekly_wins || j.weekly_improvements);
    }
  }

  return {
    pre_market_done: myCheckIns.some(c => c.check_in_type === 'pre_market'),
    post_market_done: myCheckIns.some(c => c.check_in_type === 'post_market'),
    partner_pre_market_done: partnerCheckIns.some(c => c.check_in_type === 'pre_market'),
    partner_post_market_done: partnerCheckIns.some(c => c.check_in_type === 'post_market'),
    my_check_in: myCheckIns[0] as unknown as PartnerCheckIn | undefined,
    partner_check_in: partnerCheckIns[0] as unknown as PartnerCheckIn | undefined,
    my_weekly_review_done: myWeeklyReviewDone,
    partner_weekly_review_done: partnerWeeklyReviewDone,
  };
}

export async function createCheckIn(checkIn: {
  partnership_id: string;
  user_id: string;
  check_in_date?: string;
  check_in_type: string;
  checked_calendar?: boolean;
  marked_levels?: boolean;
  has_bias?: boolean;
  set_max_loss?: boolean;
  trading_plan?: string;
  daily_pnl?: number;
  followed_rules?: boolean;
  session_notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await (supabase
    .from('partner_check_ins') as any)
    .upsert(checkIn, { onConflict: 'partnership_id,user_id,check_in_date,check_in_type' });

  if (error) return { success: false, error: error.message };

  // Notify partner
  const { data: partnership } = await (supabase
    .from('accountability_partners') as any)
    .select('user_id, partner_id')
    .eq('id', checkIn.partnership_id)
    .single();

  if (partnership) {
    const p = partnership as AnyRow;
    const partnerId = p.user_id === checkIn.user_id ? p.partner_id : p.user_id;
    const type = checkIn.check_in_type === 'pre_market' ? 'Pre-Market' : 'Post-Market';
    await createNotification(
      partnerId as string,
      checkIn.partnership_id,
      'partner_checked_in',
      `Partner Completed ${type}`,
      `Your partner finished their ${type.toLowerCase()} check-in!`
    );
  }

  return { success: true };
}

// ============================================================================
// Balance & Stats Operations
// ============================================================================

export async function getPartnerBalance(partnershipId: string, userId: string): Promise<PartnerBalance | null> {
  const supabase = createClient();

  // Get partnership users
  const { data: partnership } = await (supabase
    .from('accountability_partners') as any)
    .select('user_id, partner_id')
    .eq('id', partnershipId)
    .single();

  if (!partnership) return null;
  const p = partnership as AnyRow;

  // Get all rules for this partnership
  const { data: rules } = await (supabase
    .from('partner_rules') as any)
    .select('id')
    .eq('partnership_id', partnershipId);

  const ruleIds = ((rules || []) as AnyRow[]).map(r => r.id as string);

  if (ruleIds.length === 0) {
    return {
      user1_id: p.user_id as string,
      user2_id: p.partner_id as string,
      user1_owes: 0,
      user2_owes: 0,
      net_balance: 0,
    };
  }

  const { data: partnershipViolations } = await (supabase
    .from('partner_rule_violations') as any)
    .select('user_id, amount_owed')
    .in('rule_id', ruleIds)
    .eq('is_settled', false);

  const violationList = (partnershipViolations || []) as AnyRow[];

  const user1Owes = violationList
    .filter(v => v.user_id === p.user_id)
    .reduce((sum, v) => sum + Number(v.amount_owed), 0);

  const user2Owes = violationList
    .filter(v => v.user_id === p.partner_id)
    .reduce((sum, v) => sum + Number(v.amount_owed), 0);

  // Determine which is "me" and which is "partner"
  const iAmUser1 = userId === p.user_id;

  return {
    user1_id: p.user_id as string,
    user2_id: p.partner_id as string,
    user1_owes: iAmUser1 ? user1Owes : user2Owes,
    user2_owes: iAmUser1 ? user2Owes : user1Owes,
    net_balance: (iAmUser1 ? user1Owes : user2Owes) - (iAmUser1 ? user2Owes : user1Owes),
  };
}

export async function getPartnerStats(partnershipId: string, userId: string): Promise<PartnerStats> {
  const supabase = createClient();

  // Get all completed challenges
  const { data: challenges } = await (supabase
    .from('partner_challenges') as any)
    .select('*')
    .eq('partnership_id', partnershipId)
    .eq('status', 'completed');

  const challengeList = (challenges || []) as AnyRow[];
  const total = challengeList.length;
  const won = challengeList.filter(c => c.winner_id === userId).length;
  const lost = challengeList.filter(c => c.winner_id && c.winner_id !== userId).length;

  const earned = challengeList
    .filter(c => c.winner_id === userId)
    .reduce((sum, c) => sum + Number(c.stake_amount) * 2, 0);

  const lostAmount = challengeList
    .filter(c => c.winner_id && c.winner_id !== userId)
    .reduce((sum, c) => sum + Number(c.stake_amount), 0);

  // Get violations
  const { data: rules } = await (supabase
    .from('partner_rules') as any)
    .select('id')
    .eq('partnership_id', partnershipId);

  const ruleIds = ((rules || []) as AnyRow[]).map(r => r.id as string);

  let totalViolations = 0;
  let totalViolationAmount = 0;

  if (ruleIds.length > 0) {
    const { data: violations } = await (supabase
      .from('partner_rule_violations') as any)
      .select('amount_owed')
      .in('rule_id', ruleIds)
      .eq('user_id', userId);

    const violationList = (violations || []) as AnyRow[];
    totalViolations = violationList.length;
    totalViolationAmount = violationList.reduce((sum, v) => sum + Number(v.amount_owed), 0);
  }

  return {
    total_challenges: total,
    challenges_won: won,
    challenges_lost: lost,
    win_rate: total > 0 ? (won / total) * 100 : 0,
    total_earned: earned,
    total_lost: lostAmount + totalViolationAmount,
    net_profit: earned - lostAmount - totalViolationAmount,
    current_streak: 0, // TODO: Calculate streak
    longest_streak: 0,
    total_violations: totalViolations,
    total_violation_amount: totalViolationAmount,
  };
}

// ============================================================================
// Notification Operations
// ============================================================================

export async function createNotification(
  userId: string,
  partnershipId: string | null,
  type: string,
  title: string,
  message?: string
): Promise<void> {
  const supabase = createClient();

  await (supabase.from('partner_notifications') as any).insert({
    user_id: userId,
    partnership_id: partnershipId,
    notification_type: type,
    title,
    message,
  });
}

export async function getNotifications(userId: string, limit: number = 20): Promise<PartnerNotification[]> {
  const supabase = createClient();

  const { data, error } = await (supabase
    .from('partner_notifications') as any)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as PartnerNotification[];
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = createClient();

  await (supabase
    .from('partner_notifications') as any)
    .update({ is_read: true })
    .eq('id', notificationId);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const supabase = createClient();

  await (supabase
    .from('partner_notifications') as any)
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
}

// ============================================================================
// User Profile
// ============================================================================

export async function getCurrentUser(): Promise<{ id: string; username: string | null } | null> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    username: (profile as AnyRow | null)?.username as string | null ?? null,
  };
}
