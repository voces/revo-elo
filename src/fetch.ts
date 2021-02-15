import { readFile, writeFile } from "fs/promises";
import fetch from "node-fetch";

import { ListReplay, Replay } from "./types";

interface List<T> {
	body: T[];
	code: number;
	pagination: {
		before: number;
		current: number;
		first: number;
		last: number;
		next: number;
		perPage: number;
		totalItems: number;
		totalPages: number;
	};
	queryTime: number;
	status: string;
}

export const fetchPage = (page: number): Promise<List<ListReplay>> =>
	fetch(
		`https://api.wc3stats.com/replays&chat=1&search=sheep%20tag&page=${page}&limit=100&sort=playedOn&order=asc`,
	).then((r) => r.json());

// let replays: ListReplay[] = [];
// let storeCache: NodeJS.Timeout;
// let lastStored = Date.now();
// readFile("data/replays.json", "utf-8").then((r) => (replays = JSON.parse(r)));

// const doStoreCache = async () => {
// 	console.log("storing replays cache");
// 	lastStored = Date.now();
// 	await writeFile("data/replays.json", JSON.stringify(replays, null, 2));
// };

export const fetchReplay = async (replayId: number): Promise<Replay> => {
	try {
		return JSON.parse(
			await readFile(`data/replays/${replayId}.json`, "utf-8"),
		);
	} catch (err) {
		console.log("cache miss, fetching", replayId);

		const replay = await fetch(
			`https://api.wc3stats.com/replays/${replayId}`,
		)
			.then((r) => r.json())
			.then((r) => r.body);

		await writeFile(
			`data/replays/${replayId}.json`,
			JSON.stringify(replay, null, 2),
		);

		return replay;
	}
};
