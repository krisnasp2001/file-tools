"use client";

import * as React from "react";
import { ToolPageLayout } from "@/components/tools/ToolPageLayout";
import { FileDropzone } from "@/components/file-upload/FileDropzone";
import { Button } from "@/components/ui/Button";
import { SelectedFileItem } from "@/lib/file/types";
import { downloadBlob } from "@/lib/download/download";
import { formatFileSize } from "@/lib/file/validation";
import { convertAudio } from "@/lib/media/ffmpeg";
import { useTranslation } from "@/lib/i18n/context";
import {
  Loader2,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Music,
  ArrowRight
} from "lucide-react";

const AUDIO_FORMATS = [
  { id: "mp3", label: "MP3" },
  { id: "wav", label: "WAV" },
  { id: "ogg", label: "OGG" },
  { id: "flac", label: "FLAC" },
  { id: "aac", label: "AAC" },
];

export function AudioConverterPage() {
  const { t } = useTranslation();
  const m = t.mediaTools.audioConverter;

  const [files, setFiles] = React.useState<SelectedFileItem[]>([]);
  const [targetFormat, setTargetFormat] = React.useState("mp3");
  const [isConverting, setIsConverting] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{
    data: Blob;
    outputFileName: string;
  } | null>(null);

  const readyFiles = files.filter(f => f.status === "ready");
  const currentFile = readyFiles[0]?.file;

  const handleConvert = async () => {
    if (!currentFile) return;
    setIsConverting(true);
    setError(null);
    setProgress(0);
    
    try {
      const blob = await convertAudio(currentFile, targetFormat, (p) => {
        setProgress(Math.round(p));
      });
      
      const outputFileName = currentFile.name.replace(/\.[^/.]+$/, "") + "." + targetFormat;
      
      setResult({
        data: blob,
        outputFileName
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Media conversion failed.";
      setError(msg);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    downloadBlob(result.data, result.outputFileName);
  };

  const handleReset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setProgress(0);
  };

  const breadcrumbs = [
    { label: t.common.home, href: "/" },
    { label: t.categories.audioVideo.name, href: "/categories/audio-video" },
    { label: m.title, href: "/tools/audio-converter" },
  ];

  return (
    <ToolPageLayout
      breadcrumbs={breadcrumbs}
      title={m.title}
      description={m.description}
      badge={m.badge}
      workspace={
        <div className="max-w-4xl mx-auto space-y-6">
          {!result && (
            <div className="bg-white border border-neutral-200 dark:bg-neutral-900/60 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-2">
                <Music className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                {m.uploadTitle}
              </h2>
              <FileDropzone
                value={files}
                onChange={setFiles}
                accept={["audio/*", ".mp3", ".wav", ".aac", ".ogg", ".flac", ".m4a", ".wma"]}
                multiple={false}
                maxSize={200 * 1024 * 1024}
              />

              <div className="mt-4 p-3 bg-indigo-50/80 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40 rounded-xl flex items-start gap-2.5 text-xs text-indigo-700 dark:text-indigo-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" />
                <span>{m.wasmNotice}</span>
              </div>

              {currentFile && (
                <div className="mt-6 flex flex-col md:flex-row items-end md:items-center justify-between gap-4 pt-6 border-t border-neutral-200 dark:border-neutral-800">
                  
                  <div className="w-full md:w-auto flex flex-col gap-2">
                    <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {m.targetFormat}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {AUDIO_FORMATS.map((fmt) => (
                        <button
                          key={fmt.id}
                          onClick={() => setTargetFormat(fmt.id)}
                          disabled={isConverting}
                          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${
                            targetFormat === fmt.id
                              ? "bg-neutral-900 border-neutral-900 text-white shadow-sm dark:bg-neutral-100 dark:border-neutral-100 dark:text-neutral-900"
                              : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700"
                          }`}
                        >
                          {fmt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="w-full md:w-1/3 flex flex-col items-end gap-3 mt-4 md:mt-0">
                    {isConverting && progress > 0 && (
                      <div className="w-full flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
                        <div className="flex-1 h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300" 
                            style={{ width: `${progress}%` }} 
                          />
                        </div>
                        <span className="w-12 text-right">{progress}%</span>
                      </div>
                    )}
                    
                    <Button
                      onClick={handleConvert}
                      disabled={isConverting}
                      className="w-full md:w-auto bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-neutral-900 gap-2 font-medium px-6 py-2.5 rounded-xl shadow-sm"
                    >
                      {isConverting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t.common.loading}
                        </>
                      ) : (
                        <>
                          {m.convertButton} ({targetFormat.toUpperCase()})
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>

                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/40 rounded-2xl flex items-start gap-3 text-sm text-red-700 dark:text-red-300">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <div>
                <p className="font-semibold">{t.common.error}</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {result && (
            <div className="bg-white border border-neutral-200 dark:bg-neutral-900/60 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{result.outputFileName}</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {m.readyToDownload} &bull; {formatFileSize(result.data.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {m.convertAnother}
                  </Button>
                  <Button
                    onClick={handleDownload}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium px-5 shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    {m.downloadButton}
                  </Button>
                </div>
              </div>
              
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <audio 
                  controls 
                  src={URL.createObjectURL(result.data)} 
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>
      }
    />
  );
}
