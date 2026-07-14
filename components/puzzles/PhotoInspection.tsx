"use client";

import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";
import { Check, Crosshair, Move, ScanSearch, ZoomIn } from "lucide-react";
import { arePhotoHotspotsComplete } from "@/lib/puzzle-engine";
import { visualAssets } from "@/lib/visual-assets";
import { useCaseStore } from "@/store/case-store";
import type { PhotoHotspotId } from "@/types/puzzle";

const hotspots: Record<PhotoHotspotId, { label: string; discovery: string; x: number; y: number; width: number; height: number }> = {
  "ship-number": { label: "检查船体编号区域", discovery: "船体编号 H-1707", x: 69, y: 35, width: 15, height: 14 },
  "second-figure": { label: "检查码头水线阴影区域", discovery: "检修梯外侧的第二道人影", x: 74, y: 62, width: 13, height: 20 },
};

const scanSequence: Array<PhotoHotspotId | null> = [null, "ship-number", null, null, "second-figure", null];

interface PhotoInspectionProps {
  onComplete: () => void;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function PhotoInspection({ onComplete }: PhotoInspectionProps) {
  const markTaskProgress = useCaseStore((state) => state.markTaskProgress);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [found, setFound] = useState<PhotoHotspotId[]>([]);
  const [scanIndex, setScanIndex] = useState(-1);
  const [announcement, setAnnouncement] = useState("放大并拖动照片，寻找能确认船只与现场第三方的细节。");
  const dragRef = useRef<{ pointerId: number; x: number; y: number; panX: number; panY: number } | null>(null);
  const completionQueued = useRef(false);

  const movePan = (x: number, y: number) => {
    const limit = Math.max(0, (zoom - 1) * 220);
    setPan({ x: clamp(x, -limit, limit), y: clamp(y, -limit, limit) });
  };

  const updateZoom = (value: number) => {
    const next = clamp(Math.round(value * 10) / 10, 1, 2.4);
    setZoom(next);
    if (next === 1) setPan({ x: 0, y: 0 });
  };

  const confirmHotspot = (id: PhotoHotspotId) => {
    if (found.includes(id)) {
      setAnnouncement(`${hotspots[id].discovery}已经登记。`);
      return;
    }
    const next = [...found, id];
    setFound(next);
    markTaskProgress("reconstruct-photo", id);
    setAnnouncement(`已确认：${hotspots[id].discovery}。`);
    if (arePhotoHotspotsComplete(next) && !completionQueued.current) {
      completionQueued.current = true;
      window.setTimeout(onComplete, 520);
    }
  };

  const scanNextRegion = () => {
    const next = (scanIndex + 1) % scanSequence.length;
    setScanIndex(next);
    const hotspot = scanSequence[next];
    if (hotspot) {
      confirmHotspot(hotspot);
    } else {
      setAnnouncement(`逐区扫描 ${next + 1}/${scanSequence.length}：只有雨痕、系缆桩与静态噪点。`);
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    movePan(drag.panX + event.clientX - drag.x, drag.panY + event.clientY - drag.y);
  };

  const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    updateZoom(zoom + (event.deltaY < 0 ? 0.1 : -0.1));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 36 : 18;
    if (event.key === "+" || event.key === "=") updateZoom(zoom + 0.1);
    else if (event.key === "-") updateZoom(zoom - 0.1);
    else if (event.key === "ArrowLeft") movePan(pan.x + step, pan.y);
    else if (event.key === "ArrowRight") movePan(pan.x - step, pan.y);
    else if (event.key === "ArrowUp") movePan(pan.x, pan.y + step);
    else if (event.key === "ArrowDown") movePan(pan.x, pan.y - step);
    else return;
    event.preventDefault();
  };

  const imageStyle = {
    "--inspection-image": `url("${visualAssets.cctvPuzzle}")`,
    transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
  } as CSSProperties;

  return (
    <section className="photo-inspection" aria-labelledby="photo-inspection-title">
      <header className="photo-inspection__header"><div><p className="eyebrow">STAGE 02 / FORENSIC INSPECTION</p><h3 id="photo-inspection-title">检查复原照片</h3></div><span>{found.length}/2 细节确认</span></header>
      <p className="puzzle-brief">拼图只恢复了画面。放大、拖动并检查可疑颗粒；两个关键细节都登记后，照片才会进入证据墙。</p>

      <div
        className="photo-inspection__viewport"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        aria-label="可缩放和拖动的港口照片；方向键移动，按加减号缩放"
      >
        <div className="photo-inspection__image" style={imageStyle}>
          {(Object.entries(hotspots) as Array<[PhotoHotspotId, (typeof hotspots)[PhotoHotspotId]]>).map(([id, hotspot]) => (
            <button
              type="button"
              key={id}
              className={`photo-hotspot ${found.includes(id) ? "is-found" : ""}`}
              style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%`, width: `${hotspot.width}%`, height: `${hotspot.height}%` }}
              onClick={() => confirmHotspot(id)}
              aria-label={hotspot.label}
              aria-pressed={found.includes(id)}
            ><Crosshair size={16} aria-hidden="true" /></button>
          ))}
        </div>
        <span className="photo-inspection__scanline" aria-hidden="true" />
      </div>

      <div className="photo-inspection__controls">
        <label><ZoomIn size={15} /><span>放大倍率</span><input type="range" min="1" max="2.4" step="0.1" value={zoom} onChange={(event) => updateZoom(Number(event.target.value))} /><output>{zoom.toFixed(1)}×</output></label>
        <button type="button" onClick={scanNextRegion}><ScanSearch size={16} /> 逐区扫描 {scanIndex >= 0 ? `${scanIndex + 1}/${scanSequence.length}` : ""}</button>
        <button type="button" onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }}><Move size={16} /> 复位视野</button>
      </div>

      <div className="photo-inspection__findings" aria-live="polite">
        <p>{announcement}</p>
        {(Object.keys(hotspots) as PhotoHotspotId[]).map((id) => <span key={id} className={found.includes(id) ? "is-found" : ""}>{found.includes(id) && <Check size={13} />} {found.includes(id) ? hotspots[id].discovery : "未确认细节"}</span>)}
      </div>
    </section>
  );
}
