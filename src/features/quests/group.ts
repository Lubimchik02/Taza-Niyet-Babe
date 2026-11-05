interface GroupableQuest {
  status: string;
  starts_at: string;
  ends_at: string;
}

/** Делит записи на «сейчас идут», «предстоящие» (ближайшие первыми) и «прошедшие». */
export function groupMyQuests<T extends GroupableQuest>(
  quests: readonly T[],
  now: Date = new Date(),
) {
  const active: T[] = [];
  const upcoming: T[] = [];
  const past: T[] = [];
  for (const q of quests) {
    if (q.status === 'completed' || new Date(q.ends_at) < now) past.push(q);
    else if (new Date(q.starts_at) <= now) active.push(q);
    else upcoming.push(q);
  }
  upcoming.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  past.sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  return { active, upcoming, past };
}
