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

/** Month precision, for photos and rolls where the exact day is not known. */
export function formatMonth(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function toISOMonth(date: Date): string {
  return date.toISOString().slice(0, 7);
}
