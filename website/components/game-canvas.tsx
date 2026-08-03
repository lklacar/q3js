"use client";

import {
  createQ3Client,
  type Q3Client,
  type Q3ClientOptions,
} from "@q3js/client";
import { useEffect, useRef } from "react";

export interface GameCanvasProps {
  options: Omit<Q3ClientOptions, "canvas">;
  className?: string;
  onClientReady?: (client: Q3Client) => void;
}

export function GameCanvas({ options, className, onClientReady }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let cancelled = false;
    let client: Q3Client | undefined;
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      if (client) {
        client.resize(bounds.width, bounds.height, scale);
      } else {
        canvas.width = Math.max(1, Math.round(bounds.width * scale));
        canvas.height = Math.max(1, Math.round(bounds.height * scale));
      }
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    void createQ3Client({ ...options, canvas })
      .then((createdClient) => {
        if (cancelled) {
          void createdClient.dispose();
          return;
        }

        client = createdClient;
        resize();
        onClientReady?.(createdClient);
      })
      .catch((error: unknown) => {
        if (!options.onError) {
          console.error("Failed to start Q3JS", error);
        }
      });

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      void client?.dispose();
    };
  }, [onClientReady, options]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label="Q3JS game"
      tabIndex={0}
      onClick={(event) => event.currentTarget.focus()}
    />
  );
}
