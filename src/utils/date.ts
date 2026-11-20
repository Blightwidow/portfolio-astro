export function formatDate(date: Date, short = false): string {
  if (short) {
    return date.toLocaleDateString("en-GB", {
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

export function toISODate(date: Date): string {
  return date.toISOString().split("T")[0] ?? date.toISOString();
}

/** Month precision (`YYYY-MM`), for photos and rolls where the exact day is not known. */
export function formatMonth(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
