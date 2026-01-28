/**
 * Leveling System for Trading Journal
 *
 * XP is earned by completing daily and weekly challenges.
 * As traders accumulate XP, they level up and earn new titles.
 */

export interface TraderLevel {
  level: number;
  title: string;
  minXP: number;
  maxXP: number; // XP needed to reach next level
  badge: string; // Emoji badge for the level
  color: string; // Tailwind color class
}

// Define all trader levels and their XP thresholds
// XP requirements increase progressively
export const TRADER_LEVELS: TraderLevel[] = [
  { level: 1, title: "Rookie", minXP: 0, maxXP: 100, badge: "🌱", color: "text-gray-500" },
  { level: 2, title: "Apprentice", minXP: 100, maxXP: 250, badge: "📚", color: "text-green-500" },
  { level: 3, title: "Novice Trader", minXP: 250, maxXP: 500, badge: "📈", color: "text-green-600" },
  { level: 4, title: "Journeyman", minXP: 500, maxXP: 850, badge: "⚡", color: "text-blue-500" },
  { level: 5, title: "Skilled Trader", minXP: 850, maxXP: 1300, badge: "🎯", color: "text-blue-600" },
  { level: 6, title: "Experienced", minXP: 1300, maxXP: 1900, badge: "💪", color: "text-purple-500" },
  { level: 7, title: "Veteran", minXP: 1900, maxXP: 2600, badge: "🏆", color: "text-purple-600" },
  { level: 8, title: "Expert Trader", minXP: 2600, maxXP: 3500, badge: "⭐", color: "text-yellow-500" },
  { level: 9, title: "Master Trader", minXP: 3500, maxXP: 4600, badge: "🌟", color: "text-yellow-600" },
  { level: 10, title: "Elite Trader", minXP: 4600, maxXP: 6000, badge: "💎", color: "text-cyan-500" },
  { level: 11, title: "Champion", minXP: 6000, maxXP: 7700, badge: "👑", color: "text-amber-500" },
  { level: 12, title: "Legend", minXP: 7700, maxXP: 9700, badge: "🔥", color: "text-orange-500" },
  { level: 13, title: "Grandmaster", minXP: 9700, maxXP: 12000, badge: "🏅", color: "text-red-500" },
  { level: 14, title: "Trading Sage", minXP: 12000, maxXP: 15000, badge: "🧙", color: "text-indigo-500" },
  { level: 15, title: "Market Wizard", minXP: 15000, maxXP: Infinity, badge: "✨", color: "text-pink-500" },
];

/**
 * Get the level data for a given XP amount
 */
export function getLevelFromXP(totalXP: number): TraderLevel {
  // Find the highest level the user has reached
  for (let i = TRADER_LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= TRADER_LEVELS[i].minXP) {
      return TRADER_LEVELS[i];
    }
  }
  return TRADER_LEVELS[0];
}

/**
 * Get the next level data (or null if at max level)
 */
export function getNextLevel(currentLevel: number): TraderLevel | null {
  const nextLevelData = TRADER_LEVELS.find(l => l.level === currentLevel + 1);
  return nextLevelData || null;
}

/**
 * Calculate progress to next level as a percentage
 */
export function getLevelProgress(totalXP: number): number {
  const currentLevel = getLevelFromXP(totalXP);
  const nextLevel = getNextLevel(currentLevel.level);

  if (!nextLevel) {
    return 100; // Max level reached
  }

  const xpInCurrentLevel = totalXP - currentLevel.minXP;
  const xpRequiredForLevel = nextLevel.minXP - currentLevel.minXP;

  return Math.min(100, Math.round((xpInCurrentLevel / xpRequiredForLevel) * 100));
}

/**
 * Get XP needed for next level
 */
export function getXPToNextLevel(totalXP: number): number {
  const currentLevel = getLevelFromXP(totalXP);
  const nextLevel = getNextLevel(currentLevel.level);

  if (!nextLevel) {
    return 0; // Max level reached
  }

  return nextLevel.minXP - totalXP;
}

/**
 * Check if user leveled up
 */
export function checkLevelUp(previousXP: number, newXP: number): TraderLevel | null {
  const previousLevel = getLevelFromXP(previousXP);
  const newLevel = getLevelFromXP(newXP);

  if (newLevel.level > previousLevel.level) {
    return newLevel;
  }

  return null;
}

/**
 * Format XP with comma separators
 */
export function formatXP(xp: number): string {
  return xp.toLocaleString();
}

/**
 * Get a motivational message based on level progress
 */
export function getLevelMotivation(totalXP: number): string {
  const progress = getLevelProgress(totalXP);
  const xpToNext = getXPToNextLevel(totalXP);
  const currentLevel = getLevelFromXP(totalXP);
  const nextLevel = getNextLevel(currentLevel.level);

  if (!nextLevel) {
    return "You've reached the highest level! You're a true Market Wizard!";
  }

  if (progress >= 90) {
    return `Almost there! Just ${xpToNext} XP to become a ${nextLevel.title}!`;
  } else if (progress >= 75) {
    return `Great progress! ${xpToNext} XP to ${nextLevel.title}`;
  } else if (progress >= 50) {
    return `Halfway to ${nextLevel.title}! Keep it up!`;
  } else if (progress >= 25) {
    return `Making progress! ${xpToNext} XP to go`;
  } else {
    return `${xpToNext} XP until ${nextLevel.title}`;
  }
}

/**
 * Calculate total possible XP from challenges per week
 * This helps users understand the XP economy
 */
export function getWeeklyXPPotential(dailyChallengeXP: number, weeklyChallengeXP: number): number {
  // Daily challenges reset each day, so 7 days worth
  // Weekly challenges are one-time per week
  return (dailyChallengeXP * 7) + weeklyChallengeXP;
}
