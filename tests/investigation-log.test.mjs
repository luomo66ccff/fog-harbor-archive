import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const viteServer = createServer({
  root,
  configFile: false,
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
  resolve: { alias: { "@": root } },
});

async function loadLogModule() {
  return (await viteServer).ssrLoadModule("/lib/investigation-log.ts");
}

after(async () => {
  await (await viteServer).close();
});

function run(overrides = {}) {
  return {
    runNumber: 1,
    startedAt: Date.UTC(2019, 6, 12, 2, 17),
    completedPuzzles: ["schedule", "frequency"],
    unlockedEvidenceIds: ["ev-offset", "ev-audio-0712"],
    readDocumentIds: ["doc-case"],
    readMessageIds: ["msg-commission"],
    readEvidenceIds: ["ev-offset"],
    evidenceNotes: {},
    caseNote: "",
    puzzleAttempts: { schedule: 2 },
    narrativeEventIds: ["first-time-contradiction"],
    theoryHistory: [],
    discoveredEasterEggCount: 0,
    assistedInvestigation: false,
    endingId: null,
    ...overrides,
  };
}

test("sanitizes export filenames against traversal, Windows reserved names, and duplicate extensions", async () => {
  const { sanitizeLogFilename } = await loadLogModule();
  assert.equal(sanitizeLogFilename("CON"), "fog-harbor-investigation-log.txt");
  assert.equal(sanitizeLogFilename("CON.foo"), "fog-harbor-investigation-log.txt");
  assert.equal(sanitizeLogFilename("NUL.log"), "fog-harbor-investigation-log.txt");
  assert.equal(sanitizeLogFilename("  run 07.txt.txt  "), "run-07.txt");
  const hostile = sanitizeLogFilename("../../archive:<07>|?*\\final");
  assert.equal(hostile.endsWith(".txt"), true);
  assert.doesNotMatch(hostile, /[<>:"/\\|?*]/);
  assert.doesNotMatch(hostile, /^\.+/);
});

test("groups runs and keeps player notes separate from deterministic system records", async () => {
  const { buildInvestigationLog, serializeInvestigationLog } = await loadLogModule();
  const inputRuns = [
    run({ runNumber: 2, startedAt: Date.UTC(2019, 6, 13), endingId: "trade", caseNote: "第二轮笔记" }),
    run({
      runNumber: 1,
      caseNote: "岸钟需要复核",
      evidenceNotes: { "ev-offset": "与机械岸钟交叉验证" },
      theoryHistory: ["pursuer", "pursuer->rescuer"],
      endingId: "truth",
    }),
  ];
  const document = buildInvestigationLog({ generatedAt: Date.UTC(2019, 6, 14), runs: inputRuns });
  assert.deepEqual(document.runs.map((item) => item.runNumber), [1, 2]);
  assert.deepEqual(inputRuns.map((item) => item.runNumber), [2, 1], "the pure builder must not mutate caller order");
  assert.equal(document.runs[0].playerNotes.length, 2);
  assert.ok(document.runs[0].systemRecords.some((entry) => entry.id === "completed-puzzles"));
  const text = serializeInvestigationLog(document);
  assert.ok(text.indexOf("=== RUN 01 ===") < text.indexOf("=== RUN 02 ==="));
  assert.match(text, /\[玩家笔记\][\s\S]*岸钟需要复核/);
  assert.match(text, /\[系统记录\][\s\S]*完成谜题/);
  assert.match(text, /追捕者 → 救援者/);
});

test("redacts identity and device metadata from every plain-text export", async () => {
  const { createInvestigationLogExport } = await loadLogModule();
  const result = createInvestigationLogExport({
    generatedAt: Date.UTC(2019, 6, 14),
    runs: [run({
      caseNote: "真实姓名：张三\nIP: 203.0.113.7\nIPv6 2001:db8::1\n回环 ::1\nMozilla/5.0 Chrome/126.0\n邮箱 test@example.com\n手机 13800138000",
      evidenceNotes: {
        "IP: 198.51.100.8\n伪造标签": "设备型号: HarborBook\nMAC: 00:11:22:33:44:55",
      },
    })],
  }, "run/../../07?.txt");
  for (const secret of ["张三", "203.0.113.7", "2001:db8::1", "::1", "198.51.100.8", "Mozilla/5.0", "test@example.com", "13800138000", "HarborBook", "00:11:22:33:44:55"]) {
    assert.doesNotMatch(result.text, new RegExp(secret.replaceAll(".", "\\."), "i"));
  }
  assert.match(result.text, /不写入真实身份、IP、User-Agent 或设备信息/);
  assert.doesNotMatch(result.filename, /[\\/?*]/);
});

test("fails closed for out-of-range persisted timestamps", async () => {
  const { createInvestigationLogExport } = await loadLogModule();
  const result = createInvestigationLogExport({
    generatedAt: Number.MAX_VALUE,
    runs: [run({ startedAt: Number.MAX_VALUE, endedAt: Number.MAX_VALUE })],
  });
  assert.doesNotMatch(result.text, /Invalid time/i);
  assert.match(result.text, /本轮开始: 未记录/);
});
