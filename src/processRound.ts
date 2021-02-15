import { LOG } from "./processReplay.js";
import { Round } from "./types";

export interface ModeData {
	players: Record<string, { rating: number; matches: number } | undefined>;
	matches: number;
	trailingMatchTimes: number[];
}

const emptyModeData = () => ({
	players: {},
	matches: 0,
	trailingMatchTimes: Array(99).fill(100),
});

export const data: Record<string, ModeData> = {};
const queryData = async (
	mode: string,
	sheep: string[],
	wolves: string[],
): Promise<{
	elos: Record<string, number>;
	trailingMatchTimes: number[];
}> => {
	if (mode === "team") {
		const mode = `${sheep.length}v${wolves.length}`;
		const sheepModeData = await queryData(`${mode}-sheep`, sheep, []);
		const wolfModeData = await queryData(`${mode}-wolf`, [], wolves);
		const modeData = await queryData(mode, [], []);

		return {
			elos: { ...sheepModeData.elos, ...wolfModeData.elos },
			trailingMatchTimes: [...modeData.trailingMatchTimes],
		};
	}

	const modeData = data[mode] ?? (data[mode] = emptyModeData());
	return {
		elos: Object.fromEntries(
			[...sheep, ...wolves].map((p) => [
				p,
				modeData.players[p]?.rating ?? 1000,
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
) => {
	const setup = `${sheep.length}v${wolves.length}`;
	if (mode === "team") {
		const sheepModeData =
			data[`${setup}-sheep`] ??
			(data[`${setup}-sheep`] = emptyModeData());
		sheep.forEach(
			(p) =>
				(sheepModeData.players[p] = {
					rating: inputElos[p],
					matches: (sheepModeData.players[p]?.matches ?? 0) + 1,
				}),
		);
		sheepModeData.matches++;

		const wolfModeData =
			data[`${setup}-wolf`] ?? (data[`${setup}-wolf`] = emptyModeData());
		wolves.forEach(
			(p) =>
				(wolfModeData.players[p] = {
					rating: inputElos[p],
					matches: (wolfModeData.players[p]?.matches ?? 0) + 1,
				}),
		);
		wolfModeData.matches++;

		// We don't care about matchTime since that should be handled by other runs

		return;
	}

	const modeData = data[mode];
	Object.entries(inputElos).forEach(([p, elo]) => {
		modeData.players[p] = {
			rating: elo,
			matches: (modeData.players[p]?.matches ?? 0) + 1,
		};
	});

	if (mode === setup) {
		modeData.trailingMatchTimes.shift();
		modeData.trailingMatchTimes.push(matchTime);
	}
	modeData.matches++;
};
const K = 32;

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

const processRoundForMode = async ({
	mode,
	sheep,
	wolves,
	time,
}: Round & { mode: string }) => {
	let maxTime: number;
	try {
		maxTime = getMaxTime(`${sheep.length}v${wolves.length}`);
	} catch (err) {
		return;
	}

	const { elos, trailingMatchTimes } = await queryData(mode, sheep, wolves);
	const sheepElo = sheep.map((p) => elos[p]).reduce(avg, 0);
	const wolfElo = wolves.map((p) => elos[p]).reduce(avg, 0);

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

	const sheepChange = K * (sheepScore - expectedSheepScore);
	sheep.forEach((p) => (elos[p] += sheepChange));
	const wolfChange =
		K * (sheep.length / wolves.length) * (wolfScore - expectedWolfScore);
	wolves.forEach((p) => (elos[p] += wolfChange));

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

	// console.log(elos);

	// if (sheepRating > 1200 && wolfRating > 1200)
	// 	console.log(mode, sheep, wolves, sheepRating, wolfRating);

	await updateData(mode, sheep, wolves, elos, time);
};

export const processRound = async ({
	sheep,
	wolves,
	time,
}: Round): Promise<void> => {
	const mode = `${sheep.length}v${wolves.length}`;
	await processRoundForMode({ mode, sheep, wolves, time });
	await processRoundForMode({ mode: "overall", sheep, wolves, time });
	await processRoundForMode({ mode: "team", sheep, wolves, time });
};
