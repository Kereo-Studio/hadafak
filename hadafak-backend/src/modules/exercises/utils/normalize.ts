export function normalizeExerciseName(name: string): string {
  let normalized = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // remove special characters
    .replace(/[\s_]+/g, '-')      // replace spaces and underscores with hyphens
    .replace(/-+/g, '-');         // replace multiple hyphens with single hyphen

  if (normalized.endsWith('s') && !normalized.endsWith('ss')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}
