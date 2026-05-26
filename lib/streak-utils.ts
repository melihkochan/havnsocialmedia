export function getIstanbulDateString(dateObj: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(dateObj); // "YYYY-MM-DD"
}

export function calculateLastActiveStreak(messages: any[]): { streak: number; latestMutualDate: string | null } {
  if (!messages || messages.length === 0) return { streak: 0, latestMutualDate: null };
  
  const sendersByDate = new Map<string, Set<string>>();
  for (const msg of messages) {
    const d = new Date(msg.created_at);
    const dateStr = getIstanbulDateString(d);
    if (!sendersByDate.has(dateStr)) {
      sendersByDate.set(dateStr, new Set<string>());
    }
    sendersByDate.get(dateStr)!.add(msg.sender_id);
  }
  
  const mutualDates = new Set<string>();
  for (const [dateStr, senders] of sendersByDate.entries()) {
    if (senders.size >= 2) {
      mutualDates.add(dateStr);
    }
  }
  
  if (mutualDates.size === 0) return { streak: 0, latestMutualDate: null };
  
  const sortedMutualDates = Array.from(mutualDates).sort((a, b) => b.localeCompare(a));
  const latestMutualDate = sortedMutualDates[0];
  
  let streak = 0;
  const parts = latestMutualDate.split('-');
  let currentDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  
  while (true) {
    const currentStr = getIstanbulDateString(currentDate);
    if (mutualDates.has(currentStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return { streak, latestMutualDate };
}

export function calculateStreak(messages: any[], restoredDate: string | null = null): number {
  if (!messages || messages.length === 0) return 0;
  
  const sendersByDate = new Map<string, Set<string>>();
  for (const msg of messages) {
    const d = new Date(msg.created_at);
    const dateStr = getIstanbulDateString(d);
    if (!sendersByDate.has(dateStr)) {
      sendersByDate.set(dateStr, new Set<string>());
    }
    sendersByDate.get(dateStr)!.add(msg.sender_id);
  }
  
  const mutualDates = new Set<string>();
  for (const [dateStr, senders] of sendersByDate.entries()) {
    if (senders.size >= 2) {
      mutualDates.add(dateStr);
    }
  }
  
  if (mutualDates.size === 0) return 0;
  
  let sortedMutualDates = Array.from(mutualDates).sort((a, b) => b.localeCompare(a));
  let latestMutualDate = sortedMutualDates[0];
  
  const todayStr = getIstanbulDateString(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getIstanbulDateString(yesterday);
  
  // If the streak is restored for this latestMutualDate, bridge the gap to today
  if (restoredDate && latestMutualDate === restoredDate) {
    const parts = latestMutualDate.split('-');
    let start = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const end = new Date();
    
    while (start <= end) {
      const bridgeStr = getIstanbulDateString(start);
      mutualDates.add(bridgeStr);
      start.setDate(start.getDate() + 1);
    }
    
    sortedMutualDates = Array.from(mutualDates).sort((a, b) => b.localeCompare(a));
    latestMutualDate = sortedMutualDates[0];
  }
  
  if (latestMutualDate !== todayStr && latestMutualDate !== yesterdayStr) {
    return 0;
  }
  
  let streak = 0;
  let currentDate = latestMutualDate === todayStr ? new Date() : yesterday;
  
  while (true) {
    const currentStr = getIstanbulDateString(currentDate);
    if (mutualDates.has(currentStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
}
