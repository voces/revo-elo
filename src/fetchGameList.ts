import { readFile, writeFile } from "fs/promises";

import { fetchPage } from "./fetch.js";
import { ListReplay } from "./types.js";

let replays: Record<string, ListReplay>;
try {
	replays = JSON.parse(await readFile("data/replays.json", "utf-8"));
	console.log("had", Object.keys(replays).length);
} catch (err) {
	replays = {};
}

const iterate = async (pageNumber: number) => {
	console.log("Fetching", pageNumber);
	const page = await fetchPage(pageNumber);
	const games = page.body;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	games.forEach((game: any) => {
		const map = (game.map ?? "").replace(/ /g, "").toLowerCase();
		const variant = (game.variant ?? "").replace(/ /g, "").toLowerCase();
		const isRevo =
			map.includes("revolution") || variant.includes("revolution");
		if (isRevo && game.processed && !game.isVoid) replays[game.id] = game;
	});
	if (page.pagination.next > page.pagination.current)
		await iterate(pageNumber + 1);
	else console.log("Done");
};

await iterate(38);
writeFile("data/replays.json", JSON.stringify(replays, null, 2));

console.log("have", Object.keys(replays).length);
