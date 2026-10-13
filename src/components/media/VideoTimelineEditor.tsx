"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, AlertTriangle } from "lucide-react";

interface VideoTimelineEditorProps {
  file: File;
  startTime: number;
  endTime: number;
  onStartTimeChange: (time: number) => void;
  onEndTimeChange: (time: number) => void;
  onDurationChange: (duration: number) => void;
  disabled?: boolean;
}

export function VideoTimelineEditor({
  file,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  onDurationChange,
  disabled
}: VideoTimelineEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);

  const [videoUrl, setVideoUrl] = useState<string>("");
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isGeneratingThumbs, setIsGeneratingThumbs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    let isSubscribed = true;

    Promise.resolve().then(() => {
      if (!isSubscribed) return;
      setVideoUrl(url);
      setThumbnails([]);
      setDuration(0);
      setCurrentTime(0);
      setError(null);
    });

    return () => {
      isSubscribed = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      const d = videoRef.current.duration;
      setDuration(d);
      onDurationChange(d);
      if (endTime === 0 || endTime > d || endTime === 10) {
        onEndTimeChange(d);
      }
      generateThumbnails(d);
    }
  };

  const generateThumbnails = async (totalDuration: number) => {
    if (!hiddenVideoRef.current || totalDuration <= 0) return;
    setIsGeneratingThumbs(true);

    const video = hiddenVideoRef.current;
    const numThumbs = 10;
    const interval = totalDuration / numThumbs;
    const thumbs: string[] = [];

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // Wait for the video to be ready
    await new Promise<void>((resolve) => {
      const handleCanPlay = () => {
        video.removeEventListener("canplay", handleCanPlay);
        resolve();
      };
      if (video.readyState >= 3) {
        resolve();
      } else {
        video.addEventListener("canplay", handleCanPlay);
      }
    });

    // Set canvas dimensions preserving aspect ratio, small height
    const targetHeight = 60;
    const aspectRatio = video.videoWidth / video.videoHeight || 16 / 9;
    canvas.width = targetHeight * aspectRatio;
    canvas.height = targetHeight;

    for (let i = 0; i < numThumbs; i++) {
      const seekTime = i * interval + interval / 2;
      
      await new Promise<void>((resolve, reject) => {
        const handleSeeked = () => {
          video.removeEventListener("seeked", handleSeeked);
          video.removeEventListener("error", handleError);
          resolve();
        };
        const handleError = () => {
          video.removeEventListener("seeked", handleSeeked);
          video.removeEventListener("error", handleError);
          reject(new Error("Video seek error"));
        };
        video.addEventListener("seeked", handleSeeked);
        video.addEventListener("error", handleError);
        video.currentTime = seekTime;
      }).catch(() => {
        // ignore individual seek errors
      });

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        thumbs.push(canvas.toDataURL("image/jpeg", 0.7));
      }
    }

    setThumbnails(thumbs);
    setIsGeneratingThumbs(false);
  };

  useEffect(() => {
    let animationFrameId: number;
    const updatePlayhead = () => {
      if (videoRef.current) {
        setCurrentTime(videoRef.current.currentTime);
        if (videoRef.current.currentTime >= endTime) {
          videoRef.current.pause();
          videoRef.current.currentTime = startTime;
          setCurrentTime(startTime);
          setIsPlaying(false);
        }
      }
      if (isPlaying) {
        animationFrameId = requestAnimationFrame(updatePlayhead);
      }
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(updatePlayhead);
    }
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, startTime, endTime]);

  const togglePlay = () => {
    if (disabled) return;
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        if (videoRef.current.currentTime < startTime || videoRef.current.currentTime >= endTime) {
          videoRef.current.currentTime = startTime;
        }
        videoRef.current.play();
      }
    }
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || duration === 0 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedTime = (x / rect.width) * duration;
    
    if (videoRef.current) {
      videoRef.current.currentTime = clickedTime;
      setCurrentTime(clickedTime);
    }
  };

  const handleDragStart = (type: "start" | "end") => (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || duration === 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const initialTime = type === "start" ? startTime : endTime;
    
    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = (deltaX / rect.width) * duration;
      
      let newTime = initialTime + deltaTime;
      newTime = Math.max(0, Math.min(newTime, duration));
      
      if (type === "start") {
        newTime = Math.min(newTime, endTime - 0.1);
        onStartTimeChange(newTime);
      } else {
        newTime = Math.max(newTime, startTime + 0.1);
        onEndTimeChange(newTime);
      }
      
      // Update preview to the dragged position
      if (videoRef.current) {
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    };
    
    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
    
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00.00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {videoUrl && (
        <>
          <video
            ref={videoRef}
            src={videoUrl}
            onLoadedMetadata={handleMetadataLoaded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={(e) => {
                if (!isPlaying) setCurrentTime(e.currentTarget.currentTime);
            }}
            onEnded={() => setIsPlaying(false)}
            className="w-full rounded-lg bg-black aspect-video object-contain"
            style={{ maxHeight: '400px' }}
          />
          <video
            ref={hiddenVideoRef}
            src={videoUrl}
            className="hidden"
            muted
            playsInline
            crossOrigin="anonymous"
          />
        </>
      )}

      {/* Editor Timeline Area */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-inner flex flex-col relative">
        {error && (
          <div className="absolute inset-0 z-20 bg-slate-900/90 backdrop-blur flex items-center justify-center p-4">
            <div className="text-sm text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {error}
            </div>
          </div>
        )}
        
        {/* Toolbar */}
        <div className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900/50">
          <button
            type="button"
            onClick={togglePlay}
            disabled={disabled || duration === 0}
            className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
          </button>
          <div className="font-mono text-sm text-slate-300 tabular-nums">
             {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
        
        {/* Timeline Container */}
        <div 
          className="relative w-full h-16 select-none group cursor-pointer bg-slate-950 flex"
          ref={containerRef}
          onPointerDown={handleTimelineClick}
        >
          {/* Thumbnails */}
          <div className="absolute inset-0 flex overflow-hidden pointer-events-none">
            {thumbnails.length > 0 ? (
              thumbnails.map((src, i) => (
                <div key={i} className="flex-1 h-full relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                </div>
              ))
            ) : (
              isGeneratingThumbs && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs text-slate-500 animate-pulse">Generating thumbnails...</span>
                </div>
              )
            )}
          </div>
          
          {/* Dimmed areas */}
          {duration > 0 && (
             <>
               <div 
                 className="absolute inset-y-0 left-0 bg-slate-950/70 pointer-events-none"
                 style={{ width: `${(startTime / duration) * 100}%` }}
               />
               <div 
                 className="absolute inset-y-0 right-0 bg-slate-950/70 pointer-events-none"
                 style={{ left: `${(endTime / duration) * 100}%` }}
               />
             </>
          )}
          
          {/* Playhead */}
          {duration > 0 && (
            <div 
              className="absolute inset-y-0 w-px bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.8)] pointer-events-none z-20"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            >
               <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border-[5px] border-transparent border-t-rose-500" />
            </div>
          )}
          
          {/* Selection Handles & Border */}
          {duration > 0 && (
            <div 
              className="absolute inset-y-0 border-y-2 border-indigo-500 z-10 pointer-events-none"
              style={{ 
                left: `${(startTime / duration) * 100}%`,
                width: `${((endTime - startTime) / duration) * 100}%`
              }}
            >
              {/* Start Handle */}
              <div 
                className="absolute inset-y-0 -left-2 w-4 cursor-ew-resize flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors pointer-events-auto"
                onPointerDown={handleDragStart("start")}
              >
                <div className="w-1.5 h-8 bg-indigo-500 rounded-full shadow" />
              </div>
              
              {/* End Handle */}
              <div 
                className="absolute inset-y-0 -right-2 w-4 cursor-ew-resize flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors pointer-events-auto"
                onPointerDown={handleDragStart("end")}
              >
                <div className="w-1.5 h-8 bg-indigo-500 rounded-full shadow" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
