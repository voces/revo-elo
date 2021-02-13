import { readFile } from "fs/promises";

interface Match {
	sheep: string[];
	wolves: number[];
	time: number;
	playedOn: number;
}

const matches = (JSON.parse(
	await readFile("data/matches.json", "utf-8"),
) as Match[])
	.filter((match) => match.sheep.length === 2 && match.wolves.length === 4)
	.sort((a, b) => a.playedOn - b.playedOn);

const elos: Record<string, { rating: number; games: number } | undefined> = {};

const avg = (a: number, b: number, _: number, arr: number[]) =>
	a + b / arr.length;

const K = 32;
const TRAILING_AVERAGE_ROUNDS = 25;

// Seed with global average
let trailingAverage = 86.47;

for (const match of matches) {
	const sheepElo = match.sheep
		.map((p) => elos[p]?.rating ?? 1000)
		.reduce(avg, 0);
	const wolfElo = match.wolves
		.map((p) => elos[p]?.rating ?? 1000)
		.reduce(avg, 0);

	const sheepRating = Math.pow(10, sheepElo / 400);
	const wolfRating = Math.pow(10, wolfElo / 400);

	const expectedSheepWin = sheepRating / (sheepRating + wolfRating);
	const expectedWolfWin = 1 - expectedSheepWin;

	const sheepWon = match.time > trailingAverage ? 1 : 0;

	match.sheep.forEach(
		(p) =>
			(elos[p] = {
				rating:
					(elos[p]?.rating ?? 1000) +
					K * (sheepWon ? 1 - expectedSheepWin : -expectedSheepWin),
				games: (elos[p]?.games ?? 0) + 1,
			}),
	);
	match.wolves.forEach(
		(p) =>
			(elos[p] = {
				rating:
					(elos[p]?.rating ?? 1000) +
					(K / 2) *
						(sheepWon ? -expectedWolfWin : 1 - expectedWolfWin),
				games: (elos[p]?.games ?? 0) + 1,
			}),
	);

	trailingAverage =
		trailingAverage *
			((TRAILING_AVERAGE_ROUNDS - 1) / TRAILING_AVERAGE_ROUNDS) +
		match.time * (1 / TRAILING_AVERAGE_ROUNDS);
	console.log(trailingAverage);
}

Object.entries(elos)
	.sort((a, b) => b[1]!.rating - a[1]!.rating)
	// .filter((p) => p[1]!.games >= 50)
	.forEach((p) => console.log(p));

console.log(
	Object.values(elos)
		.map((r) => r!.rating)
		.reduce(avg, 0),
);

console.log(matches.length);
