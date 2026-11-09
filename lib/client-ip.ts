export function clientIp(headers: Headers, fallback?: string | null) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    fallback ||
    "unknown"
  );
}
