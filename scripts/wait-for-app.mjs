// Usage: node scripts/wait-for-app.mjs <url> [timeoutSeconds]
// Polls a URL until it returns 2xx; exits non-zero on timeout.
const url = process.argv[2] ?? 'http://localhost:3000/rest/admin/application-version';
const timeoutMs = Number(process.argv[3] ?? 120) * 1000;
const deadline = Date.now() + timeoutMs;

while (Date.now() < deadline) {
  try {
    const res = await fetch(url);
    if (res.ok) {
      console.log(`Ready: ${url}`);
      process.exit(0);
    }
  } catch {
    // not up yet
  }
  await new Promise((r) => setTimeout(r, 1000));
}
console.error(`Timed out after ${timeoutMs / 1000}s waiting for ${url}`);
process.exit(1);
