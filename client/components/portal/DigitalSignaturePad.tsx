import {
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { Eraser, Redo2, Trash2, Undo2 } from "lucide-react";

export type SignatureExport = {
  /** Raw base64 (no data: prefix) */
  dataBase64: string;
  contentType: "image/png";
  fileName: string;
  isEmpty: boolean;
};

type StrokePoint = { x: number; y: number; width: number };
type Stroke = StrokePoint[];

type Props = {
  height?: number;
  disabled?: boolean;
  className?: string;
  onChange?: (hasInk: boolean) => void;
  /** Called whenever the pad content changes enough to re-export. */
  exportRef?: MutableRefObject<(() => SignatureExport) | null>;
};

function distance(a: StrokePoint, b: StrokePoint) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/**
 * Smooth velocity-aware signature pad.
 * Exports PNG suitable for evidence `signature` uploads.
 */
export default function DigitalSignaturePad({
  height = 180,
  disabled,
  className,
  onChange,
  exportRef,
}: Props) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const drawing = useRef(false);
  const currentStroke = useRef<Stroke>([]);
  const lastPoint = useRef<StrokePoint | null>(null);
  const lastTime = useRef(0);

  const redraw = (all: Stroke[], opts?: { guides?: boolean }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (canvas.width !== Math.floor(cssW * dpr)) {
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    ctx.clearRect(0, 0, cssW, cssH);

    if (opts?.guides !== false) {
      // Subtle dot grid (display only — never exported)
      ctx.fillStyle = "hsla(214, 24%, 91%, 0.55)";
      for (let x = 12; x < cssW; x += 16) {
        for (let y = 12; y < cssH; y += 16) {
          ctx.beginPath();
          ctx.arc(x, y, 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Signature baseline guide
      ctx.strokeStyle = "hsla(214, 87%, 34%, 0.18)";
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(24, cssH * 0.72);
      ctx.lineTo(cssW - 24, cssH * 0.72);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "hsl(222 47% 11%)";
    ctx.fillStyle = "hsl(222 47% 11%)";

    for (const stroke of all) {
      if (stroke.length < 2) {
        if (stroke[0]) {
          ctx.beginPath();
          ctx.arc(stroke[0].x, stroke[0].y, stroke[0].width / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        continue;
      }
      for (let i = 1; i < stroke.length; i += 1) {
        const p0 = stroke[i - 1];
        const p1 = stroke[i];
        ctx.beginPath();
        ctx.lineWidth = (p0.width + p1.width) / 2;
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
    }
  };

  useEffect(() => {
    redraw(strokes);
    onChange?.(strokes.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes]);

  useEffect(() => {
    const onResize = () => redraw(strokes);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes]);

  const exportSignature = (): SignatureExport => {
    const canvas = canvasRef.current;
    const empty = strokes.length === 0;
    if (!canvas || empty) {
      return {
        dataBase64: "",
        contentType: "image/png",
        fileName: "signature.png",
        isEmpty: true,
      };
    }
    // Ink-only export: white background, no grid/baseline chrome
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) {
      return {
        dataBase64: "",
        contentType: "image/png",
        fileName: "signature.png",
        isEmpty: true,
      };
    }
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "hsl(222 47% 11%)";
    ctx.fillStyle = "hsl(222 47% 11%)";
    for (const stroke of strokes) {
      if (stroke.length < 2) {
        if (stroke[0]) {
          ctx.beginPath();
          ctx.arc(
            stroke[0].x,
            stroke[0].y,
            stroke[0].width / 2,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        continue;
      }
      for (let i = 1; i < stroke.length; i += 1) {
        const p0 = stroke[i - 1];
        const p1 = stroke[i];
        ctx.beginPath();
        ctx.lineWidth = (p0.width + p1.width) / 2;
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
    }
    const dataUrl = exportCanvas.toDataURL("image/png");
    const dataBase64 = dataUrl.includes(",")
      ? dataUrl.split(",")[1]
      : dataUrl;
    return {
      dataBase64,
      contentType: "image/png",
      fileName: `signature-${Date.now()}.png`,
      isEmpty: false,
    };
  };

  useEffect(() => {
    if (exportRef) exportRef.current = exportSignature;
    return () => {
      if (exportRef) exportRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportRef, strokes]);

  const pointerPos = (e: ReactPointerEvent<HTMLCanvasElement>): StrokePoint => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const now = performance.now();
    let width = 2.6;
    if (lastPoint.current && lastTime.current) {
      const dt = Math.max(now - lastTime.current, 1);
      const dist = distance(lastPoint.current, { x, y, width: 0 });
      const velocity = dist / dt;
      width = Math.max(1.4, Math.min(4.2, 4.4 - velocity * 3.2));
    }
    lastTime.current = now;
    const point = { x, y, width };
    lastPoint.current = point;
    return point;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    lastPoint.current = null;
    lastTime.current = 0;
    const point = pointerPos(e);
    currentStroke.current = [point];
    setRedoStack([]);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || disabled) return;
    const point = pointerPos(e);
    currentStroke.current.push(point);
    redraw([...strokes, currentStroke.current]);
  };

  const endStroke = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const stroke = currentStroke.current;
    currentStroke.current = [];
    lastPoint.current = null;
    if (stroke.length > 0) {
      setStrokes((prev) => [...prev, stroke]);
    }
  };

  return (
    <div className={["space-y-2", className].filter(Boolean).join(" ")}>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="pointer-events-none absolute left-3 top-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary/70">
          {t("signature.signHere")}
        </div>
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height, touchAction: "none" }}
          className="block w-full cursor-crosshair bg-gradient-to-b from-secondary/40 to-background"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={endStroke}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || strokes.length === 0}
          onClick={() => {
            setRedoStack((r) => {
              const next = [...strokes];
              const last = next.pop();
              if (last) return [...r, last];
              return r;
            });
            setStrokes((s) => s.slice(0, -1));
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold disabled:opacity-40"
        >
          <Undo2 className="h-3.5 w-3.5" />
          {t("signature.undo")}
        </button>
        <button
          type="button"
          disabled={disabled || redoStack.length === 0}
          onClick={() => {
            setRedoStack((r) => {
              const next = [...r];
              const stroke = next.pop();
              if (stroke) setStrokes((s) => [...s, stroke]);
              return next;
            });
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold disabled:opacity-40"
        >
          <Redo2 className="h-3.5 w-3.5" />
          {t("signature.redo")}
        </button>
        <button
          type="button"
          disabled={disabled || strokes.length === 0}
          onClick={() => {
            setStrokes([]);
            setRedoStack([]);
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-destructive disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t("signature.clear")}
        </button>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <Eraser className="h-3 w-3" />
          {t("signature.hint")}
        </span>
      </div>
    </div>
  );
}
