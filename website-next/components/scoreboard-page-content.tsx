import ScoreboardPage from "@/views/scoreboard-page";
import {getInitialKillDistributions, getInitialScoreboards} from "@/lib/initial-data";
import {SCOREBOARD_PERIODS} from "@/lib/scoreboard";

export async function ScoreboardPageContent() {
    const [killDistributions, scoreboards] = await Promise.all([
        getInitialKillDistributions(SCOREBOARD_PERIODS),
        getInitialScoreboards(SCOREBOARD_PERIODS),
    ]);

    return <ScoreboardPage killDistributions={killDistributions} scoreboards={scoreboards}/>;
}
