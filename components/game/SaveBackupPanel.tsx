"use client";

import { useId, useRef, useState, useSyncExternalStore, type ChangeEvent } from "react";
import { Download, Upload } from "lucide-react";
import { MAX_SAVE_FILE_BYTES } from "@/lib/save-file";
import { caseStorage, type SaveStorageStatus } from "@/lib/save-storage";
import { exportCaseBackup, previewCaseBackup, restoreCaseBackup } from "@/store/case-store";

function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

const serverStatus = (): SaveStorageStatus => "ready";

export function SaveStatusNotice() {
  const status = useSyncExternalStore(caseStorage.subscribe, caseStorage.getStatus, serverStatus);
  const [dismissed, setDismissed] = useState<SaveStorageStatus | null>(null);
  if (status === "ready" || dismissed === status) return null;
  return <aside className="save-status-notice" role="status">
    {status === "unavailable"
      ? "此浏览器暂时无法保存。调查仍可继续，请在“备份与恢复”中导出进度后再关闭页面。"
      : "上次档案未能完整读取，原始内容已保留。可在“备份与恢复”中恢复你导出的档案。"}
    <button type="button" aria-label="收起存档提醒" onClick={() => setDismissed(status)}>知道了</button>
  </aside>;
}

export function SaveBackupPanel({ onRestore }: { onRestore: () => void }) {
  const id = useId();
  const request = useRef(0);
  const [pending, setPending] = useState<{ text: string; code: string; run: number; puzzles: number } | null>(null);
  const [message, setMessage] = useState("");
  const [reading, setReading] = useState(false);
  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const serial = ++request.current;
    event.target.value = "";
    setPending(null);
    setMessage("");
    if (!file) return;
    setReading(true);
    try {
      if (file.size > MAX_SAVE_FILE_BYTES) throw new Error("这份档案超过 5 MB，请选择游戏导出的备份。");
      const text = await file.text();
      const state = previewCaseBackup(text);
      if (serial !== request.current) return;
      setPending({ text, code: state.investigatorCode || "未署名", run: state.runCount, puzzles: state.completedPuzzles.length });
    } catch (error) {
      if (serial === request.current) setMessage(error instanceof Error ? error.message : "无法读取文件，当前进度未改变。");
    } finally {
      if (serial === request.current) setReading(false);
    }
  };
  const restore = () => {
    if (!pending) return;
    try {
      restoreCaseBackup(pending.text);
      setPending(null);
      setMessage("档案已恢复。");
      onRestore();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "档案恢复失败。");
    }
  };
  return <section className="save-backup-panel" aria-label="备份与恢复">
    <h3>带走你的调查</h3>
    <p>备份包含代号、笔记、证据与结局记录，只保存为你选择的本地文件。</p>
    <div className="save-backup-actions">
      <button type="button" onClick={() => { download(exportCaseBackup(), "fog-harbor-save.json"); setMessage("备份已准备下载。"); }}><Download size={15} /> 导出调查备份</button>
      <label htmlFor={id}><Upload size={15} /> 选择备份文件</label>
      <input id={id} type="file" accept=".json,application/json" onChange={(event) => { void chooseFile(event); }} />
    </div>
    {reading && <p role="status">正在读取档案……</p>}
    {pending && <div className="save-import-preview" role="group" aria-label="恢复预览">
      <strong>调查员 {pending.code} · 第 {pending.run} 轮</strong>
      <p>已完成 {pending.puzzles} 项谜题。恢复会替换当前调查；需要保留当前记录时，请先导出备份。</p>
      <button type="button" className="primary-action" onClick={restore}>确认恢复这份档案</button>
      <button type="button" className="secondary-action" onClick={() => { setPending(null); setMessage("已取消恢复，当前进度未改变。"); }}>取消恢复</button>
    </div>}
    {message && <p role="status">{message}</p>}
    {caseStorage.getRecovery() && <button type="button" className="secondary-action" onClick={() => download(caseStorage.getRecovery()!, "fog-harbor-recovery-original.json")}>导出未能读取的原始档案</button>}
  </section>;
}
