import {getWsProtocol} from "@/lib/utils.ts";
import {
    ensureMounts,
    estimateTotalBytes,
    fetchIntoUint8,
    PERSIST_CONFIG_DIR,
    PERSIST_DATA_DIR,
    PERSIST_STATE_DIR,
    clearQ3JSDownloadedVmPaks,
    type Prog,
    syncfs
} from "@/lib/fs.ts";
import {registerIOQ3Runtime, type IOQ3RuntimeModule} from "@/lib/ioquake3-runtime";
import {getRequesterCountry} from "@/lib/client";

type Params = {
    host: string;
    proxyPort: number;
    name: string;
    rconPassword?: string;
    rafUpdate: (prog: Prog) => void;
    fsGame: string;
    mobileMode?: boolean;
}

type FileEntry = {
    src: string;
    dst: string;
    source?: "server";
    alwaysFetch?: boolean;
};

type CheckedFileEntry = {
    file: FileEntry;
    url: URL;
    expectedBytes?: number;
    pending: boolean;
};

const MOBILE_RENDER_SCALE = 2;

const config = {
    baseq3: {
        files: [
            {src: "baseq3/q3key", dst: "/baseq3"},
            {src: "baseq3/pak0.pk3", dst: "/baseq3"},
            {src: "baseq3/pak1.pk3", dst: "/baseq3"},
            {src: "baseq3/pak2.pk3", dst: "/baseq3"},
            {src: "baseq3/pak3.pk3", dst: "/baseq3"},
            {src: "baseq3/pak4.pk3", dst: "/baseq3"},
            {src: "baseq3/pak5.pk3", dst: "/baseq3"},
            {src: "baseq3/pak6.pk3", dst: "/baseq3"},
            {src: "baseq3/pak7.pk3", dst: "/baseq3"},
            {src: "baseq3/pak8.pk3", dst: "/baseq3"},
        ],
    },
    q3js: {
        files: [
            {
                src: "q3js/zz-q3js-vm-v1.pk3",
                dst: "/q3js",
                source: "server",
                alwaysFetch: true,
            },
        ],
    },
    cpma: {
        files: [
            {src: "cpma/missing.pk3", dst: "/cpma"},

            {src: "cpma/cfg-maps/mapmodes.txt", dst: "/cpma/cfg-maps"},

            // core pak + maps (already had)
            {src: "cpma/z-cpma-pak153.pk3", dst: "/cpma"},

            {src: "cpma/map_cpm10.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm11a.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm11.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm12.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm13.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm14.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm15.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm16.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm17.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm18.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm18r.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm19.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm1a.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm20.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm21.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm22.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm23.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm24.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm25.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm26_cpmctf4.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm27.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm28.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm29.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm2.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm3a.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm3.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm4a.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm4.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm5.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm6.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm7.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm8.pk3", dst: "/cpma"},
            {src: "cpma/map_cpm9.pk3", dst: "/cpma"},
            {src: "cpma/map_cpma3.pk3", dst: "/cpma"},
            {src: "cpma/map_cpmctf1.pk3", dst: "/cpma"},
            {src: "cpma/map_cpmctf2.pk3", dst: "/cpma"},
            {src: "cpma/map_cpmctf3.pk3", dst: "/cpma"},
            {src: "cpma/map_cpmctf5.pk3", dst: "/cpma"},

            // misc root files
            {src: "cpma/changelog.txt", dst: "/cpma"},
            {src: "cpma/description.txt", dst: "/cpma"},
            {src: "cpma/readme.txt", dst: "/cpma"},
            {src: "cpma/openlibm_license.md", dst: "/cpma"},
            {src: "cpma/cpma.ico", dst: "/cpma"},
            {src: "cpma/cpma-trans.ico", dst: "/cpma"},

            // classes
            {src: "cpma/classes/fighter.cfg", dst: "/cpma/classes"},
            {src: "cpma/classes/scout.cfg", dst: "/cpma/classes"},
            {src: "cpma/classes/sniper.cfg", dst: "/cpma/classes"},
            {src: "cpma/classes/tank.cfg", dst: "/cpma/classes"},

            // hud
            {src: "cpma/hud/arqon.cfg", dst: "/cpma/hud"},
            {src: "cpma/hud/hud1.cfg", dst: "/cpma/hud"},
            {src: "cpma/hud/hud2.cfg", dst: "/cpma/hud"},
            {src: "cpma/hud/hud3.cfg", dst: "/cpma/hud"},
            {src: "cpma/hud/hud4.cfg", dst: "/cpma/hud"},
            {src: "cpma/hud/hud5.cfg", dst: "/cpma/hud"},
            {src: "cpma/hud/hud6.cfg", dst: "/cpma/hud"},
            {src: "cpma/hud/hud7.cfg", dst: "/cpma/hud"},

            // stats
            {src: "cpma/stats/basics/arrdown.gif", dst: "/cpma/stats/basics"},
            {src: "cpma/stats/basics/arrup.gif", dst: "/cpma/stats/basics"},
            {src: "cpma/stats/basics/stats141.css", dst: "/cpma/stats/basics"},
            {src: "cpma/stats/basics/stats141.xsl", dst: "/cpma/stats/basics"},

            // viewcam
            {src: "cpma/viewcam/cpm3a.cfg", dst: "/cpma/viewcam"},
            {src: "cpma/viewcam/cpm3.cfg", dst: "/cpma/viewcam"},
            {src: "cpma/viewcam/q3dm12.cfg", dst: "/cpma/viewcam"},
        ],
    }

} as const satisfies Record<string, { files: readonly FileEntry[] }>;

type SupportedGameDir = keyof typeof config;
type RuntimeModule = IOQ3RuntimeModule & {
    addRunDependency: (id: string) => void;
    removeRunDependency: (id: string) => void;
};

function isSupportedGameDir(gameDir: string): gameDir is SupportedGameDir {
    return gameDir in config;
}

async function getContentLength(url: URL): Promise<number | undefined> {
    try {
        const response = await fetch(url, {method: "HEAD", cache: "no-store"});
        const contentLength = response.headers.get("content-length");

        if (!response.ok || !contentLength) {
            return undefined;
        }

        const size = Number.parseInt(contentLength, 10);
        return Number.isFinite(size) && size >= 0 ? size : undefined;
    } catch {
        return undefined;
    }
}

async function checkFileEntry(
    module: RuntimeModule,
    file: FileEntry,
    siteAssetURL: URL,
    serverAssetURL: URL
): Promise<CheckedFileEntry> {
    const assetName = file.src.split("/").pop() as string;
    const dstPath = `${file.dst}/${assetName}`;
    let url = new URL(file.src, file.source === "server" ? serverAssetURL : siteAssetURL);
    let expectedBytes = await getContentLength(url);

    // Keep older servers joinable while deployments roll forward. New server
    // images always win when they expose their build-matched VM pak.
    if (file.source === "server" && expectedBytes === undefined) {
        const fallbackURL = new URL(file.src, siteAssetURL);
        const fallbackBytes = await getContentLength(fallbackURL);
        if (fallbackBytes !== undefined) {
            url = fallbackURL;
            expectedBytes = fallbackBytes;
        }
    }

    if (file.alwaysFetch) {
        return {file, url, expectedBytes, pending: true};
    }

    try {
        const st = module.FS.stat(dstPath);
        const existingBytes = st?.size ?? 0;
        return {
            file,
            url,
            expectedBytes,
            pending: existingBytes <= 0 || (expectedBytes !== undefined && existingBytes !== expectedBytes),
        };
    } catch {
        return {file, url, expectedBytes, pending: true};
    }
}

function normalizeCountry(country: string): string | undefined {
    const sanitized = country.trim().replace(/[^A-Za-z0-9_-]/g, "").slice(0, 16);

    if (sanitized.length === 0) {
        return undefined;
    }

    return sanitized.length === 2 ? sanitized.toUpperCase() : sanitized;
}

async function fetchCountry(): Promise<string | undefined> {
    try {
        const {data} = await getRequesterCountry({throwOnError: true});
        return data.countryCode ? normalizeCountry(data.countryCode) : undefined;
    } catch {
        return undefined;
    }
}

export default async function startGame({host, proxyPort, name, rconPassword, rafUpdate, fsGame, mobileMode = false}: Params) {
    const countryPromise = fetchCountry();
    const importIoquake3 = new Function("return import('/ioquake3.js')");
    const ioquake3Module = await (importIoquake3() as Promise<{ default: (moduleArg?: unknown) => unknown }>);
    const ioquake3 = ioquake3Module.default;
    const canvas = document.getElementById("canvas") as HTMLCanvasElement | null;

    if (!canvas) {
        throw new Error("Game canvas not found");
    }

    const initialViewport = canvas.getBoundingClientRect();
    const initialWidth = Math.max(1, Math.round(initialViewport.width || window.innerWidth));
    const initialHeight = Math.max(1, Math.round(initialViewport.height || window.innerHeight));
    const initialRenderWidth = mobileMode ? initialWidth * MOBILE_RENDER_SCALE : initialWidth;
    const initialRenderHeight = mobileMode ? initialHeight * MOBILE_RENDER_SCALE : initialHeight;

    canvas.width = initialRenderWidth;
    canvas.height = initialRenderHeight;

    const com_basegame = fsGame;
    const fs_basegame = fsGame;
    const fs_game = fsGame;

    let generatedArguments = `
          +set sv_pure 0
          +set net_enabled 1
          +set r_mode -2
          +set r_fullscreen 0
          +set cl_allowDownload 1
          +set con_scale 2
          +set fs_game "${fs_game}"
          +set fs_homeconfigpath "${PERSIST_CONFIG_DIR}"
          +set fs_homedatapath "${PERSIST_DATA_DIR}"
          +set fs_homestatepath "${PERSIST_STATE_DIR}"
          +set com_introplayed 1
          +set ui_cdkeychecked 1
          +set cl_firststart 0
        `;

    if (mobileMode) {
        generatedArguments += `
          +set r_mode -1
          +set r_customwidth ${initialRenderWidth}
          +set r_customheight ${initialRenderHeight}
          +set in_nograb 1
          +set in_joystickUseAnalog 1
          +set j_forward -1
          +set j_side 1
        `;
    }

    generatedArguments += ` +set name "${name.replace(/"/g, "'")}" `;
    if (rconPassword) {
        generatedArguments += ` +setu rconPassword ${rconPassword.replace(/[\s"\\;]/g, "")} `;
    }
    const country = await countryPromise;
    if (country) {
        generatedArguments += ` +setu country ${country} `;
    }
    generatedArguments += ` +connect ${host}:${proxyPort} `;

    if (name === "^1L^2K") {
        generatedArguments += ` +set cg_autoswitch "0" +bind 3 "weapon 7" +bind e "+zoom" `;
    }

    const siteAssetURL = new URL(location.origin + location.pathname);
    const serverAssetURL = new URL(`${location.protocol}//${host}:${proxyPort}/`);

    const runtimePromise = ioquake3({
        websocket: {
            url: `${getWsProtocol()}//${host}:${proxyPort}`,
            subprotocol: "binary"
        },
        canvas,
        arguments: generatedArguments.trim().split(/\s+/),
        onRuntimeInitialized: () => {
            rafUpdate({received: 0, total: 0, pct: 100, current: "ready", stage: "ready"});
        },
        locateFile: (path: string) => {
            if (path.endsWith(".wasm")) return "/ioquake3.wasm";
        },
        preRun: [
            async (module: RuntimeModule) => {
                module.addRunDependency("setup-ioq3-filesystem");
                try {
                    rafUpdate({
                        received: 0,
                        total: 0,
                        pct: 0,
                        current: "Preparing local storage",
                        stage: "initializing"
                    });
                    const mountDirs = Array.from(new Set([com_basegame, fs_basegame, fs_game, "baseq3"]));
                    const {persist} = await ensureMounts(module, {assetGameDirs: mountDirs});
                    clearQ3JSDownloadedVmPaks(module);
                    const configuredGameDirs = mountDirs.filter(isSupportedGameDir);
                    const allFileEntries = configuredGameDirs.flatMap<FileEntry>((g) => config[g].files);
                    const uniqueFileEntries = Array.from(
                        new Map(
                            allFileEntries.map((f: FileEntry) => {
                                const assetName = f.src.split("/").pop() as string;
                                const dstPath = `${f.dst}/${assetName}`;
                                return [dstPath, f] as const;
                            })
                        ).values()
                    );

                    const checkedEntries = await Promise.all(
                        uniqueFileEntries.map((f: FileEntry) =>
                            checkFileEntry(module, f, siteAssetURL, serverAssetURL)
                        )
                    );
                    const pendingEntries = checkedEntries.filter((entry) => entry.pending);
                    const pendingUrls = pendingEntries.map((entry) => entry.url);
                    const knownTotalBytes = pendingEntries.reduce((sum, entry) => sum + (entry.expectedBytes ?? 0), 0);
                    const totalBytes = knownTotalBytes || await estimateTotalBytes(pendingUrls);
                    let receivedBytes = 0;
                    const downloadStart = Date.now();

                    for (let i = 0; i < pendingEntries.length; i++) {
                        const {file: f, url} = pendingEntries[i];
                        const name = f.src.split("/").pop() as string;
                        const dstPath = `${f.dst}/${name}`;

                        rafUpdate({
                            received: receivedBytes,
                            total: totalBytes,
                            pct: totalBytes ? Math.floor((receivedBytes / totalBytes) * 100) : 0,
                            current: f.src,
                            stage: "downloading"
                        });

                        const data = await fetchIntoUint8(url, (n) => {
                            receivedBytes += n;
                            const pct = totalBytes ? Math.min(100, Math.floor((receivedBytes / totalBytes) * 100)) : 0;
                            const elapsedSeconds = Math.max((Date.now() - downloadStart) / 1000, 0.001);
                            const bytesPerSecond = receivedBytes / elapsedSeconds;
                            const remainingBytes = Math.max(totalBytes - receivedBytes, 0);
                            const etaSeconds = bytesPerSecond > 0 ? Math.ceil(remainingBytes / bytesPerSecond) : undefined;
                            rafUpdate({
                                received: receivedBytes,
                                total: totalBytes,
                                pct,
                                current: f.src,
                                stage: "downloading",
                                etaSeconds
                            });
                        });

                        module.FS.mkdirTree(f.dst);
                        module.FS.writeFile(dstPath, data);
                    }

                    if (persist) {
                        await syncfs(module, false);
                    }
                    rafUpdate({
                        received: totalBytes,
                        total: totalBytes,
                        pct: 100,
                        current: "Launching engine",
                        stage: "launching"
                    });
                } finally {
                    module.removeRunDependency("setup-ioq3-filesystem");
                }
            },
        ],
    }) as Promise<RuntimeModule>;

    registerIOQ3Runtime(runtimePromise);
}
