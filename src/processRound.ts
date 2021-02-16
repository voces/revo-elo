import { LOG } from "./processReplay.js";
import { query } from "./sql.js";
import { Round } from "./types";

export interface PlayerData {
	rating: number;
	matches: number;
	timeline: [number, number][];
}

export interface Season {
	players: Record<string, PlayerData | undefined>;
	matches: number;
}

export interface ModeData {
	seasons: Record<string, Season | undefined>;
	trailingMatchTimes: number[];
}

type Data = Record<string, ModeData>;

const TRAILING_MATCH_TIMES_LENGTH = 99;

const emptyModeData = (): ModeData => ({
	seasons: {},
	trailingMatchTimes: [],
});

const emptySeason = (): Season => ({
	players: {},
	matches: 0,
});

const getSeason = (unix: number) => {
	const d = new Date(unix * 1000);
	const q = Math.floor(d.getMonth() / 3) + 1;
	const y = d.getFullYear();
	return `${y}Q${q}`;
};

export const data: Data = {};
const queryData = async (
	mode: string,
	sheep: string[],
	wolves: string[],
	playedOn: number,
): Promise<{
	players: Record<string, { rating: number; matches: number }>;
	trailingMatchTimes: number[];
}> => {
	if (mode === "team") {
		const mode = `${sheep.length}v${wolves.length}`;
		const sheepModeData = await queryData(
			`${mode}-sheep`,
			sheep,
			[],
			playedOn,
		);
		const wolfModeData = await queryData(
			`${mode}-wolf`,
			[],
			wolves,
			playedOn,
		);
		const modeData = await queryData(mode, [], [], playedOn);

		return {
			players: { ...sheepModeData.players, ...wolfModeData.players },
			trailingMatchTimes: [...modeData.trailingMatchTimes],
		};
	}

	const modeData = data[mode] ?? (data[mode] = emptyModeData());
	const season = getSeason(playedOn);
	const seasonData =
		modeData.seasons[season] ?? (modeData.seasons[season] = emptySeason());
	return {
		players: Object.fromEntries(
			[...sheep, ...wolves].map((p) => [
				p,
				{
					rating: seasonData.players[p]?.rating ?? 1000,
					matches: seasonData.players[p]?.matches ?? 0,
				},
			]),
		),
		trailingMatchTimes: [...modeData.trailingMatchTimes],
	};
};

const updateData = async (
	mode: string,
	sheep: string[],
	wolves: string[],
	inputElos: Record<string, number>,
	matchTime: number,
	playedOn: number,
) => {
	const setup = `${sheep.length}v${wolves.length}`;
	const season = getSeason(playedOn);
	if (mode === "team") {
		const sheepModeData =
			data[`${setup}-sheep`] ??
			(data[`${setup}-sheep`] = emptyModeData());
		const sheepSeasonData =
			sheepModeData.seasons[season] ??
			(sheepModeData.seasons[season] = emptySeason());
		sheep.forEach((p) => {
			sheepSeasonData.players[p] = {
				rating: inputElos[p],
				matches: (sheepSeasonData.players[p]?.matches ?? 0) + 1,
				timeline: [
					...(sheepSeasonData.players[p]?.timeline ?? []),
					[playedOn, inputElos[p]],
				],
			};
			// await query(
			// 	"INSERT INTO elo.outcome (replayId, round, player, rating) VALUES ()",
			// );
		});
		sheepSeasonData.matches++;

		const wolfModeData =
			data[`${setup}-wolf`] ?? (data[`${setup}-wolf`] = emptyModeData());
		const wolfSeasonData =
			wolfModeData.seasons[season] ??
			(wolfModeData.seasons[season] = emptySeason());
		wolves.forEach(
			(p) =>
				(wolfSeasonData.players[p] = {
					rating: inputElos[p],
					matches: (wolfSeasonData.players[p]?.matches ?? 0) + 1,
					timeline: [
						...(wolfSeasonData.players[p]?.timeline ?? []),
						[playedOn, inputElos[p]],
					],
				}),
		);
		wolfSeasonData.matches++;

		// We don't care about matchTime since that should be handled by other runs

		return;
	}

	const modeData = data[mode];
	const seasonData =
		modeData.seasons[season] ?? (modeData.seasons[season] = emptySeason());
	Object.entries(inputElos).forEach(([p, elo]) => {
		seasonData.players[p] = {
			rating: elo,
			matches: (seasonData.players[p]?.matches ?? 0) + 1,
			timeline: [
				...(seasonData.players[p]?.timeline ?? []),
				[playedOn, inputElos[p]],
			],
		};
	});

	if (mode === setup) {
		if (modeData.trailingMatchTimes.length === TRAILING_MATCH_TIMES_LENGTH)
			modeData.trailingMatchTimes.shift();
		modeData.trailingMatchTimes.push(matchTime);
	}
	seasonData.matches++;
};
const K = 16;

export const avg = (a: number, b: number, _: number, arr: number[]): number =>
	a + b / arr.length;
const getMaxTime = (mode: string) => {
	if (mode === "2v4") return 360;
	if (mode === "3v5") return 600;
	if (mode === "5v5") return 1200;
	throw new Error(`Unknown max time for ${mode}`);
};

const reverseInterpolate = (left: number, right: number, value: number) =>
	(value - left) / (right - left);

const tween = (data: number[], percentile: number) => {
	percentile = percentile < 0 ? 0 : percentile > 1 ? 1 : percentile;
	const length = data.length - 1;
	const prevIndex = Math.floor(length * percentile);
	const prevPercentile = prevIndex / length;
	const nextPercentile = (prevIndex + 1) / length;
	const relativePercent =
		(percentile - prevPercentile) / (nextPercentile - prevPercentile);
	return (
		data[prevIndex] * (1 - relativePercent) +
		(data[prevIndex + 1] ?? data[prevIndex]) * relativePercent
	);
};

export const reverseTween = (data: number[], value: number): number => {
	if (value < data[0]) return 0;
	const length = data.length - 1;
	if (value > data[length]) return 1;

	let left = 0;
	let right = length;
	let middle = Math.floor((left + right) / 2);
	while (left <= right) {
		if (data[middle] < value) left = middle + 1;
		else if (data[middle] > value) right = middle - 1;
		else break;

		middle = Math.floor((left + right) / 2);
	}

	// Exact match, find center for duplicates
	if (value === data[middle]) {
		left = middle;
		while (data[left - 1] === value) left--;
		right = middle;
		while (data[right + 1] === value) right++;
		return (left + right) / 2 / length;
	}

	const leftvalue = data[middle];
	const rightValue = data[middle + 1];
	const relativePercent = reverseInterpolate(leftvalue, rightValue, value);

	return (
		(middle * (1 - relativePercent) + (middle + 1) * relativePercent) /
		length
	);
};

const processRoundForMode = async (
	{ mode, sheep, wolves, time }: Round & { mode: string },
	playedOn: number,
) => {
	let maxTime: number;
	try {
		maxTime = getMaxTime(`${sheep.length}v${wolves.length}`);
	} catch (err) {
		return;
	}

	const { players, trailingMatchTimes } = await queryData(
		mode,
		sheep,
		wolves,
		playedOn,
	);
	const sheepElo = sheep.map((p) => players[p].rating).reduce(avg, 0);
	const wolfElo = wolves.map((p) => players[p].rating).reduce(avg, 0);
	const avgMatches = Object.values(players)
		.map((d) => d.matches)
		.reduce(avg, 0);
	const factor = 2 / ((avgMatches + 1) / 8) ** (1 / 4);
	// if (sheepElo === 1000 && wolfElo === 1000) console.log(mode, sheep, wolves);

	const sheepRating = Math.pow(10, sheepElo / 400);
	const wolfRating = Math.pow(10, wolfElo / 400);

	const expectedSheepScore = sheepRating / (sheepRating + wolfRating);
	const expectedWolfScore = 1 - expectedSheepScore;

	const sortedMatches = [...trailingMatchTimes].sort((a, b) => a - b);
	const sheepScore = reverseTween(
		[0, ...sortedMatches.map((v) => Math.min(v, maxTime)), maxTime],
		time,
	);
	const wolfScore = 1 - sheepScore;
	// const expectedTime = sortedMatches[Math.floor(sortedMatches.length / 2)];
	// const sheepWon = time > expectedTime ? 1 : 0;

	const sheepChange = K * factor * (sheepScore - expectedSheepScore);
	sheep.forEach((p) => (players[p].rating += sheepChange));
	const wolfChange =
		K *
		factor *
		(sheep.length / wolves.length) *
		(wolfScore - expectedWolfScore);
	wolves.forEach((p) => (players[p].rating += wolfChange));

	if (LOG)
		console.log("round", {
			mode,
			sheep,
			wolves,
			expectedTime: tween(sortedMatches, expectedSheepScore),
			time,
			sheepChange,
			wolfChange,
		});

	await updateData(
		mode,
		sheep,
		wolves,
		Object.fromEntries(
			Object.entries(players).map(([player, data]) => [
				player,
				data.rating,
			]),
		),
		time,
		playedOn,
	);
};

export const processRound = async (
	{ sheep, wolves, time }: Round,
	playedOn: number,
): Promise<void> => {
	const mode = `${sheep.length}v${wolves.length}`;
	await processRoundForMode({ mode, sheep, wolves, time }, playedOn);
	await processRoundForMode(
		{ mode: "overall", sheep, wolves, time },
		playedOn,
	);
	await processRoundForMode({ mode: "team", sheep, wolves, time }, playedOn);
};
