"use client";

import * as React from "react";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { FileDropzone } from "@/components/file-upload/FileDropzone";
import { Button } from "@/components/ui/Button";
import { SelectedFileItem } from "@/lib/file/types";
import { downloadBlob } from "@/lib/download/download";
import {
  Loader2,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Stamp,
  Type,
  Move,
} from "lucide-react";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";

const WATERMARK_PRESETS = ["CONFIDENTIAL", "DRAFT", "SAMPLE", "COPY", "VOID"];
const RENDER_SCALE = 1.5;

type RenderedPage = {
  dataUrl: string;
  pdfWidth: number;
  pdfHeight: number;
};

type WatermarkZone = {
  pdfX: number;
  pdfY: number;
  pdfW: number;
  pdfH: number;
};

function WatermarkBox({
  zone,
  page,
  containerRef,
  text,
  colorHex,
  opacity,
  onChange,
}: {
  zone: WatermarkZone;
  page: RenderedPage;
  containerRef: React.RefObject<HTMLDivElement | null>;
  text: string;
  colorHex: string;
  opacity: number;
  onChange: (z: WatermarkZone) => void;
}) {
  const [displayW, setDisplayW] = React.useState(1);

  React.useEffect(() => {
    if (!containerRef.current) return;
    setDisplayW(containerRef.current.clientWidth);
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) setDisplayW(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [containerRef]);

  const displayH = displayW * (page.pdfHeight / page.pdfWidth);
  const scale = displayW / page.pdfWidth;

  const left = zone.pdfX * scale;
  const top = displayH - (zone.pdfY + zone.pdfH) * scale;
  const width = zone.pdfW * scale;
  const height = zone.pdfH * scale;

  const onDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startPdfX = zone.pdfX;
    const startPdfY = zone.pdfY;

    const onMove = (me: MouseEvent) => {
      const dx = (me.clientX - startX) / scale;
      const dy = -(me.clientY - startY) / scale;
      const newX = Math.max(0, Math.min(startPdfX + dx, page.pdfWidth - zone.pdfW));
      const newY = Math.max(0, Math.min(startPdfY + dy, page.pdfHeight - zone.pdfH));
      onChange({ ...zone, pdfX: newX, pdfY: newY });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startPdfW = zone.pdfW;
    const startPdfH = zone.pdfH;
    const startPdfY = zone.pdfY;

    const onMove = (me: MouseEvent) => {
      const dx = (me.clientX - startX) / scale;
      const dy = (me.clientY - startY) / scale;
      const newW = Math.max(50, Math.min(startPdfW + dx, page.pdfWidth - zone.pdfX));
      const newH = Math.max(20, Math.min(startPdfH + dy, startPdfY + startPdfH));
      const newY = startPdfY + startPdfH - newH;

      onChange({ ...zone, pdfW: newW, pdfH: newH, pdfY: newY });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      style={{ position: "absolute", left, top, width, height, zIndex: 10 }}
      className="group"
    >
      <div
        className="absolute -top-3 -left-3 w-7 h-7 flex items-center justify-center bg-white border border-violet-500 rounded-full shadow-md text-violet-500 cursor-move z-30 hover:bg-violet-50 transition-colors opacity-80 group-hover:opacity-100"
        onMouseDown={onDragStart}
        title="Move Watermark"
      >
        <Move className="w-3.5 h-3.5" />
      </div>
      <div className="absolute inset-0 border-2 border-dashed border-violet-500 bg-violet-500/5 pointer-events-none" />
      <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-violet-500 pointer-events-none" />
      <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-violet-500 pointer-events-none" />
      <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-violet-500 pointer-events-none" />
      <div
        className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-violet-500 cursor-se-resize shadow-sm z-20"
        onMouseDown={onResizeStart}
      />
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-visible pointer-events-none">
        <span
          className="font-bold whitespace-nowrap"
          style={{
            color: colorHex,
            opacity,
            fontSize: `${height * 0.5}px`,
            transform: "rotate(-35deg)",
            lineHeight: 1,
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
}

export function PdfWatermarkPage({ hideHeader }: { hideHeader?: boolean }) {
  const [files, setFiles] = React.useState<SelectedFileItem[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isRendering, setIsRendering] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ data: Blob; fileName: string } | null>(null);

  const [text, setText] = React.useState("CONFIDENTIAL");
  const [opacity, setOpacity] = React.useState(0.25);
  const [colorHex, setColorHex] = React.useState("#cc0000");

  const [renderedPages, setRenderedPages] = React.useState<RenderedPage[]>([]);
  const [zone, setZone] = React.useState<WatermarkZone | null>(null);

  const pageContainerRef = React.useRef<HTMLDivElement>(null);
  const pagesWrapRef = React.useRef<HTMLDivElement>(null);

  const currentFile = files.find((f) => f.status === "ready")?.file;

  React.useEffect(() => {
    if (renderedPages.length > 0 && pagesWrapRef.current) {
      setTimeout(() => {
        pagesWrapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [renderedPages.length]);

  React.useEffect(() => {
    let cancelled = false;
    if (!currentFile) {
      queueMicrotask(() => {
        if (!cancelled) {
          setRenderedPages([]);
          setZone(null);
        }
      });
      return;
    }
    async function render() {
      setIsRendering(true);
      setError(null);
      try {
        const buf = await currentFile!.arrayBuffer();
        const pdfjsLib = await import("pdfjs-dist");
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc && typeof window !== "undefined") {
          pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        }
        const doc = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
        const pages: RenderedPage[] = [];
        
        const pg = await doc.getPage(1);
        const uv = pg.getViewport({ scale: 1 });
        const vp = pg.getViewport({ scale: RENDER_SCALE });
        const c = document.createElement("canvas");
        c.width = vp.width;
        c.height = vp.height;
        await pg.render({ canvas: c, canvasContext: c.getContext("2d")!, viewport: vp }).promise;
        pages.push({ dataUrl: c.toDataURL("image/jpeg", 0.88), pdfWidth: uv.width, pdfHeight: uv.height });
        
        if (!cancelled) {
          setRenderedPages(pages);
          const pdfW = uv.width * 0.7;
          const pdfH = pdfW * 0.3;
          setZone({
            pdfX: (uv.width - pdfW) / 2,
            pdfY: (uv.height - pdfH) / 2,
            pdfW,
            pdfH,
          });
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to render PDF.");
      } finally {
        if (!cancelled) setIsRendering(false);
      }
    }
    render();
    return () => { cancelled = true; };
  }, [currentFile]);

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return { r, g, b };
  };

  const handleApply = async () => {
    if (!currentFile || !text.trim() || !zone) return;
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const arrayBuffer = await currentFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pages = pdfDoc.getPages();
      const { r, g, b } = hexToRgb(colorHex);

      const fontSize = zone.pdfH * 0.5;
      const textWidth = font.widthOfTextAtSize(text, fontSize);

      const cx = zone.pdfX + zone.pdfW / 2;
      const cy = zone.pdfY + zone.pdfH / 2;

      const angleRad = -35 * (Math.PI / 180);
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);
      
      const dx = -textWidth / 2;
      const dy = -fontSize * 0.35;

      const rx = dx * cosA - dy * sinA;
      const ry = dx * sinA + dy * cosA;

      for (const page of pages) {
        page.drawText(text, {
          x: cx + rx,
          y: cy + ry,
          size: fontSize,
          font,
          color: rgb(r, g, b),
          opacity,
          rotate: degrees(-35),
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const baseName = currentFile.name.replace(/\.[^/.]+$/, "");
      setResult({ data: blob, fileName: `${baseName}_watermarked.pdf` });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add watermark.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setRenderedPages([]);
    setZone(null);
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "PDF Tools", href: "/categories/pdf" },
    { label: "PDF Watermark", href: "/tools/pdf-watermark" },
  ];

  return (
    <ToolPageLayout hideHeader={hideHeader}
      breadcrumbs={breadcrumbs}
      title="Add Watermark to PDF"
      description="Add a diagonal text watermark to every page of your PDF — fully private, processed in your browser."
      badge="Client-side"
      workspace={
        <div className="max-w-4xl mx-auto space-y-6">
          {!result && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur space-y-6">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <Stamp className="w-5 h-5 text-violet-400" />
                Upload PDF & Configure Watermark
              </h2>

              <FileDropzone
                value={files}
                onChange={setFiles}
                accept={[".pdf", "application/pdf"]}
                multiple={false}
                maxSize={100 * 1024 * 1024}
              />

              {currentFile && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Watermark Text</label>
                    <div className="flex gap-2 flex-wrap">
                      {WATERMARK_PRESETS.map((p) => (
                        <button
                          key={p}
                          onClick={() => setText(p)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                            text === p
                              ? "bg-violet-600 border-violet-500 text-white"
                              : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Custom text..."
                      className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg p-2.5 focus:ring-violet-500 focus:border-violet-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">
                        Opacity: {Math.round(opacity * 100)}%
                      </label>
                      <input
                        type="range"
                        min={5}
                        max={80}
                        value={Math.round(opacity * 100)}
                        onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                        className="w-full accent-violet-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={colorHex}
                          onChange={(e) => setColorHex(e.target.value)}
                          className="w-10 h-10 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                        />
                        <span className="text-sm text-slate-400">{colorHex.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 text-sm text-red-300">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
              <p>{error}</p>
            </div>
          )}

          {isRendering && (
            <div className="p-12 flex flex-col items-center justify-center gap-4 text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              <p>Memuat PDF untuk preview...</p>
            </div>
          )}

          {!result && renderedPages.length > 0 && zone && (
            <div ref={pagesWrapRef} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-200">
                  Visual Preview (Halaman 1)
                </h3>
                <Button
                  onClick={handleApply}
                  disabled={isProcessing || !text.trim()}
                  className="bg-violet-600 hover:bg-violet-500 text-white gap-2 font-medium shadow-lg shadow-violet-600/25"
                >
                  {isProcessing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Menerapkan...</>
                  ) : (
                    <><Type className="w-4 h-4" /> Terapkan Watermark</>
                  )}
                </Button>
              </div>

              <div className="bg-slate-900 p-4 sm:p-6 lg:p-8 rounded-2xl border border-slate-800 overflow-x-auto overflow-y-hidden text-center flex flex-col items-center">
                <div
                  ref={pageContainerRef}
                  className="relative mx-auto bg-white shadow-2xl shadow-black/50 select-none"
                  style={{
                    width: "100%",
                    maxWidth: `${renderedPages[0].pdfWidth}px`,
                    aspectRatio: `${renderedPages[0].pdfWidth} / ${renderedPages[0].pdfHeight}`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={renderedPages[0].dataUrl}
                    alt="PDF Page 1"
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  />
                  
                  <WatermarkBox
                    zone={zone}
                    page={renderedPages[0]}
                    containerRef={pageContainerRef}
                    text={text}
                    colorHex={colorHex}
                    opacity={opacity}
                    onChange={setZone}
                  />
                </div>
                <p className="mt-4 text-sm text-slate-500">Watermark akan diterapkan pada semua halaman dengan posisi yang sama</p>
              </div>
            </div>
          )}

          {result && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100">{result.fileName}</h3>
                    <p className="text-xs text-slate-400">Watermark applied to all pages</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleReset} className="border-slate-700 hover:bg-slate-800 text-slate-300 gap-1.5">
                    <RotateCcw className="w-4 h-4" /> New File
                  </Button>
                  <Button
                    onClick={() => downloadBlob(result.data, result.fileName)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium px-5 shadow-lg shadow-emerald-600/25"
                  >
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
