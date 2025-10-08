'use client';

import { useState, useRef, useEffect } from 'react';

interface VideoPlayerProps {
  videoUrl: string;
}

export default function VideoPlayer({ videoUrl }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, []);

  const handleVideoError = () => {
    setHasError(true);
    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVideoClick = () => {
    handlePlayPause();
    setShowControls(true);
    // Hide controls after 3 seconds if playing
    if (!isPlaying) {
      // Clear existing timeout before setting new one
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
      hideControlsTimeoutRef.current = setTimeout(() => {
        if (videoRef.current && !videoRef.current.paused) {
          setShowControls(false);
        }
      }, 3000);
    }
  };

  if (hasError) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center">
        <div className="text-center p-4">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-white text-sm">Unable to load video</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-cover"
        loop={false}
        playsInline
        onClick={handleVideoClick}
        onEnded={() => setIsPlaying(false)}
        onError={handleVideoError}
      />

      {/* Play/Pause Button Overlay */}
      <button
        onClick={handlePlayPause}
        className={`absolute inset-0 flex items-center justify-center transition-all ${
          isPlaying && !showControls ? 'opacity-0' : 'opacity-100'
        } ${!isPlaying ? 'bg-black/30' : 'bg-transparent'} hover:bg-black/20`}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => {
          if (isPlaying) {
            // Clear existing timeout before setting new one
            if (hideControlsTimeoutRef.current) {
              clearTimeout(hideControlsTimeoutRef.current);
            }
            hideControlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2000);
          }
        }}
      >
        {!isPlaying && (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-korus-primary/80 to-korus-secondary/80 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_20px_rgba(67,233,123,0.5)]">
            <svg
              className="w-8 h-8 text-white ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        )}
      </button>

      {/* Video Controls Bar */}
      {showControls && isPlaying && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePlayPause}
              className="text-white hover:text-korus-primary transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                {isPlaying ? (
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                ) : (
                  <path d="M8 5v14l11-7z"/>
                )}
              </svg>
            </button>

            <div className="flex-1 h-1 bg-gray-600 rounded-full overflow-hidden">
              <div className="h-full bg-korus-primary rounded-full" style={{ width: '0%' }}></div>
            </div>

            <button className="text-white hover:text-korus-primary transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            </button>

            <button className="text-white hover:text-korus-primary transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
