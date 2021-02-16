import { readFile } from "fs/promises";

import { processReplay } from "./processReplay.js";
import { avg, data, ModeData, PlayerData, Season } from "./processRound.js";
import { ListReplay } from "./types.js";

const replays = ((Object.values(
	JSON.parse(await readFile("data/replays.json", "utf-8")),
) as any) as ListReplay[]).sort((a, b) => a.playedOn - b.playedOn);

// console.log(replays);
// console.log(replays.map((r) => new Date(r.playedOn * 1000)).slice(-100));
for (const replay of replays.slice(0, 1)) await processReplay(replay);

// Object.entries(data)
// 	.sort((a, b) => a[0].localeCompare(b[0]))
// 	.forEach(
// 		([mode, { seasons }]: [string, ModeData]) => {
// 			console.log("\n\n" + "=".repeat(20) + mode + "=".repeat(20));
// 			Object.entries(seasons).forEach(([season, data]) => {
// 				if (!data) return;
// 				const { players, matches } = data;
// 				console.log("\n" + "=".repeat(10) + season + "=".repeat(10));
// 				Object.entries(players)
// 					.sort((a, b) => b[1]!.rating - a[1]!.rating)
// 					// .filter((p) => p[1]!.matches >= 5)
// 					.forEach(([player, data]) => {
// 						if (data)
// 							console.log([
// 								player,
// 								{
// 									rating: Math.round(data.rating),
// 									matches: data.matches,
// 								},
// 							]);
// 					});
// 				console.log(
// 					"average elo:",
// 					Object.values(players)
// 						.map((r) => r!.rating)
// 						.reduce(avg, 0),
// 				);
// 				console.log("matches:", matches);
// 			});
// 		},

// 		// })(["2v4", data["2v4"]]);
// 	);

// const TIMELINES = [
// 	// "bahlamsa#1599",
// 	// "DeadlySheep#11500",
// 	// "Demon#15650",
// 	// "eeNZ#1553",
// 	// "Jefferson928#1632",
// 	// "Katama#1324",
// 	"Nmcdo#1759",
// 	// "PuffyBoob#1480",
// 	// "verit#11278",
// 	// "XXXandBEER#1352",
// ];

// const header = ["date", ...TIMELINES];

// const seasons2v4 = (Object.values(data["2v4"].seasons) as any) as Season[];

// const formatDate = (d: Date) =>
// 	`${d.getUTCFullYear()}/${(d.getUTCMonth() + 1)
// 		.toString()
// 		.padStart(2, "0")}/${d
// 		.getUTCDate()
// 		.toString()
// 		.padStart(2, "0")} ${d
// 		.getUTCHours()
// 		.toString()
// 		.padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")}`;

// const timelineBodyData = Object.fromEntries(
// 	TIMELINES.map((p) => [
// 		p,
// 		Object.fromEntries(
// 			seasons2v4
// 				.map(
// 					(s) =>
// 						s.players[p]?.timeline.map(([d, v], i) => [
// 							formatDate(new Date(d * 1000)) +
// 								":00." +
// 								i.toString().padStart(4, "0"),
// 							Math.round(v),
// 						]),
// 					// .filter(
// 					// 	(v, i, arr) =>
// 					// 		i === arr.length - 1 || v[0] !== arr[i + 1][0],
// 					// ),
// 				)
// 				.filter((v): v is [number, number][] => !!v)
// 				.flat(),
// 		),
// 	]),
// );

// // console.log(timelineBodyData);

// const dates = Array.from(
// 	new Set(
// 		Object.values(timelineBodyData)
// 			.map((v) => Object.keys(v))
// 			.flat(),
// 	),
// ).sort((a, b) => a.localeCompare(b));

// // console.log(dates);

// const body = dates.map((d) => [
// 	d,
// 	...TIMELINES.map((p) => timelineBodyData[p][d] ?? ""),
// ]);

// console.log([header, ...body].map((r) => r.join("\t")).join("\n"));
