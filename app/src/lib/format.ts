import { formatDistanceToNow, isToday, isYesterday, differenceInDays } from "date-fns";

export function timeAgo(timestamp: number): string {
  return formatDistanceToNow(timestamp, { addSuffix: true });
}

export function formatDate(timestamp: number): string {
  if (isToday(timestamp)) return "Today";
  if (isYesterday(timestamp)) return "Yesterday";
  const days = differenceInDays(Date.now(), timestamp);
  return `${days} days ago`;
}
