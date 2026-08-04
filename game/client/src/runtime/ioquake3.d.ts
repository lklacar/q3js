import type { Q3FileSystem } from "../types.js";

export interface Q3EngineModule {
  FS: Q3FileSystem;
  IDBFS?: unknown;
  callMain(arguments_: readonly string[]): number | void;
  _Q3JS_MobileInitBindings?: () => void;
  _Q3JS_MobileJoystickAxis?: (axis: number, value: number) => void;
  _Q3JS_MobileKeyEvent?: (key: number, down: number) => void;
  _Q3JS_MobileMouseMove?: (deltaX: number, deltaY: number) => void;
  _Q3JS_RequestQuit?: () => void;
  _Q3JS_Resize?: (width: number, height: number) => void;
}

export interface Q3EngineModuleOptions {
  canvas: HTMLCanvasElement;
  noInitialRun: boolean;
  elementPointerLock?: boolean;
  webtransport?: {
    url: string;
    serverCertificateHashes?: readonly {
      algorithm: "sha-256";
      value: BufferSource;
    }[];
    maxDatagramBytes?: number;
  };
  locateFile?: (path: string, prefix: string) => string;
  print?: (message: string) => void;
  printErr?: (message: string) => void;
  onAbort?: (reason: unknown) => void;
}

export default function createIoquake3Module(
  options: Q3EngineModuleOptions,
): Promise<Q3EngineModule>;
