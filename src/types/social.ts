/**
 * Social/Multiplayer types for the trading journal
 */

// ============================================================================
// User Profile Extensions
// ============================================================================

export interface SocialProfile {
  id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_public: boolean;
  show_pnl: boolean;
  show_stats: boolean;
  anonymous_mode: boolean;
  is_mentor: boolean;
  trading_style: TradingStyle | null;
  experience_level: ExperienceLevel | null;
  favorite_instruments: string[];
  created_at: string;
  // Computed fields (from joins/functions)
  follower_count?: number;
  following_count?: number;
  is_following?: boolean;
}

export type TradingStyle = 'scalper' | 'day_trader' | 'swing_trader';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional';

// ============================================================================
// Follows
// ============================================================================

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
  // Joined data
  follower?: SocialProfile;
  following?: SocialProfile;
}

// ============================================================================
// Squads (Trading Groups)
// ============================================================================

export interface Squad {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  owner_id: string;
  is_public: boolean;
  invite_code: string;
  max_members: number;
  created_at: string;
  updated_at: string;
  // Computed/joined
  member_count?: number;
  members?: SquadMember[];
  owner?: SocialProfile;
}

export interface SquadMember {
  id: string;
  squad_id: string;
  user_id: string;
  role: SquadRole;
  joined_at: string;
  // Joined data
  user?: SocialProfile;
}

export type SquadRole = 'owner' | 'admin' | 'member';

export interface SquadInsert {
  name: string;
  description?: string;
  avatar_url?: string;
  owner_id: string;
  is_public?: boolean;
  max_members?: number;
}

// ============================================================================
// Trade Visibility & Sharing
// ============================================================================

export type TradeVisibility = 'private' | 'squad' | 'followers' | 'public';

export interface SharedTrade {
  id: string;
  user_id: string;
  symbol: string;
  side: 'long' | 'short';
  entry_date: string;
  exit_date: string | null;
  entry_price: number;
  exit_price: number | null;
  net_pnl: number | null;
  r_multiple: number | null;
  visibility: TradeVisibility;
  shared_to_feed: boolean;
  share_analysis: string | null;
  created_at: string;
  // Joined data
  user?: SocialProfile;
  reactions?: TradeReaction[];
  comments?: TradeComment[];
  reaction_counts?: ReactionCounts;
}

// ============================================================================
// Reactions & Comments
// ============================================================================

export type ReactionType = 'like' | 'insightful' | 'great_entry' | 'great_exit' | 'learned';

export interface TradeReaction {
  id: string;
  trade_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
  user?: SocialProfile;
}

export interface ReactionCounts {
  like: number;
  insightful: number;
  great_entry: number;
  great_exit: number;
  learned: number;
  total: number;
}

export interface TradeComment {
  id: string;
  trade_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  is_mentor_feedback: boolean;
  created_at: string;
  updated_at: string;
  user?: SocialProfile;
  replies?: TradeComment[];
}

// ============================================================================
// Mentor/Student
// ============================================================================

export type MentorshipStatus = 'pending' | 'active' | 'declined' | 'ended';

export interface MentorRelationship {
  id: string;
  mentor_id: string;
  student_id: string;
  status: MentorshipStatus;
  mentor_notes: string | null;
  created_at: string;
  updated_at: string;
  mentor?: SocialProfile;
  student?: SocialProfile;
}

// ============================================================================
// Leaderboards
// ============================================================================

export type LeagueTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface WeeklyStats {
  id: string;
  user_id: string;
  week_start: string;
  total_trades: number;
  win_count: number;
  loss_count: number;
  total_pnl: number;
  avg_r_multiple: number | null;
  best_trade_pnl: number | null;
  worst_trade_pnl: number | null;
  consistency_score: number | null;
  league_tier: LeagueTier;
  created_at: string;
  // Joined
  user?: SocialProfile;
  rank?: number;
}

export interface LeaderboardEntry {
  rank: number;
  user: SocialProfile;
  stats: WeeklyStats;
}

export type LeaderboardMetric = 'total_pnl' | 'win_rate' | 'avg_r_multiple' | 'consistency_score' | 'trade_count';

// ============================================================================
// Squad Challenges
// ============================================================================

export type ChallengeMetric = 'total_pnl' | 'win_rate' | 'avg_r_multiple' | 'trade_count' | 'consistency';

export interface SquadChallenge {
  id: string;
  squad_id: string;
  name: string;
  description: string | null;
  metric: ChallengeMetric;
  start_date: string;
  end_date: string;
  created_by: string;
  winner_id: string | null;
  created_at: string;
  // Joined
  squad?: Squad;
  creator?: SocialProfile;
  winner?: SocialProfile;
  standings?: ChallengeStanding[];
}

export interface ChallengeStanding {
  user: SocialProfile;
  value: number;
  rank: number;
}

// ============================================================================
// Notifications
// ============================================================================

export type NotificationType =
  | 'new_follower'
  | 'trade_reaction'
  | 'trade_comment'
  | 'mentor_request'
  | 'mentor_feedback'
  | 'squad_invite'
  | 'challenge_started'
  | 'challenge_ended';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// ============================================================================
// Feed Types
// ============================================================================

export interface FeedItem {
  id: string;
  type: 'trade' | 'achievement' | 'milestone';
  trade?: SharedTrade;
  created_at: string;
}

export interface FeedFilters {
  instruments?: string[];
  side?: 'long' | 'short';
  outcome?: 'win' | 'loss' | 'breakeven';
  following_only?: boolean;
  squad_id?: string;
}
