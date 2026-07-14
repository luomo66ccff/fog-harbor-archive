"use client";

import { DragEvent, KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Check, RotateCw, Search, X, ZoomIn } from "lucide-react";
import { useFogAudio } from "@/components/audio/AudioProvider";
import { puzzleGuidance } from "@/lib/case-data";
import { isPhotoSolved, normalizeRotation } from "@/lib/puzzle-engine";
import { useCaseStore } from "@/store/case-store";
import type { PhotoPieceState } from "@/types/puzzle";

const initialPieces: PhotoPieceState[] = [
  { id: 0, slot: null, rotation: 90 }, { id: 1, slot: null, rotation: 270 }, { id: 2, slot: null, rotation: 180 },
  { id: 3, slot: null, rotation: 90 }, { id: 4, slot: null, rotation: 270 }, { id: 5, slot: null, rotation: 180 },
];

export function PhotoPuzzle() {
  const solved = useCaseStore((state) => state.completedPuzzles.includes("photo"));
  const completePuzzle = useCaseStore((state) => state.completePuzzle);
  const recordAttempt = useCaseStore((state) => state.recordAttempt);
  const { cue } = useFogAudio();
  const [pieces, setPieces] = useState(initialPieces);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("先选择碎片，再选择槽位；也可直接拖动。方向不正时请旋转。");
  const [zoomed, setZoomed] = useState(false);
  const zoomTriggerRef = useRef<HTMLButtonElement>(null);
  const [hintIndex, setHintIndex] = useState(-1);
  const complete = useMemo(() => isPhotoSolved(pieces), [pieces]);

  const closeZoom = () => {
    setZoomed(false);
    window.requestAnimationFrame(() => zoomTriggerRef.current?.focus());
  };

  useEffect(() => {
    if (complete && !solved) {
      completePuzzle("photo");
      cue("unlock");
    }
  }, [complete, completePuzzle, cue, solved]);

  const rotate = (id: number) => {
    setPieces((items) => items.map((item) => item.id === id ? { ...item, rotation: normalizeRotation(item.rotation + 90) } : item));
    cue("paper");
  };

  const place = (id: number, slot: number) => {
    recordAttempt("photo");
    if (id !== slot) {
      setFeedback("边缘纹理没有咬合，这一片不属于这里。观察岸灯横线与船体水线。");
      cue("error");
      return;
    }
    setPieces((items) => items.map((item) => item.id === id ? { ...item, slot } : item));
    setSelected(null);
    setFeedback("位置吻合。若碎片仍倾斜，请把角度旋回 0°。");
    cue("paper");
  };

  const onDrop = (event: DragEvent<HTMLDivElement>, slot: number) => {
    event.preventDefault();
    const id = Number(event.dataTransfer.getData("text/photo-piece"));
    if (!Number.isNaN(id)) place(id, slot);
  };

  if (solved) {
    return (
      <section className="solved-photo-panel">
        <div className="puzzle-success"><Check size={20} aria-hidden="true" /><div><strong>照片已完成拼合</strong><p>白鹭七号 / H-1707。水面倒影显示林知夏落水后仍有第二道人影靠近检修梯。</p></div></div>
        <button ref={zoomTriggerRef} type="button" className="assembled-photo" onClick={() => setZoomed(true)} aria-label="放大查看复原照片"><PhotoScene /><span><ZoomIn size={18} /> 放大观察隐藏细节</span></button>
        {zoomed && <PhotoModal onClose={closeZoom} />}
      </section>
    );
  }

  return (
    <section className="puzzle-panel photo-puzzle" aria-labelledby="photo-title">
      <div className="puzzle-heading"><div><p className="eyebrow">PUZZLE 03 / TORN PHOTOGRAPH</p><h3 id="photo-title">撕碎的港口照片</h3></div><span className="photo-index">6 PIECES</span></div>
      <p className="puzzle-brief">把六片照片拖入正确位置并校正方向。移动端可“点碎片 → 点槽位”，每片旁都有旋转按钮。</p>
      <div className="photo-workbench">
        <div className="piece-tray" aria-label="未放置照片碎片">
          {pieces.filter((piece) => piece.slot === null).map((piece) => <PieceCard key={piece.id} piece={piece} selected={selected === piece.id} onSelect={() => setSelected(piece.id)} onRotate={() => rotate(piece.id)} />)}
          {pieces.every((piece) => piece.slot !== null) && <p>所有碎片已上板，检查旋转角度。</p>}
        </div>
        <div className="photo-board" aria-label="照片拼合区域">
          {Array.from({ length: 6 }, (_, slot) => {
            const piece = pieces.find((item) => item.slot === slot);
            return (
              <div key={slot} className={`photo-slot ${piece ? "has-piece" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, slot)}>
                <button type="button" className="photo-slot-target" onClick={() => { if (selected !== null) place(selected, slot); }} aria-label={`照片槽位 ${slot + 1}${piece ? `，已有碎片 ${piece.id + 1}` : ""}`}>
                  {piece ? <span className={`piece-visual piece-${piece.id}`} style={{ transform: `rotate(${piece.rotation}deg)` }}><i>{piece.id === 4 ? "H-1" : piece.id === 5 ? "707" : ""}</i></span> : <span className="slot-number">{slot + 1}</span>}
                </button>
                {piece && <button type="button" className="slot-rotate" onClick={() => rotate(piece.id)} aria-label={`旋转碎片 ${piece.id + 1}`}><RotateCw size={14} /> {normalizeRotation(piece.rotation)}°</button>}
              </div>
            );
          })}
        </div>
      </div>
      <p className="puzzle-feedback" role="status">{feedback}</p>
      <button type="button" className="hint-button" onClick={() => setHintIndex((value) => Math.min(value + 1, puzzleGuidance.photo.length - 1))}><Search size={14} aria-hidden="true" /> 请求渐进提示</button>
      {hintIndex >= 0 && <p className="hint-copy">提示 {hintIndex + 1}：{puzzleGuidance.photo[hintIndex]}</p>}
    </section>
  );
}

function PieceCard({ piece, selected, onSelect, onRotate }: { piece: PhotoPieceState; selected: boolean; onSelect: () => void; onRotate: () => void }) {
  return (
    <div className={`piece-card ${selected ? "is-selected" : ""}`}>
      <button type="button" draggable onDragStart={(event) => event.dataTransfer.setData("text/photo-piece", String(piece.id))} onClick={onSelect} aria-pressed={selected} aria-label={`选择照片碎片 ${piece.id + 1}`}><span className={`piece-visual piece-${piece.id}`} style={{ transform: `rotate(${piece.rotation}deg)` }}><i>{piece.id === 4 ? "H-1" : piece.id === 5 ? "707" : ""}</i></span></button>
      <button type="button" className="piece-rotate" onClick={onRotate} aria-label={`旋转照片碎片 ${piece.id + 1}`}><RotateCw size={13} /> {normalizeRotation(piece.rotation)}°</button>
    </div>
  );
}

function PhotoScene() {
  return <div className="photo-scene" aria-hidden="true"><span className="harbor-lamp lamp-a" /><span className="harbor-lamp lamp-b" /><span className="ship-body"><b>H-1707</b></span><span className="human-shadow" /><span className="water-reflection" /><span className="shore-clock">00:31</span></div>;
}

function PhotoModal({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])") ?? []);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="复原港口照片细节">
      <div ref={dialogRef} className="photo-modal" onKeyDown={trapFocus}><button ref={closeRef} type="button" className="modal-close" onClick={onClose} aria-label="关闭照片"><X size={18} /></button><PhotoScene /><div className="photo-annotations"><span>船号 / H-1707</span><span>岸钟倒影 / 00:31</span><span>检修梯 / 第二道人影</span></div></div>
    </div>
  );
}
