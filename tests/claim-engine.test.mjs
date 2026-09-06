import assert from "node:assert/strict";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({
  root,
  configFile: false,
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
  resolve: { alias: { "@": root } },
});
const {
  claimDefinitions,
  evaluateClaim,
  getProvenClaimIds,
  mainClaimIds,
  migrateLegacyClaims,
} = await server.ssrLoadModule("/lib/claim-engine.ts");

after(async () => {
  await server.close();
});

const allEvidenceIds = [
  "ev-weather",
  "ev-offset",
  "ev-clock-admin-trace",
  "ev-duty",
  "ev-port-log",
  "ev-photo",
  "ev-drum-stencil",
  "ev-payment",
  "ev-case-file",
  "ev-audio-0712",
  "ev-tape-edit",
  "ev-rescue-channel",
  "ev-toolbox",
  "ev-voiceprint",
  "ev-seven-map",
  "ev-erasure-fingerprint",
  "ev-closure-order",
  "ev-commission",
];

const fullContext = {
  unlockedEvidenceIds: allEvidenceIds,
  readEvidenceIds: allEvidenceIds,
  completedPuzzles: ["hidden"],
  discoveredAnonymous: true,
};

const aSubmission = {
  propositionId: "manual-clock-and-weather-template",
  evidenceIds: ["ev-weather", "ev-offset", "ev-clock-admin-trace", "ev-duty"],
  rebuttalChoiceId: "cross-check",
};

test("publishes four text-only claim definitions and hides correctness rules", () => {
  assert.deepEqual(mainClaimIds, ["clock-fabrication", "heron-coverup", "ladder-escape"]);
  assert.equal(claimDefinitions.length, 4);
  for (const definition of claimDefinitions) {
    assert.equal(definition.propositions.length, 3);
    assert.deepEqual(definition.rebuttal.choices.map((choice) => choice.id), [
      "accept-official",
      "cross-check",
      "discard",
    ]);
    assert.equal("correct" in definition, false);
  }
  const heron = claimDefinitions.find((definition) => definition.id === "heron-coverup");
  assert.ok(heron);
  assert.doesNotMatch(heron.rebuttal.text, /deduction|封存指令/);
});

test("requires every submitted evidence item to be owned and read", () => {
  const unread = evaluateClaim("clock-fabrication", aSubmission, {
    ...fullContext,
    readEvidenceIds: allEvidenceIds.filter((id) => id !== "ev-offset"),
  });
  assert.equal(unread.status, "contested");
  assert.deepEqual(unread.missingEvidenceIds, ["ev-offset"]);
  assert.ok(unread.failures.includes("missing-evidence"));
  assert.match(unread.feedback, /十一分钟校时差/);
  assert.match(unread.feedback, /还缺 1 份证据/);

  const locked = evaluateClaim("clock-fabrication", aSubmission, {
    ...fullContext,
    unlockedEvidenceIds: allEvidenceIds.filter((id) => id !== "ev-clock-admin-trace"),
  });
  assert.equal(locked.status, "contested");
  assert.deepEqual(locked.missingEvidenceIds, ["ev-clock-admin-trace"]);
  assert.match(locked.feedback, /继续调查获取/);
  assert.doesNotMatch(locked.feedback, /主时钟管理员会话残片/);
});

test("requires the counter evidence, two source groups, and cross-check rebuttal", () => {
  const withoutCounter = evaluateClaim("clock-fabrication", {
    ...aSubmission,
    evidenceIds: aSubmission.evidenceIds.filter((id) => id !== "ev-duty"),
  }, fullContext);
  assert.equal(withoutCounter.status, "contested");
  assert.deepEqual(withoutCounter.missingEvidenceIds, ["ev-duty"]);

  const wrongRebuttal = evaluateClaim("clock-fabrication", {
    ...aSubmission,
    rebuttalChoiceId: "accept-official",
  }, fullContext);
  assert.equal(wrongRebuttal.status, "contested");
  assert.ok(wrongRebuttal.failures.includes("unhandled-rebuttal"));
  assert.match(wrongRebuttal.feedback, /反方解释尚未回应/);

  const proven = evaluateClaim("clock-fabrication", aSubmission, fullContext);
  assert.deepEqual(proven, {
    status: "proven",
    feedback: "物理记录与管理员会话闭合：+11 不是设备漂移，暴雨是事后套用的封存模板。",
    missingEvidenceIds: [],
    failures: [],
  });
});

test("rejects an unsupported proposition without treating it as a contested claim", () => {
  const result = evaluateClaim("clock-fabrication", {
    ...aSubmission,
    propositionId: "distributed-sensor-drift",
  }, fullContext);
  assert.equal(result.status, "unsupported");
  assert.deepEqual(result.failures, ["wrong-proposition"]);
});

test("requires all three main claims before archive continuity can be proven", () => {
  const dSubmission = {
    propositionId: "active-purge-network-node",
    evidenceIds: ["ev-voiceprint", "ev-seven-map", "ev-erasure-fingerprint", "ev-closure-order", "ev-commission"],
    rebuttalChoiceId: "cross-check",
  };
  const blocked = evaluateClaim("archive02-continuity", dSubmission, fullContext);
  assert.equal(blocked.status, "contested");
  assert.ok(blocked.failures.includes("prerequisite"));
  assert.match(blocked.feedback, /完成前三项主线对质/);

  const proven = evaluateClaim("archive02-continuity", dSubmission, {
    ...fullContext,
    provenClaimIds: ["clock-fabrication", "heron-coverup", "ladder-escape"],
  });
  assert.equal(proven.status, "proven");

  const missingPrerequisites = evaluateClaim("archive02-continuity", dSubmission, {
    ...fullContext,
    discoveredAnonymous: false,
    completedPuzzles: [],
  });
  assert.match(missingPrerequisites.feedback, /完成前三项主线对质/);
  assert.match(missingPrerequisites.feedback, /匿名委托人身份/);
  assert.match(missingPrerequisites.feedback, /地图镜像口令/);

  const submissions = {
    "clock-fabrication": aSubmission,
    "heron-coverup": {
      propositionId: "hazmat-and-coordinated-coverup",
      evidenceIds: ["ev-port-log", "ev-photo", "ev-drum-stencil", "ev-payment", "ev-clock-admin-trace", "ev-case-file"],
      rebuttalChoiceId: "cross-check",
    },
    "ladder-escape": {
      propositionId: "planned-maintenance-escape",
      evidenceIds: ["ev-audio-0712", "ev-tape-edit", "ev-rescue-channel", "ev-toolbox", "ev-photo"],
      rebuttalChoiceId: "cross-check",
    },
    "archive02-continuity": dSubmission,
  };
  assert.deepEqual(getProvenClaimIds(submissions, fullContext), [
    "clock-fabrication",
    "heron-coverup",
    "ladder-escape",
    "archive02-continuity",
  ]);
});

test("migrates legacy puzzle completion into canonical proven submissions", () => {
  const migrated = migrateLegacyClaims(["deduction", "hidden"]);
  assert.deepEqual(Object.keys(migrated), [
    "clock-fabrication",
    "heron-coverup",
    "ladder-escape",
    "archive02-continuity",
  ]);
  for (const id of Object.keys(migrated)) {
    assert.equal(migrated[id].migrated, true);
    assert.equal("status" in migrated[id], false);
  }
  assert.deepEqual(getProvenClaimIds(migrated, {
    unlockedEvidenceIds: [],
    readEvidenceIds: [],
    completedPuzzles: [],
    discoveredAnonymous: false,
  }), [
    "clock-fabrication",
    "heron-coverup",
    "ladder-escape",
    "archive02-continuity",
  ]);
  assert.deepEqual(migrateLegacyClaims([]), {});
});
