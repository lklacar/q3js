import {JsonLd} from "@/components/seo/json-ld";
import {absoluteUrl, siteConfig} from "@/lib/seo";

const guideStructuredData = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Run Your Own Q3JS Server",
    description:
        "Step-by-step guide to run your own Q3JS Quake III server with Docker, required ports, and baseq3 setup instructions.",
    inLanguage: "en-US",
    url: absoluteUrl("/guide"),
    totalTime: "PT10M",
    supply: [
        {
            "@type": "HowToSupply",
            name: "baseq3 directory with allowed game files",
        },
    ],
    tool: [
        {
            "@type": "HowToTool",
            name: "Docker",
        },
    ],
    step: [
        {
            "@type": "HowToStep",
            name: "Prepare your server directory",
            text: "Create a directory that includes a baseq3 folder containing your server game data and configs.",
        },
        {
            "@type": "HowToStep",
            name: "Run the Docker container",
            text: "Start the lukaklacar/q3js-server image with UDP 27960 and TCP 27961 exposed and mount baseq3 into /server/baseq3.",
        },
        {
            "@type": "HowToStep",
            name: "Forward required ports",
            text: "Forward UDP 27960 and port 27961 on your router to make the server reachable from outside your network.",
        },
        {
            "@type": "HowToStep",
            name: "Verify visibility in Q3JS",
            text: "Confirm your server appears on the Q3JS home page and accepts player joins.",
        },
    ],
    publisher: {
        "@type": "Organization",
        name: siteConfig.name,
        url: siteConfig.url,
    },
};

export default function GuidePage() {
    return (
        <main className="container mx-auto ">
            <JsonLd data={guideStructuredData}/>
            <div
                className="min-w-full py-20 space-y-6 [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h2]:pt-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_p]:leading-7 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border/60 [&_pre]:bg-card/60 [&_pre]:p-4 [&_ul]:list-disc [&_ul]:space-y-3 [&_ul]:pl-6"
            >

                <h1>Run Your Own Q3JS Server</h1>

                <p>
                    You can host your own Quake III Arena server for Q3JS using the official Docker image.
                    The dedicated server behaves the same as the original <code>ioq3ded</code> executable,
                    but wrapped in a convenient, ready-to-run container.
                </p>

                <h2>1. Prepare Your Directory</h2>
                <p>
                    Create or enter a directory that contains a <code>baseq3</code> folder.
                    The server must have access to this folder because that’s where all game data,
                    configs, and map files live.
                </p>


                <pre className=" whitespace-pre">
{`mkdir my-q3-server
cd my-q3-server
# make sure this exists:
ls baseq3/`}
            </pre>

                <h2>2. Run the Server</h2>
                <p>Launch your server with Docker:</p>

                <pre className=" whitespace-pre">
{`docker run \\
  -p 27961:27961 \\
  -p 27960:27960/udp \\
  -v $(pwd)/baseq3:/server/baseq3 \\
  lukaklacar/q3js-server \\
  +map q3dm17`}
            </pre>

                <p>
                    If you plan to run your own dedicated server and make it visible to players outside your local
                    network,
                    ensure that the required ports are forwarded on your router. Quake III Arena servers typically use
                    UDP <span className=" font-semibold">27960</span> for game traffic and your WebSocket-UDP proxy
                    listens on
                    port <span className=" font-semibold">27961</span>. Both must be open and forwarded to the machine
                    running
                    your server for others to see and connect to it.
                </p>


                <h2>3. How This Command Works</h2>
                <ul>
                    <li>
                        <strong>Ports:</strong>
                        <code>27960/udp</code> is the Quake game port.
                        <code>27961</code> is the WebSocket-UDP proxy port used by Q3JS.
                    </li>

                    <li>
                        <strong>Volume mount:</strong>
                        <code>-v $(pwd)/baseq3:/server/baseq3</code>
                        makes your local <code>baseq3</code> directory available inside the container.
                    </li>

                    <li>
                        <strong>Dedicated server behavior:</strong>
                        After startup, the process behaves exactly like the classic
                        <code>ioq3ded</code> server.
                        Any <code>+set</code> or <code>+map</code> parameters work the same way.
                    </li>

                    <li>
                        <strong>Map loading:</strong>
                        The example starts on <code>q3dm17</code>, but you can choose any available map.
                    </li>
                </ul>

                <h2>4. Confirming the Server Runs</h2>
                <p>
                    Once the container starts, your server will appear on the Q3JS home page
                    as long as it is configured with the correct master server settings
                    (included automatically in this Docker image).
                </p>

                <h2>5. File Requirements</h2>
                <p>
                    Only official Quake III <em>demo</em> files or community-created assets are allowed.
                    Retail files are not included and cannot be distributed.
                </p>
            </div>

        </main>
    );
}
