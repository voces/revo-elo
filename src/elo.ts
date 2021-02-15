import { readFile } from "fs/promises";

// import { processReplay, temp } from "./processReplay.js";
import { processReplay } from "./processReplay.js";
import { avg, data, ModeData } from "./processRound.js";
import { ListReplay } from "./types.js";

const replays = ((Object.values(
	JSON.parse(await readFile("data/replays.json", "utf-8")),
) as any) as ListReplay[]).sort((a, b) => a.playedOn - b.playedOn);

// console.log(replays);
// console.log(replays.map((r) => new Date(r.playedOn * 1000)).slice(-100));

// if (!temp.processedARound)
for (const replay of replays) await processReplay(replay);

Object.entries(data)
	.sort((a, b) => a[0].localeCompare(b[0]))
	.forEach(([mode, { matches, players }]: [string, ModeData]) => {
		console.log("=".repeat(20) + mode + "=".repeat(20));
		Object.entries(players)
			.sort((a, b) => b[1]!.rating - a[1]!.rating)
			// .filter((p) => p[1]!.matches >= 5)
			.forEach((p) => console.log(p));
		console.log(
			"average elo:",
			Object.values(players)
				.map((r) => r!.rating)
				.reduce(avg, 0),
		);
		console.log("matches:", matches);
		// })(["2v4", data["2v4"]]);
	});
