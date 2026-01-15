export function formatDate(date: Date, short = false): string {
  if (short) {
    return date.toLocaleDateString("en-UK", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  }

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
