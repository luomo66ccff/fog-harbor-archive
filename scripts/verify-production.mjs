import assert from "node:assert/strict";
import { createServer } from "node:net";
import { startStandaloneServer } from "./start-production.mjs";

const host = process.env.PRODUCTION_VERIFY_HOST ?? "127.0.0.1";
const port = process.env.PRODUCTION_VERIFY_PORT ?? "4174";
const urlHost = host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
const url = `http://${urlHost}:${port}/`;

async function assertPortAvailable(targetHost, targetPort) {
  const numericPort = Number(targetPort);
  if (!Number.isInteger(numericPort) || numericPort < 1 || numericPort > 65535) {
    throw new Error(`Production verify port must be an integer from 1 to 65535, received ${targetPort}.`);
  }

  const probe = createServer();
  try {
    await new Promise((resolveProbe, rejectProbe) => {
      const onError = (error) => rejectProbe(error);
      probe.once("error", onError);
      probe.listen({ exclusive: true, host: targetHost, port: numericPort }, () => {
        probe.removeListener("error", onError);
        probe.close((error) => (error ? rejectProbe(error) : resolveProbe()));
      });
    });
  } catch (error) {
    if (error?.code === "EADDRINUSE") {
      throw new Error(`Production verify target ${targetHost}:${numericPort} is already in use.`);
    }
    throw error;
  }
}

await assertPortAvailable(host, port);

const child = await startStandaloneServer({
  hostname: host,
  port,
  stdio: ["ignore", "pipe", "pipe"],
});

let output = "";
let closed = false;
let closeCode;
let closeSignal;
const closePromise = new Promise((resolveClose) => {
  child.once("close", (code, signal) => {
    closed = true;
    closeCode = code;
    closeSignal = signal;
    resolveClose();
  });
});
child.stdout.on("data", (chunk) => {
  output += chunk;
});
child.stderr.on("data", (chunk) => {
  output += chunk;
});
child.once("error", (error) => {
  output += `${error.message}\n`;
});

const stop = () => {
  if (!closed && !child.killed) child.kill();
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);

try {
  let response;
  let lastError;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (closed) {
      throw new Error(`Production server exited before becoming ready (code ${closeCode}, signal ${closeSignal ?? "none"}).`);
    }
    try {
      response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(2_000) });
      break;
    } catch (error) {
      lastError = error;
      await new Promise((resolveRetry) => setTimeout(resolveRetry, 500));
    }
  }

  if (!response) {
    throw new Error(`Production server did not become ready: ${lastError?.message ?? "unknown error"}`);
  }
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /雾港档案/);
  assert.match(html, /失踪的第七码头|读取潮湿的纸张/);
  assert.doesNotMatch(html, /Your site is taking shape|Codex is working|codex-preview/);
  const script = html.match(/src="(\/_next\/static\/[^"?]+\.js[^"]*)"/)?.[1];
  const style = html.match(/href="(\/_next\/static\/[^"?]+\.css[^"]*)"/)?.[1];
  assert.ok(script && style, "Production HTML must reference JavaScript and CSS assets.");
  for (const [resource, type] of [[script, /javascript/], [style, /text\/css/], ["/og-fog-harbor.webp", /image\/webp/]]) {
    const asset = await fetch(new URL(resource, url), { signal: AbortSignal.timeout(3_000) });
    assert.equal(asset.status, 200, `Missing production resource: ${resource}`);
    assert.match(asset.headers.get("content-type") ?? "", type);
    assert.ok((await asset.arrayBuffer()).byteLength > 0, `Empty production resource: ${resource}`);
  }
  console.log(`Production server verified at ${url}`);
} catch (error) {
  if (output) console.error(output);
  throw error;
} finally {
  stop();
  await closePromise;
  process.removeListener("SIGINT", stop);
  process.removeListener("SIGTERM", stop);
}
