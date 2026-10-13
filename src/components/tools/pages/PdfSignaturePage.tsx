"use client";

import * as React from "react";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { FileDropzone } from "@/components/file-upload/FileDropzone";
import { Button } from "@/components/ui/Button";
import { SelectedFileItem } from "@/lib/file/types";
import { downloadBlob } from "@/lib/download/download";
import {
  Loader2, Download, RotateCcw, CheckCircle2, AlertTriangle,
  PenLine, Trash2, X, Info, Move
} from "lucide-react";
import { PDFDocument } from "pdf-lib";

const RENDER_SCALE = 1.5;

interface RenderedPage { dataUrl: string; pdfWidth: number; pdfHeight: number; }

interface SignatureZone {
  id: string;
  pageIndex: number;
  pdfX: number;
  pdfY: number;
  pdfW: number;
  pdfH: number;
}

function cropCanvas(sourceCanvas: HTMLCanvasElement): string {
  const ctx = sourceCanvas.getContext("2d");
  if (!ctx) return sourceCanvas.toDataURL("image/png");
  const w = sourceCanvas.width, h = sourceCanvas.height;
  const pix = ctx.getImageData(0, 0, w, h).data;
  let x1 = w, y1 = h, x2 = 0, y2 = 0, hasPixels = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (pix[(y * w + x) * 4 + 3] > 0) {
        if (x < x1) x1 = x;
        if (x > x2) x2 = x;
        if (y < y1) y1 = y;
        if (y > y2) y2 = y;
        hasPixels = true;
      }
    }
  }
  if (!hasPixels) return sourceCanvas.toDataURL("image/png");

  const pad = 10;
  x1 = Math.max(0, x1 - pad); y1 = Math.max(0, y1 - pad);
  x2 = Math.min(w, x2 + pad); y2 = Math.min(h, y2 + pad);
  const cropW = x2 - x1, cropH = y2 - y1;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = cropW; tempCanvas.height = cropH;
  tempCanvas.getContext("2d")?.putImageData(ctx.getImageData(x1, y1, cropW, cropH), 0, 0);
  return tempCanvas.toDataURL("image/png");
}

interface ZoneBoxProps {
  zone: SignatureZone;
  page: RenderedPage;
  penColor: string;
  penThickness: number;
  onDragStart: (e: React.MouseEvent) => void;
  onResizeStart: (e: React.MouseEvent) => void;
  onRemove: () => void;
  registerPad: (id: string, pad: import("signature_pad").default | null) => void;
  onSignatureChange: (id: string, hasDrawing: boolean) => void;
}

let globalZoneCounter = 0;
function getNextZoneId(pageIndex: number): string {
  globalZoneCounter += 1;
  return `z-${pageIndex}-${globalZoneCounter}`;
}

function ZoneBox({ zone, page, penColor, penThickness, onDragStart, onResizeStart, onRemove, registerPad, onSignatureChange }: ZoneBoxProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const padRef = React.useRef<import("signature_pad").default | null>(null);
  const [isEmpty, setIsEmpty] = React.useState(true);

  const left = `${(zone.pdfX / page.pdfWidth) * 100}%`;
  const top = `${((page.pdfHeight - (zone.pdfY + zone.pdfH)) / page.pdfHeight) * 100}%`;
  const width = `${(zone.pdfW / page.pdfWidth) * 100}%`;
  const height = `${(zone.pdfH / page.pdfHeight) * 100}%`;

  // Init SignaturePad
  React.useEffect(() => {
    let sp: import("signature_pad").default | null = null;
    async function init() {
      if (!canvasRef.current) return;
      const SignaturePad = (await import("signature_pad")).default;
      sp = new SignaturePad(canvasRef.current, {
        backgroundColor: "rgba(255,255,255,0)",
        penColor,
        minWidth: penThickness * 0.5,
        maxWidth: penThickness * 1.5,
        minDistance: 7, // Dikurangi sensitivitasnya
        velocityFilterWeight: 0.5,
      });
      sp.addEventListener("endStroke", () => {
        const empty = sp?.isEmpty() ?? true;
        setIsEmpty(empty);
        onSignatureChange(zone.id, !empty);
      });
      const c = canvasRef.current;
      c.width = c.offsetWidth * 2;
      c.height = c.offsetHeight * 2;
      c.getContext("2d")?.scale(2, 2);
      sp.clear();
      padRef.current = sp;
      registerPad(zone.id, sp);
    }
    init();
    return () => { sp?.off(); registerPad(zone.id, null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone.id]);

  // Sync pen settings when they change globally (without clearing the canvas)
  React.useEffect(() => {
    if (!padRef.current) return;
    padRef.current.penColor = penColor;
    padRef.current.minWidth = penThickness * 0.5;
    padRef.current.maxWidth = penThickness * 1.5;
  }, [penColor, penThickness]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    padRef.current?.clear();
    setIsEmpty(true);
    onSignatureChange(zone.id, false);
  };

  return (
    <div
      style={{ position: "absolute", left, top, width, height, zIndex: 10 }}
      className="group"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Explicit Drag handle */}
      <div
        className="absolute -top-3 -left-3 w-7 h-7 flex items-center justify-center bg-white border border-sky-500 rounded-full shadow-md text-sky-500 cursor-move z-30 hover:bg-sky-50 transition-colors opacity-80 group-hover:opacity-100"
        onMouseDown={onDragStart}
        title="Move Box"
      >
        <Move className="w-3.5 h-3.5" />
      </div>
      {/* Dashed border like Ctrl+T transform */}
      <div className="absolute inset-0 border-2 border-dashed border-sky-500 bg-sky-500/5 pointer-events-none" />

      {/* 4 Corners */}
      <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-sky-500 pointer-events-none" />
      <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-sky-500 pointer-events-none" />
      <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-sky-500 pointer-events-none" />

      {/* Resize handle — bottom-right */}
      <div
        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-sky-500 cursor-se-resize shadow-sm z-20"
        onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e); }}
      />

      {/* Floating Toolbar */}
      <div className="absolute -top-8 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-30">
        {!isEmpty && (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleClear}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-white shadow border border-slate-200 text-slate-500 hover:text-red-500 hover:bg-slate-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="w-7 h-7 flex items-center justify-center rounded-md bg-white shadow border border-slate-200 text-slate-500 hover:text-red-500 hover:bg-slate-50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawing canvas */}
      <div className="relative flex-1 w-full h-full">
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none block"
          onMouseDown={(e) => e.stopPropagation()} // allow signature pad to handle drawing
        />
        {isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-sky-500/50">
            <PenLine className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Tanda Tangan</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export function PdfSignaturePage() {
  const [files, setFiles] = React.useState<SelectedFileItem[]>([]);
  const [isRendering, setIsRendering] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ data: Blob; fileName: string } | null>(null);
  const [renderedPages, setRenderedPages] = React.useState<RenderedPage[]>([]);
  const [zones, setZones] = React.useState<SignatureZone[]>([]);
  const [sigSizePct, setSigSizePct] = React.useState(22);

  // Pen settings (global, synced to all zone pads)
  const [penColor, setPenColor] = React.useState("#000000");
  const [penThickness, setPenThickness] = React.useState(2);

  // Track which zones have drawings — use STATE so button re-renders
  const [drawnZones, setDrawnZones] = React.useState<Set<string>>(new Set());
  const onSignatureChange = React.useCallback((id: string, hasDrawing: boolean) => {
    setDrawnZones((prev) => {
      const next = new Set(prev);
      if (hasDrawing) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const sigPads = React.useRef<Map<string, import("signature_pad").default>>(new Map());
  const registerPad = (id: string, pad: import("signature_pad").default | null) => {
    if (pad) sigPads.current.set(id, pad);
    else sigPads.current.delete(id);
  };

  const suppressNextClick = React.useRef(false);
  const pageContainerRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const pagesWrapRef = React.useRef<HTMLDivElement>(null);
  const currentFile = files.find((f) => f.status === "ready")?.file;

  // Auto-scroll when PDF is loaded
  React.useEffect(() => {
    if (renderedPages.length > 0 && pagesWrapRef.current) {
      setTimeout(() => {
        pagesWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [renderedPages.length]);

  // Render PDF
  React.useEffect(() => {
    let cancelled = false;
    if (!currentFile) {
      queueMicrotask(() => {
        if (!cancelled) {
          setRenderedPages([]);
          setZones([]);
          setDrawnZones(new Set());
        }
      });
      return;
    }
    async function render() {
      setIsRendering(true); setError(null);
      try {
        const buf = await currentFile!.arrayBuffer();
        const pdfjsLib = await import("pdfjs-dist");
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc && typeof window !== "undefined")
          pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const doc = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
        const pages: RenderedPage[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) return;
          const pg = await doc.getPage(i);
          const uv = pg.getViewport({ scale: 1 });
          const vp = pg.getViewport({ scale: RENDER_SCALE });
          const c = document.createElement("canvas");
          c.width = vp.width; c.height = vp.height;
          await pg.render({ canvas: c, canvasContext: c.getContext("2d")!, viewport: vp }).promise;
          pages.push({ dataUrl: c.toDataURL("image/jpeg", 0.88), pdfWidth: uv.width, pdfHeight: uv.height });
        }
        if (!cancelled) { setRenderedPages(pages); setZones([]); setDrawnZones(new Set()); }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to render PDF.");
      } finally { if (!cancelled) setIsRendering(false); }
    }
    render();
    return () => { cancelled = true; };
  }, [currentFile]);

  // Click on page → add zone
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
    if (suppressNextClick.current) { suppressNextClick.current = false; return; }
    const page = renderedPages[pageIndex];
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = page.pdfWidth / rect.width;
    const pdfW = (sigSizePct / 100) * page.pdfWidth;
    const pdfH = pdfW * 0.40;
    let pdfX = (e.clientX - rect.left) * scale - pdfW / 2;
    let pdfY = (rect.height - (e.clientY - rect.top)) * scale - pdfH / 2;
    pdfX = Math.max(0, Math.min(pdfX, page.pdfWidth - pdfW));
    pdfY = Math.max(0, Math.min(pdfY, page.pdfHeight - pdfH));
    const id = getNextZoneId(pageIndex);
    setZones((z) => [...z, { id, pageIndex, pdfX, pdfY, pdfW, pdfH }]);
  };

  // Drag toolbar → move zone
  const makeDragHandler = (zone: SignatureZone) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const startPdfX = zone.pdfX, startPdfY = zone.pdfY;
    let moved = false;
    const onMove = (me: MouseEvent) => {
      const container = pageContainerRefs.current[zone.pageIndex];
      if (!container) return;
      const page = renderedPages[zone.pageIndex];
      const rect = container.getBoundingClientRect();
      const scale = page.pdfWidth / rect.width;
      if (!moved && (Math.abs(me.clientX - startX) > 3 || Math.abs(me.clientY - startY) > 3)) moved = true;
      const dx = (me.clientX - startX) / scale;
      const dy = -(me.clientY - startY) / scale;
      const newX = Math.max(0, Math.min(startPdfX + dx, page.pdfWidth - zone.pdfW));
      const newY = Math.max(0, Math.min(startPdfY + dy, page.pdfHeight - zone.pdfH));
      setZones((zs) => zs.map((z) => z.id === zone.id ? { ...z, pdfX: newX, pdfY: newY } : z));
    };
    const onUp = () => {
      if (moved) suppressNextClick.current = true;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Drag resize handle → resize zone
  const makeResizeHandler = (zone: SignatureZone) => (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const startW = zone.pdfW, startH = zone.pdfH, startPdfY = zone.pdfY;
    const onMove = (me: MouseEvent) => {
      const container = pageContainerRefs.current[zone.pageIndex];
      if (!container) return;
      const page = renderedPages[zone.pageIndex];
      const rect = container.getBoundingClientRect();
      const scale = page.pdfWidth / rect.width;
      const dxPts = (me.clientX - startX) / scale;
      const dyPts = (me.clientY - startY) / scale;
      const newW = Math.max(40, startW + dxPts);
      const newH = Math.max(15, startH + dyPts);
      const newY = Math.max(0, startPdfY - dyPts);
      setZones((zs) => zs.map((z) => z.id === zone.id ? { ...z, pdfW: newW, pdfH: newH, pdfY: newY } : z));
    };
    const onUp = () => {
      suppressNextClick.current = true;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const removeZone = (id: string) => {
    sigPads.current.delete(id);
    setZones((z) => z.filter((z) => z.id !== id));
    setDrawnZones((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const updateSigSize = (pct: number) => {
    setSigSizePct(pct);
    setZones((zs) => zs.map((z) => {
      const page = renderedPages[z.pageIndex];
      const pdfW = (pct / 100) * page.pdfWidth;
      const pdfH = pdfW * 0.40;
      return { ...z, pdfW, pdfH, pdfX: Math.max(0, Math.min(z.pdfX, page.pdfWidth - pdfW)), pdfY: Math.max(0, Math.min(z.pdfY, page.pdfHeight - pdfH)) };
    }));
  };

  // Apply all signed zones to PDF
  const handleApply = async () => {
    if (!currentFile || drawnZones.size === 0) return;
    setIsProcessing(true); setError(null);
    try {
      const buf = await currentFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf);
      const pdfPages = pdfDoc.getPages();

      for (const zone of zones) {
        const pad = sigPads.current.get(zone.id);
        if (!pad || pad.isEmpty()) continue;

        const padWithCanvas = pad as unknown as { canvas?: HTMLCanvasElement; _canvas?: HTMLCanvasElement };
        const canvas = padWithCanvas.canvas || padWithCanvas._canvas;
        let base64 = "";
        if (canvas) {
          base64 = cropCanvas(canvas).split(",")[1];
        } else {
          base64 = pad.toDataURL("image/png").split(",")[1];
        }

        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const png = await pdfDoc.embedPng(bytes);
        const pg = pdfPages[zone.pageIndex];
        if (pg) {
          const imgRatio = png.width / png.height;
          const boxRatio = zone.pdfW / zone.pdfH;
          // Scale to fit nicely inside the box with a 5% margin
          let drawW = zone.pdfW * 0.95;
          let drawH = zone.pdfH * 0.95;

          if (imgRatio > boxRatio) {
            drawH = drawW / imgRatio;
          } else {
            drawW = drawH * imgRatio;
          }

          const drawX = zone.pdfX + (zone.pdfW - drawW) / 2;
          const drawY = zone.pdfY + (zone.pdfH - drawH) / 2;

          pg.drawImage(png, { x: drawX, y: drawY, width: drawW, height: drawH });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResult({ data: blob, fileName: `${currentFile.name.replace(/\.[^/.]+$/, "")}_signed.pdf` });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to apply signatures.");
    } finally { setIsProcessing(false); }
  };

  const handleReset = () => {
    setFiles([]); setResult(null); setError(null);
    setRenderedPages([]); setZones([]); setDrawnZones(new Set()); sigPads.current.clear();
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "PDF Tools", href: "/categories/pdf" },
    { label: "Sign PDF", href: "/tools/pdf-sign" },
  ];

  return (
    <ToolPageLayout
      breadcrumbs={breadcrumbs}
      title="Sign PDF"
      description="Upload PDF, klik untuk tambah kotak TTD, gambar langsung di dalamnya. Tiap kotak bisa beda TTD."
      badge="Client-side"
      workspace={
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Upload */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur space-y-4">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <PenLine className="w-5 h-5 text-sky-400" /> Upload PDF Document
            </h2>
            <FileDropzone value={files} onChange={setFiles} accept={[".pdf", "application/pdf"]} multiple={false} maxSize={100 * 1024 * 1024} />
            {isRendering && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Rendering halaman...
              </div>
            )}
          </div>

          {renderedPages.length > 0 && (
            <>
              {/* Controls */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur flex flex-wrap gap-4 items-end">
                {/* Box size */}
                <div className="flex-1 min-w-40 space-y-1">
                  <label className="text-xs font-medium text-slate-300">Ukuran kotak: {sigSizePct}%</label>
                  <input type="range" min={8} max={55} value={sigSizePct} onChange={(e) => updateSigSize(Number(e.target.value))} className="w-full accent-sky-500" />
                </div>
                {/* Pen thickness */}
                <div className="flex-1 min-w-40 space-y-1">
                  <label className="text-xs font-medium text-slate-300">Ketebalan pena: {penThickness}px</label>
                  <input type="range" min={1} max={6} step={0.5} value={penThickness} onChange={(e) => setPenThickness(Number(e.target.value))} className="w-full accent-slate-400" />
                </div>
                {/* Pen color */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Warna pena</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={penColor} onChange={(e) => setPenColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-slate-700 cursor-pointer bg-transparent" />
                    <span className="text-xs text-slate-400">{penColor.toUpperCase()}</span>
                  </div>
                </div>
                {/* Hint */}
                <div className="flex items-start gap-2 bg-slate-800/80 border border-slate-700 text-slate-400 rounded-xl px-3 py-2 text-xs w-full sm:w-auto">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Klik halaman → tambah kotak. Toolbar abu = drag. Pojok kanan-bawah = resize.</span>
                </div>
              </div>

              {/* Pages */}
              <div ref={pagesWrapRef} className="space-y-4 pt-4">
                {renderedPages.map((pg, idx) => {
                  const pageZones = zones.filter((z) => z.pageIndex === idx);
                  return (
                    <div key={idx} className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
                      <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-300">Halaman {idx + 1}</span>
                        <span className="text-slate-500">
                          {pageZones.length > 0 ? `${pageZones.length} kotak · klik untuk tambah` : "Klik untuk tambah kotak TTD"}
                        </span>
                      </div>
                      <div
                        ref={(el) => { pageContainerRefs.current[idx] = el; }}
                        className="relative cursor-crosshair w-full select-none"
                        style={{ aspectRatio: `${pg.pdfWidth} / ${pg.pdfHeight}` }}
                        onClick={(e) => handlePageClick(e, idx)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={pg.dataUrl} alt={`Halaman ${idx + 1}`} className="absolute inset-0 w-full h-full object-fill" draggable={false} />
                        {pageZones.map((zone) => (
                          <ZoneBox
                            key={zone.id}
                            zone={zone}
                            page={pg}
                            penColor={penColor}
                            penThickness={penThickness}
                            onDragStart={makeDragHandler(zone)}
                            onResizeStart={makeResizeHandler(zone)}
                            onRemove={() => removeZone(zone.id)}
                            registerPad={registerPad}
                            onSignatureChange={onSignatureChange}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 text-sm text-red-300">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" /> {error}
                </div>
              )}

              {/* Sticky Apply bar */}
              {!result && (
                <div className="sticky bottom-4 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex items-center gap-4 shadow-2xl">
                  <div className="flex-1 text-sm text-slate-300">
                    {zones.length === 0
                      ? <span className="text-slate-500">Belum ada kotak — klik halaman untuk mulai</span>
                      : <span>
                        <strong className="text-sky-400">{zones.length}</strong> kotak ·{" "}
                        <strong className="text-emerald-400">{drawnZones.size}</strong> sudah di-TTD
                      </span>}
                  </div>
                  <Button
                    onClick={handleApply}
                    disabled={drawnZones.size === 0 || isProcessing}
                    className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white gap-2 px-6 py-2.5 rounded-xl shadow-lg shadow-sky-600/25 whitespace-nowrap"
                  >
                    {isProcessing
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Menerapkan...</>
                      : <><PenLine className="w-4 h-4" /> Apply & Download</>}
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Result */}
          {result && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100">{result.fileName}</h3>
                    <p className="text-xs text-slate-400">{drawnZones.size} tanda tangan berhasil ditanam</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleReset} className="border-slate-700 hover:bg-slate-800 text-slate-300 gap-1.5">
                    <RotateCcw className="w-4 h-4" /> Dokumen Baru
                  </Button>
                  <Button onClick={() => downloadBlob(result.data, result.fileName)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium px-5 shadow-lg shadow-emerald-600/25">
                    <Download className="w-4 h-4" /> Download PDF
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      }
    />
  );
}
