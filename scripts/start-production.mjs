import { access, cp } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const modulePath = fileURLToPath(import.meta.url);
const projectRoot = resolve(dirname(modulePath), "..");
const standaloneRoot = resolve(projectRoot, ".next", "standalone");
const standaloneServer = resolve(standaloneRoot, "server.js");

function readOption(args, names, fallback) {
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    for (const name of names) {
      if (argument === name) return args[index + 1] ?? fallback;
      if (argument.startsWith(`${name}=`)) return argument.slice(name.length + 1) || fallback;
    }
  }
  return fallback;
}

export function resolveServerOptions(args = process.argv.slice(2), env = process.env) {
  return {
    port: readOption(args, ["--port", "-p"], env.PORT ?? "3000"),
    hostname: readOption(args, ["--hostname", "-H"], env.HOSTNAME ?? "0.0.0.0"),
  };
}

export async function prepareStandaloneAssets() {
  await access(standaloneServer);
  await cp(resolve(projectRoot, "public"), resolve(standaloneRoot, "public"), {
    force: true,
    recursive: true,
  });
  await cp(resolve(projectRoot, ".next", "static"), resolve(standaloneRoot, ".next", "static"), {
    force: true,
    recursive: true,
  });
}

export async function startStandaloneServer({
  args = process.argv.slice(2),
  env = process.env,
  hostname,
  port,
  stdio = "inherit",
} = {}) {
  const parsed = resolveServerOptions(args, env);
  const serverPort = String(port ?? parsed.port);
  const serverHostname = String(hostname ?? parsed.hostname);

  await prepareStandaloneAssets();
  return spawn(process.execPath, [standaloneServer], {
    cwd: standaloneRoot,
    env: {
      ...env,
      NODE_ENV: "production",
      HOSTNAME: serverHostname,
      PORT: serverPort,
    },
    stdio,
  });
}

function waitForChild(child) {
  return new Promise((resolveChild) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolveChild(result);
    };
    child.once("error", (error) => finish({ error, code: null, signal: null }));
    child.once("exit", (code, signal) => finish({ code, signal }));
  });
}

export async function runProductionServer(args = process.argv.slice(2), env = process.env) {
  const child = await startStandaloneServer({ args, env, stdio: "inherit" });
  let shuttingDown = false;
  const stop = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (!child.killed) child.kill();
  };

  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    const result = await waitForChild(child);
    if (result.error) {
      console.error(`Unable to start standalone production server: ${result.error.message}`);
      process.exitCode = 1;
    } else if (result.signal) {
      process.exitCode = 1;
    } else {
      process.exitCode = result.code ?? 1;
    }
  } finally {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
    if (!child.killed && child.exitCode === null) child.kill();
  }
}

const isMainModule = process.argv[1] && resolve(process.argv[1]) === modulePath;
if (isMainModule) {
  try {
    await runProductionServer();
  } catch (error) {
    console.error(`Unable to prepare standalone production server: ${error.message}`);
    process.exitCode = 1;
  }
}
