"use client";

import {
  createQ3Client,
  type Q3Client,
  type Q3ClientOptions,
} from "@q3js/client";
import { useEffect, useRef, useState } from "react";

export interface GameCanvasProps {
  options: Omit<Q3ClientOptions, "canvas">;
  className?: string;
  onClientReady?: (client: Q3Client) => void;
  onPointerLockChange?: (captured: boolean) => void;
}

export function GameCanvas({
  options,
  className,
  onClientReady,
  onPointerLockChange,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let cancelled = false;
    let client: Q3Client | undefined;
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      if (client) {
        client.resize(bounds.width, bounds.height);
      } else {
        canvas.width = Math.max(1, Math.round(bounds.width));
        canvas.height = Math.max(1, Math.round(bounds.height));
      }
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const sizeGuard = window.setInterval(resize, 250);
    window.addEventListener("resize", resize);
    document.addEventListener("fullscreenchange", resize);
    resize();

    void createQ3Client({ ...options, canvas })
      .then((createdClient) => {
        if (cancelled) {
          void createdClient.dispose();
          return;
        }

        client = createdClient;
        resize();
        setClientReady(true);
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
      window.clearInterval(sizeGuard);
      window.removeEventListener("resize", resize);
      document.removeEventListener("fullscreenchange", resize);
      void client?.dispose();
    };
  }, [onClientReady, options]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (
      !canvas
      || !clientReady
      || typeof canvas.requestPointerLock !== "function"
    ) {
      return;
    }

    const originalExitPointerLock = document.exitPointerLock;
    const updatePointerLock = () => {
      onPointerLockChange?.(document.pointerLockElement === canvas);
    };
    // Match the original client: Quake can request a release during focus
    // transitions, so retain capture until the browser handles Escape itself.
    if (typeof originalExitPointerLock === "function") {
      document.exitPointerLock = () => undefined;
    }
    document.addEventListener("pointerlockchange", updatePointerLock);
    updatePointerLock();

    return () => {
      document.removeEventListener("pointerlockchange", updatePointerLock);
      onPointerLockChange?.(false);

      if (typeof originalExitPointerLock === "function") {
        document.exitPointerLock = originalExitPointerLock;
        if (document.pointerLockElement === canvas) {
          originalExitPointerLock.call(document);
        }
      }
    };
  }, [clientReady, onPointerLockChange]);

  return (
    <canvas
      id="canvas"
      ref={canvasRef}
      className={className}
      aria-label="Q3JS game"
      tabIndex={0}
      onClick={(event) => event.currentTarget.focus()}
      onContextMenu={(event) => event.preventDefault()}
    />
  );
}
