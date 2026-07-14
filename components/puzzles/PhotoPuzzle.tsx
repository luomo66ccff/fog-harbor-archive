"use client";

import { DragEvent, KeyboardEvent, useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, Image as ImageIcon, ScanLine, Search } from "lucide-react";
import { useFogAudio } from "@/components/audio/AudioProvider";
import { ProvisionalTheory } from "@/components/narrative/ProvisionalTheory";
import { PhotoInspection } from "@/components/puzzles/PhotoInspection";
import { puzzleGuidance } from "@/lib/case-data";
import {
  PHOTO_PIECE_IDS,
  countMisplacedPhotoPieces,
  movePhotoPiece,
  photoPieceAtSlot,
  shufflePhotoPieces,
} from "@/lib/puzzle-engine";
import { visualAssets } from "@/lib/visual-assets";
import { useCaseStore } from "@/store/case-store";
import type { PhotoPieceState, PhotoPuzzleStage } from "@/types/puzzle";

function pieceStyle(piece: PhotoPieceState): CSSProperties {
  const column = piece.id % 3;
  const row = Math.floor(piece.id / 3);
  return {
    "--photo-slice": `url("${visualAssets.cctvPuzzle}")`,
    "--slice-x": `${column * 50}%`,
    "--slice-y": `${row * 100}%`,
  } as CSSProperties;
}

function targetSlotForKey(slot: number, key: string) {
  const column = slot % 3;
  const row = Math.floor(slot / 3);
  if (key === "ArrowLeft" && column > 0) return slot - 1;
  if (key === "ArrowRight" && column < 2) return slot + 1;
  if (key === "ArrowUp" && row > 0) return slot - 3;
  if (key === "ArrowDown" && row < 1) return slot + 3;
  return null;
}

export function PhotoPuzzle() {
  const solved = useCaseStore((state) => state.completedPuzzles.includes("photo"));
  const completePuzzle = useCaseStore((state) => state.completePuzzle);
  const recordAttempt = useCaseStore((state) => state.recordAttempt);
  const { cue } = useFogAudio();
  const [pieces, setPieces] = useState<PhotoPieceState[]>(() => shufflePhotoPieces());
  const [selected, setSelected] = useState<number | null>(null);
  const [stage, setStage] = useState<PhotoPuzzleStage>("assembling");
  const [feedback, setFeedback] = useState("选择一块照片，再选择目标位置进行交换；也可拖动或使用方向键。");
  const [hintIndex, setHintIndex] = useState(-1);
  const slotRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const scanTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (scanTimer.current !== null) window.clearTimeout(scanTimer.current);
  }, []);

  const swapIntoSlot = (pieceId: number, targetSlot: number, keepSelected = false) => {
    setPieces((current) => movePhotoPiece(current, pieceId, targetSlot));
    setSelected(keepSelected ? pieceId : null);
    setFeedback("碎片已交换。系统不会提前指出对错，请在整体成像后统一扫描。");
    cue("paper");
  };

  const selectOrSwap = (piece: PhotoPieceState) => {
    if (selected === null) {
      setSelected(piece.id);
      setFeedback("已夹取一块碎片。选择另一位置即可交换。");
      cue("paper");
      return;
    }
    if (selected === piece.id) {
      setSelected(null);
      setFeedback("已放回碎片。");
      return;
    }
    swapIntoSlot(selected, piece.slot);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>, slot: number) => {
    event.preventDefault();
    const id = Number(event.dataTransfer.getData("text/photo-piece"));
    if (!Number.isNaN(id)) swapIntoSlot(id, slot);
  };

  const onSlotKeyDown = (event: KeyboardEvent<HTMLButtonElement>, piece: PhotoPieceState) => {
    const target = targetSlotForKey(piece.slot, event.key);
    if (target === null) return;
    event.preventDefault();
    const movingId = selected ?? piece.id;
    swapIntoSlot(movingId, target, true);
    window.requestAnimationFrame(() => slotRefs.current[target]?.focus());
  };

  const scanRestoration = () => {
    if (stage !== "assembling" || scanTimer.current !== null) return;
    recordAttempt("photo");
    const misplaced = countMisplacedPhotoPieces(pieces);
    if (misplaced > 0) {
      setFeedback(`扫描未通过：共有 ${misplaced} 块碎片错位。系统不会标记具体位置，请根据灯杆、船体与水线连续性调整。`);
      cue("error");
      return;
    }
    setSelected(null);
    setStage("scanning");
    setFeedback("六块底片边缘吻合，正在执行统一扫描复原……");
    cue("tape");
    scanTimer.current = window.setTimeout(() => {
      setStage("inspecting");
      scanTimer.current = null;
    }, 920);
  };

  const finishInspection = () => {
    completePuzzle("photo");
    cue("unlock");
  };

  if (solved) {
    return (
      <section className="solved-photo-panel solved-photo-panel--upgraded">
        <div className="puzzle-success"><Check size={20} aria-hidden="true" /><div><strong>照片与现场细节已核验</strong><p>白鹭七号 / H-1707。第一道人影是林知夏；第二道人影靠近检修梯。远处监控室窗口仍有一处控制灯亮着。</p></div></div>
        <div className="photo-complete-preview" style={{ "--photo-complete": `url("${visualAssets.cctvPuzzle}")` } as CSSProperties} role="img" aria-label="复原的第七码头照片，船体编号 H-1707，码头外侧有第二道人影，远处监控室窗口仍亮着"><span>H-1707 / 第二道人影 / 控制室亮点</span></div>
        <ProvisionalTheory compact />
      </section>
    );
  }

  if (stage === "inspecting") return <PhotoInspection onComplete={finishInspection} />;

  return (
    <section className={`puzzle-panel photo-puzzle photo-puzzle--upgraded ${stage === "scanning" ? "is-scanning" : ""}`} aria-labelledby="photo-title">
      <div className="puzzle-heading"><div><p className="eyebrow">PUZZLE 03 / 3×2 FRAME RESTORATION</p><h3 id="photo-title">密封的港口监控照片</h3></div><ImageIcon size={23} aria-hidden="true" /></div>
      <p className="puzzle-brief">六块真实图像切片已随机打乱。错误位置也可以放置；交换完成后点击“扫描复原”，系统只报告错位总数。</p>

      <div className="photo-scan-bed" aria-label="三列两行照片拼图" aria-busy={stage === "scanning"}>
        {PHOTO_PIECE_IDS.map((slot) => {
          const piece = photoPieceAtSlot(pieces, slot);
          if (!piece) return <div key={slot} className="photo-scan-slot is-empty" />;
          const row = Math.floor(slot / 3) + 1;
          const column = (slot % 3) + 1;
          return (
            <div key={slot} className="photo-scan-slot" onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, slot)}>
              <button
                ref={(node) => { slotRefs.current[slot] = node; }}
                type="button"
                draggable={stage === "assembling"}
                className={`photo-slice ${selected === piece.id ? "is-selected" : ""}`}
                style={pieceStyle(piece)}
                onDragStart={(event) => event.dataTransfer.setData("text/photo-piece", String(piece.id))}
                onClick={() => selectOrSwap(piece)}
                onKeyDown={(event) => onSlotKeyDown(event, piece)}
                disabled={stage !== "assembling"}
                aria-pressed={selected === piece.id}
                aria-label={`照片切片，当前位于第 ${row} 行第 ${column} 列；按回车选择，或用方向键与相邻切片交换`}
              />
            </div>
          );
        })}
        {stage === "scanning" && <div className="photo-scan-pass" aria-hidden="true"><span /></div>}
      </div>

      <div className="photo-scan-footer">
        <p className="puzzle-feedback" role="status">{feedback}</p>
        <button type="button" className="primary-action" onClick={scanRestoration} disabled={stage !== "assembling"}><ScanLine size={16} /> {stage === "scanning" ? "扫描中…" : "扫描复原"}</button>
      </div>
      <button type="button" className="hint-button" onClick={() => setHintIndex((value) => Math.min(value + 1, puzzleGuidance.photo.length - 1))}><Search size={14} aria-hidden="true" /> 请求渐进提示</button>
      {hintIndex >= 0 && <p className="hint-copy">提示 {hintIndex + 1}：{puzzleGuidance.photo[hintIndex]}</p>}
    </section>
  );
}
