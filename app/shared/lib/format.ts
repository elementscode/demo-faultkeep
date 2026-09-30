export function timeAgo(date: Date | null, now: Date): string {
  if (!date) {
    return "";
  }

  let seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (seconds < 10) {
    return "just now";
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  let minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  let hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  let days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function compact(n: number): string {
  if (n < 1000) {
    return String(n);
  }

  if (n < 10_000) {
    return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }

  if (n < 1_000_000) {
    return `${Math.round(n / 1000)}k`;
  }

  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

export function dateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}
