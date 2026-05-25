export interface RankInfo {
  level: number
  xpNeededForNext: number
  progressPercent: number
  rankName: string
  badgeClass: string
  badgeStyle: Record<string, string>
}

export function getRankInfo(xp: number = 0): RankInfo {
  // Level progression curve: Level = floor(sqrt(XP / 100)) + 1
  // Meaning:
  // Lvl 1: 0 XP
  // Lvl 2: 100 XP
  // Lvl 3: 400 XP
  // Lvl 4: 900 XP
  // Lvl 5: 1600 XP etc.
  const level = Math.floor(Math.sqrt(xp / 100)) + 1
  
  const currentLevelXp = Math.pow(level - 1, 2) * 100
  const nextLevelXp = Math.pow(level, 2) * 100
  const xpInCurrentLevel = xp - currentLevelXp
  const xpNeededInCurrentLevel = nextLevelXp - currentLevelXp
  const progressPercent = Math.min(Math.round((xpInCurrentLevel / xpNeededInCurrentLevel) * 100), 100)
  const xpNeededForNext = nextLevelXp - xp

  let rankName = 'Çaylak'
  let badgeClass = 'border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400'
  let badgeStyle: Record<string, string> = {}

  if (level >= 31) {
    rankName = 'Efsane 👑'
    // Gold gradient, animated pulsing ring shadow
    badgeClass = 'border-amber-500/30 text-amber-600 dark:text-amber-400 font-black animate-pulse'
    badgeStyle = {
      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.25))',
      boxShadow: '0 0 10px rgba(245, 158, 11, 0.3), inset 0 0 4px rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(245, 158, 11, 0.4)'
    }
  } else if (level >= 16) {
    rankName = 'Bilgi Kaynağı 🔮'
    // Purple glassmorphism
    badgeClass = 'border-purple-500/30 text-purple-600 dark:text-purple-400 font-extrabold shadow-sm'
    badgeStyle = {
      background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.12), rgba(79, 70, 229, 0.18))',
      boxShadow: '0 0 8px rgba(147, 51, 234, 0.15)',
      border: '1px solid rgba(147, 51, 234, 0.3)'
    }
  } else if (level >= 6) {
    rankName = 'Gezgin 🧭'
    // Emerald
    badgeClass = 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-bold'
  }

  return {
    level,
    xpNeededForNext,
    progressPercent,
    rankName,
    badgeClass,
    badgeStyle
  }
}
