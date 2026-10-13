"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Download, FileUp, Loader2, AlertCircle, AlignLeft, AlignCenter, AlignRight, AlignJustify } from "lucide-react";
import { PDFDocument, rgb } from "pdf-lib";
import { useTranslation } from "@/lib/i18n/context";

type PDFDocumentProxy = import("pdfjs-dist").PDFDocumentProxy;

interface TextItemData {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  fontSize: number;
  transform: number[];
  pdfX: number;
  pdfY: number;
  pdfWidth: number;
  pdfHeight: number;
  pdfFontSize: number;
  isEdited?: boolean;
  originalHeight: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  originalRects?: { pdfX: number; pdfY: number; pdfWidth: number; pdfHeight: number }[];
}

export function PdfVisualEditorPage() {
  const { t, formatText } = useTranslation();
  const p = t.pdfVisualEditor;

  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pageViewport, setPageViewport] = useState<{ width: number; height: number; transform: number[] } | null>(null);
  const [textItems, setTextItems] = useState<TextItemData[]>([]);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const spanRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const loadPdf = useCallback(async (f: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const pdfjsLib = await import("pdfjs-dist");
      if (typeof window !== "undefined" && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      }
      const ab = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
      setPdfDoc(pdf);
      setNumPages(pdf.numPages);
      setCurrentPage(1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load PDF");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const renderPage = useCallback(async (pageNumber: number) => {
    if (!pdfDoc || !canvasRef.current || !textLayerRef.current) return;
    setIsLoading(true);
    try {
      const pdfjsLib = await import("pdfjs-dist");
      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 });
      setPageViewport({ width: viewport.width, height: viewport.height, transform: viewport.transform });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({
        canvasContext: context,
        viewport,
      } as unknown as Parameters<typeof page.render>[0]).promise;

      const textContent = await page.getTextContent();
      interface RawPdfItem {
        str: string;
        transform: number[];
        width: number;
        height: number;
        fontName: string;
      }
      const rawItems: TextItemData[] = (textContent.items as unknown as RawPdfItem[]).map((item) => {
        const t = pdfjsLib.Util.transform(viewport.transform, item.transform);
        const fs = Math.sqrt(t[0] ** 2 + t[1] ** 2);
        return {
          str: item.str,
          x: t[4],
          y: t[5],
          width: item.width * 1.5,
          height: item.height * 1.5,
          fontName: item.fontName,
          fontSize: fs,
          transform: t,
          pdfX: item.transform[4],
          pdfY: item.transform[5],
          pdfWidth: item.width,
          pdfHeight: item.height,
          pdfFontSize: Math.sqrt(item.transform[0] ** 2 + item.transform[1] ** 2),
          originalHeight: fs,
        };
      });

      const sorted = rawItems.sort((a, b) =>
        Math.abs(a.y - b.y) < a.fontSize * 0.5 ? a.x - b.x : a.y - b.y
      );
      const groups: TextItemData[] = [];
      let cur: TextItemData | null = null;
      let lastLineY = 0;

      for (const item of sorted) {
        if (!item.str.trim() && item.str.length === 0) continue;
        if (!cur) {
          cur = {
            ...item,
            originalRects: [
              {
                pdfX: item.pdfX,
                pdfY: item.pdfY,
                pdfWidth: item.pdfWidth,
                pdfHeight: item.pdfFontSize,
              },
            ],
          };
          lastLineY = item.y;
          groups.push(cur);
          continue;
        }
        const isSameLine = Math.abs(item.y - cur.y) < cur.fontSize * 0.5;
        const lineGap = item.y - lastLineY;
        const isNextLine = !isSameLine && lineGap > 0 && lineGap < cur.fontSize * 1.5;
        const isSameFont =
          item.fontName === cur.fontName && Math.abs(item.fontSize - cur.fontSize) < 2;
        const isSimilarSize = Math.abs(item.fontSize - cur.fontSize) < 2;
        const isAligned = Math.abs(item.x - cur.x) < cur.fontSize * 4;
        const curEndX = cur.x + cur.width;
        const gap = item.x - curEndX;
        const isContinuous = gap >= -cur.fontSize * 0.5 && gap < cur.fontSize * 2;

        if (
          (isSameFont && isSameLine && isContinuous) ||
          (isSimilarSize && isNextLine && isAligned)
        ) {
          cur.str += isSameLine
            ? (cur.str.endsWith(" ") || item.str.startsWith(" ") ? "" : " ") + item.str.trim()
            : "\n" + item.str;
          if (!isSameLine) lastLineY = item.y;
          cur.originalRects!.push({
            pdfX: item.pdfX,
            pdfY: item.pdfY,
            pdfWidth: item.pdfWidth,
            pdfHeight: item.pdfFontSize,
          });
          cur.width = Math.max(cur.width, item.x + item.width - cur.x);
          cur.originalHeight = lastLineY - cur.y + cur.fontSize;
        } else {
          cur = {
            ...item,
            originalRects: [
              {
                pdfX: item.pdfX,
                pdfY: item.pdfY,
                pdfWidth: item.pdfWidth,
                pdfHeight: item.pdfFontSize,
              },
            ],
          };
          lastLineY = item.y;
          groups.push(cur);
        }
      }

      spanRefs.current = new Array(groups.length).fill(null);
      setTextItems(groups);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to render page");
    } finally {
      setIsLoading(false);
    }
  }, [pdfDoc]);

  useEffect(() => {
    let cancelled = false;
    if (file) {
      queueMicrotask(() => {
        if (!cancelled) {
          loadPdf(file);
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [file, loadPdf]);

  useEffect(() => {
    let cancelled = false;
    if (pdfDoc) {
      queueMicrotask(() => {
        if (!cancelled) {
          renderPage(currentPage);
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, currentPage, renderPage]);

  const handleExport = async () => {
    if (!file) return;
    setIsLoading(true); setError(null);
    try {
      const ab = await file.arrayBuffer();
      const pdfLibDoc = await PDFDocument.load(ab);
      if (textLayerRef.current && textItems.length > 0) {
        const spans = Array.from(textLayerRef.current.querySelectorAll("span"));
        const page = pdfLibDoc.getPage(currentPage - 1);
        spans.forEach((span, idx) => {
          const newText = (span as HTMLElement).innerText || span.textContent || "";
          const orig = textItems[idx];
          if (newText !== orig.str || orig.isEdited) {
            (orig.originalRects?.length ? orig.originalRects : [{ pdfX: orig.pdfX, pdfY: orig.pdfY, pdfWidth: orig.pdfWidth, pdfHeight: orig.pdfFontSize }]).forEach(rect => {
              page.drawRectangle({ x: rect.pdfX, y: rect.pdfY - rect.pdfHeight * 0.2, width: rect.pdfWidth + 2, height: rect.pdfHeight * 1.4, color: rgb(1, 1, 1) });
            });
            const lineH = orig.originalRects && orig.originalRects.length > 1
              ? Math.abs(orig.originalRects[0].pdfY - orig.originalRects[1].pdfY)
              : orig.pdfFontSize * 1.2;
            page.drawText(newText, { x: orig.pdfX, y: orig.pdfY, size: orig.pdfFontSize, lineHeight: lineH, color: rgb(0, 0, 0) });
          }
        });
      }
      const pdfBytes = await pdfLibDoc.save();
      const blob = new Blob([pdfBytes.slice(0)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `visual-edited-${file.name}`;
      document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to export PDF");
    } finally { setIsLoading(false); }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">{p.title}</h1>
        <p className="text-neutral-500 dark:text-neutral-400">{p.description}</p>
      </div>

      {!file ? (
        <Card className="p-12 border-2 border-dashed border-neutral-300 dark:border-neutral-800 flex flex-col items-center justify-center space-y-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors">
          <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-full">
            <FileUp className="w-8 h-8 text-neutral-800 dark:text-neutral-200" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">{p.uploadPrompt}</h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{p.dragDropOrClick}</p>
          </div>
          <input type="file" accept=".pdf,application/pdf" className="hidden" id="pdf-upload"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
          <Button onClick={() => document.getElementById("pdf-upload")?.click()}>{p.selectPdfFile}</Button>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1 || isLoading}>
                {p.previous}
              </Button>
              <span className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">
                {formatText(p.pageOf, { current: currentPage, total: numPages })}
              </span>
              <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage >= numPages || isLoading}>
                {p.next}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setFile(null)}>
                {p.startOver}
              </Button>
              <Button onClick={handleExport} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                {p.exportPdf}
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" /><p>{error}</p>
            </div>
          )}

          <div className="relative border rounded-lg shadow-sm bg-gray-100 overflow-auto flex justify-center p-4">
            {isLoading && !pageViewport && (
              <div className="absolute inset-0 z-50 bg-white/50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
            <div className="relative shadow-md bg-white" style={{ width: pageViewport?.width || 800, height: pageViewport?.height || 1000 }}>
              <canvas ref={canvasRef} className="absolute top-0 left-0" />
              <div ref={textLayerRef} className="absolute top-0 left-0 w-full h-full text-transparent selection:bg-primary/30"
                style={{ color: "transparent", caretColor: "black" }}>
                {/* White covers: hide original canvas text.
                    The canvas NEVER moves, so covers must be at the ORIGINAL position (no shiftDown). */}
                {textItems.map((item, idx) => {
                  if (!item.isEdited) return null;
                  return (
                    <div
                      key={`cover-${idx}`}
                      className="absolute bg-white"
                      style={{
                        left: `${item.x - 2}px`,
                        // NO shiftDown — canvas text stays at original position
                        top: `${item.y - item.fontSize * 0.8}px`,
                        width: `${(pageViewport?.width || 800) - item.x - 18}px`,
                        height: `${item.originalHeight + item.fontSize * 0.4}px`,
                        zIndex: 1,
                      }}
                    />
                  );
                })}

                {textItems.map((item, idx) => {
                  const isFocused = focusedIdx === idx;
                  return (
                    <React.Fragment key={idx}>
                      {/* Floating alignment toolbar - appears above focused block */}
                      {isFocused && (
                        <div
                          className="absolute flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-lg px-1 py-1"
                          style={{
                            left: `${item.x}px`,
                            top: `${item.y - item.fontSize * 0.8 - 38}px`,
                            zIndex: 50,
                          }}
                          // Prevent blur when clicking toolbar buttons
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          {(['left', 'center', 'right', 'justify'] as const).map((align) => {
                            const Icon = { left: AlignLeft, center: AlignCenter, right: AlignRight, justify: AlignJustify }[align];
                            const isActive = (item.textAlign ?? 'left') === align;
                            return (
                              <button
                                key={align}
                                title={`Align ${align}`}
                                onClick={() => {
                                  setTextItems(prev => {
                                    const next = [...prev];
                                    next[idx] = { ...next[idx], textAlign: align, isEdited: true };
                                    return next;
                                  });
                                }}
                                className={`p-1.5 rounded-md transition-colors ${isActive
                                  ? 'bg-primary text-white'
                                  : 'text-gray-600 hover:bg-gray-100'
                                  }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <span
                        ref={el => { spanRefs.current[idx] = el; }}
                        contentEditable
                        suppressContentEditableWarning
                        onFocus={() => setFocusedIdx(idx)}
                        onBlur={(e) => {
                          // Delay clearing so toolbar clicks register first
                          setTimeout(() => setFocusedIdx(prev => prev === idx ? null : prev), 150);
                          const newText = e.currentTarget.innerText || e.currentTarget.textContent || "";
                          if (newText !== item.str) {
                            setTextItems(prev => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], str: newText, isEdited: true };
                              return next;
                            });
                          }
                        }}
                        className={`absolute whitespace-pre-wrap origin-bottom-left hover:bg-blue-100/30 hover:text-black! focus:text-black! focus:bg-white focus:ring-1 focus:ring-primary outline-none transition-none ${item.isEdited ? "!text-black bg-white z-10" : ""}`}
                        style={{
                          left: `${item.x}px`,
                          top: `${item.y - item.fontSize * 0.8}px`,
                          fontSize: `${item.fontSize}px`,
                          fontFamily: item.fontName,
                          maxWidth: `${(pageViewport?.width || 800) - item.x - 20}px`,
                          // Correct horizontal scale: compare horizontal to vertical scale
                          transform: `scaleX(${Math.sqrt(item.transform[0] ** 2 + item.transform[1] ** 2) / Math.sqrt(item.transform[2] ** 2 + item.transform[3] ** 2)})`,
                          transformOrigin: "left bottom",
                          lineHeight: `${item.fontSize * 1.2}px`,
                          textAlign: item.textAlign ?? 'left',
                        }}
                      >
                        {item.str}
                      </span>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
