export const MAX_SAVE_FILE_BYTES = 5 * 1024 * 1024;
export const SAVE_FILE_FORMAT = "fog-harbor-archive";
export const SAVE_SCHEMA_VERSION = 3;

export function encodeSaveFile(state: object): string {
  return JSON.stringify({ format: SAVE_FILE_FORMAT, schemaVersion: SAVE_SCHEMA_VERSION, state }, null, 2);
}

export function decodeSaveFile(text: string): Record<string, unknown> {
  if (new TextEncoder().encode(text).byteLength > MAX_SAVE_FILE_BYTES) {
    throw new Error("这份档案超过 5 MB，无法读取。请选择游戏导出的备份文件。");
  }
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("文件不是完整的 JSON 档案，请重新选择备份。"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("无法识别这份档案。");
  const backup = value as Record<string, unknown>;
  if (backup.format !== SAVE_FILE_FORMAT) throw new Error("这不是《雾港档案》导出的备份。");
  if (backup.schemaVersion !== SAVE_SCHEMA_VERSION) throw new Error("这份档案的版本暂不兼容，请使用对应版本的游戏打开。");
  if (!backup.state || typeof backup.state !== "object" || Array.isArray(backup.state)) {
    throw new Error("档案缺少调查进度，未更改当前记录。");
  }
  const state = backup.state as Record<string, unknown>;
  if (typeof state.investigatorCode !== "string" || !Number.isSafeInteger(state.runCount)
    || (state.runCount as number) < 1 || !Array.isArray(state.completedPuzzles)
    || !state.completedPuzzles.every((id) => ["schedule", "frequency", "photo", "deduction", "hidden"].includes(id))) {
    throw new Error("档案中的调查记录不完整，未更改当前记录。");
  }
  return state;
}

