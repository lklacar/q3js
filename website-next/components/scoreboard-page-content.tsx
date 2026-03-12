import ScoreboardPage from "@/views/scoreboard-page";
import {getInitialKillDistribution, getInitialScoreboard} from "@/lib/initial-data";

export async function ScoreboardPageContent() {
    const initialScoreboard = await getInitialScoreboard();
    const initialKillDistribution = await getInitialKillDistribution();
    return <ScoreboardPage initialScoreboard={initialScoreboard} initialKillDistribution={initialKillDistribution}/>;
}
