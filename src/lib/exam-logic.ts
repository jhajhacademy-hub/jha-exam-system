export const TOTAL_QUESTIONS = 50;
export const POINTS_PER_QUESTION = 2;
export const PASS_SCORE = 80;

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * カテゴリごとの母数比率に応じて出題数を按分する(最大剰余法)。
 * どのカテゴリも母数を超えて割り当てられることはない。
 */
export function allocateQuestionCounts(
  categoryCounts: { categoryId: string; count: number }[],
  total: number
): Map<string, number> {
  const grandTotal = categoryCounts.reduce((sum, c) => sum + c.count, 0);
  const allocation = new Map<string, number>();

  const withFraction = categoryCounts.map((c) => {
    const raw = grandTotal > 0 ? (c.count * total) / grandTotal : 0;
    const base = Math.min(Math.floor(raw), c.count);
    return { ...c, base, fraction: raw - Math.floor(raw) };
  });

  withFraction.forEach((c) => allocation.set(c.categoryId, c.base));

  let remaining = total - withFraction.reduce((sum, c) => sum + c.base, 0);

  const byFractionDesc = [...withFraction].sort((a, b) => b.fraction - a.fraction);
  let i = 0;
  while (remaining > 0 && byFractionDesc.some((c) => allocation.get(c.categoryId)! < c.count)) {
    const c = byFractionDesc[i % byFractionDesc.length];
    const current = allocation.get(c.categoryId)!;
    if (current < c.count) {
      allocation.set(c.categoryId, current + 1);
      remaining--;
    }
    i++;
  }

  return allocation;
}

/**
 * カテゴリ別の問題プールから、按分数に応じてランダム抽出し、全体をシャッフルして返す。
 */
export function pickBalancedQuestions<T extends { id: string }>(
  questionsByCategory: Map<string, T[]>,
  total: number = TOTAL_QUESTIONS
): T[] {
  const categoryCounts = Array.from(questionsByCategory.entries()).map(([categoryId, qs]) => ({
    categoryId,
    count: qs.length,
  }));

  const allocation = allocateQuestionCounts(categoryCounts, total);

  const picked: T[] = [];
  for (const [categoryId, questions] of questionsByCategory.entries()) {
    const count = allocation.get(categoryId) ?? 0;
    picked.push(...shuffle(questions).slice(0, count));
  }

  return shuffle(picked);
}

export function scoreExam(correctCount: number): { score: number; passed: boolean } {
  const score = correctCount * POINTS_PER_QUESTION;
  return { score, passed: score >= PASS_SCORE };
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
