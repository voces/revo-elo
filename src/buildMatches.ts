import { readFile, writeFile } from "fs/promises";
import fetch from "node-fetch";

import { deduceTeams } from "./deduceTeams.js";

const games = JSON.parse(await readFile("data/games.json", "utf-8"));

const fetchGame = (gameId: number) =>
	fetch(`https://api.wc3stats.com/replays/${gameId}`).then((r) => r.json());

interface Match {
	sheep: string[];
	wolves: [];
	time: number;
	playedOn: number;
}

const allMatches: Match[] = JSON.parse(
	await readFile("data/matches.json", "utf-8").catch(() => "[]"),
);

const knownBaddies = [
	87116, // has 01341020v01341020, and I don't know how to void this
	86881, // same as above
];

for (const game of games) {
	if (game.processed) {
		console.log("Skipping already processed game", game.id);
		continue;
	}

	if (knownBaddies.includes(game.id)) {
		console.log("Skipping baddy", game.id);
		continue;
	}

	console.log("Processing", game.id);

	const data = await fetchGame(game.id);
	const players = data.body.data.game.players;

	if (players.length === 1) {
		console.log("Skipping game with one player", game.id);
		game.processed = true;
		await writeFile("data/games.json", JSON.stringify(games, null, 2));
		continue;
	}

	const recordKeeper = players.find(
		(p: Record<string, any>) => p.variables?.setup,
	);
	if (!recordKeeper) {
		console.log("Skipping game with no data", game.id);
		game.processed = true;
		await writeFile("data/games.json", JSON.stringify(games, null, 2));
		continue;
	}

	const playerTimes: {
		times: number[];
		cursor: number;
		slot: number;
		name: string;
	}[] = [];
	players.forEach((p: Record<string, any>) => {
		playerTimes[p.slot] = {
			times: (p.variables?.roundTimes ?? "")
				.split("|")
				.map((round: string) => round.trim())
				.filter(Boolean)
				.map((round: string) => parseFloat(round)),
			slot: p.slot,
			cursor: 0,
			name: p.name,
		};
	});
	// console.log(playerTimes);

	const rawSetup = recordKeeper.variables.setup;
	if (rawSetup.length === 218)
		console.log("Max w3mmd value setup encountered; skipping last round");
	const setup =
		rawSetup.length === 218
			? rawSetup.slice(0, rawSetup.lastIndexOf(" "))
			: rawSetup;

	const playerIds = players.map((p: Record<string, any>) => p.slot);

	const teams: [number[], number[]][] = setup
		.split(" ")
		.map((round: string) => deduceTeams(playerIds, round.toLowerCase()))
		.filter(Boolean);
	// console.log(teams);

	const matches = teams
		.map(([sheep, wolves], matchId) => {
			let time: number | undefined;
			let inconsistentTime = false;
			sheep.forEach((s: number, index: number) => {
				const playerTime =
					playerTimes[s].times[playerTimes[s].cursor++];
				if (index === 0) time = playerTime;
				else if (playerTime !== time) {
					inconsistentTime = true;
					console.log("inconsistent time found", {
						time,
						playerTime,
						index,
						sheep,
						wolves,
						matchId,
					});
				}
			});

			if (inconsistentTime) {
				console.warn("Skipping match with multiple times", matchId);
				return;
			}

			if (time === undefined)
				// console.warn("Skipping match that is missing a time", matchId);
				return;

			return {
				sheep: sheep.map((slot) => playerTimes[slot].name),
				wolves: wolves.map((slot) => playerTimes[slot].name),
				time,
				playedOn: data.body.playedOn + matchId / 1000,
			};
		})
		.filter((v): v is Match => !!v);

	console.log("adding", matches.length, "matches");
	allMatches.push(...matches);

	writeFile("data/matches.json", JSON.stringify(allMatches, null, 2));
	game.processed = true;
	await writeFile("data/games.json", JSON.stringify(games, null, 2));
}

// writeFile("data/matches.json", JSON.stringify(allMatches, null, 2));
