export function unwrapResponse<T>(data: T | { data: T }): T {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: T }).data;
  }
  return data as T;
}
