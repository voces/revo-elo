/* eslint-disable no-console */
import { writeFile } from "fs/promises";
import fetch from "node-fetch";

const fetchPage = (page: number) =>
	fetch(
		`https://api.wc3stats.com/replays&chat=1&search=sheep%20tag&page=${page}&limit=100&sort=playedOn&order=desc`,
	).then((r) => r.json());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const revos: any[] = [];

const iterate = async (pageNumber: number) => {
	const page = await fetchPage(pageNumber);
	const games = page.body;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	games.forEach((game: any) => {
		const map = (game.map ?? "").replace(/ /g, "").toLowerCase();
		const variant = (game.variant ?? "").replace(/ /g, "").toLowerCase();
		const isRevo =
			map.includes("revolution") || variant.includes("revolution");
		if (isRevo && game.processed && !game.isVoid) revos.push(game);
	});
	delete page.body;
	console.log("Finished", page.pagination.current);
	if (page.pagination.next > page.pagination.current) {
		console.log("Fetching", page.pagination.next);
		await iterate(pageNumber + 1);
	} else console.log("Done");
};

await iterate(1);
writeFile(
	"data/game.json",
	JSON.stringify(
		revos.map((g) => ({ id: g.id })),
		null,
		2,
	),
);
