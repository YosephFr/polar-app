const appUrl = process.env.APP_URL;
const secret = process.env.CRON_SECRET;

if (!appUrl || !secret) {
  process.stderr.write("APP_URL and CRON_SECRET are required\n");
  process.exitCode = 1;
} else {
  fetch(new URL("/api/cron/notifications", appUrl), {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  })
    .then(async (response) => {
      const body = await response.text();
      if (!response.ok) throw new Error(`Dispatcher returned ${response.status}: ${body}`);
      process.stdout.write(`${body}\n`);
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      process.exitCode = 1;
    });
}
