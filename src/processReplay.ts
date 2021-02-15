import { deduceTeams } from "./deduceTeams.js";
import { fetchReplay } from "./fetch.js";
import { processRound } from "./processRound.js";
import { Game, ListReplay, Round } from "./types.js";

export const LOG = false;

const getSkipListReplayReason = (game: ListReplay) => {
	if (!game.processed) return "not processed";
	if (game.isVoid) return "voided";
	if (game.players.length <= 1) return "not enough players";

	const map = (game.map ?? "").replace(/ /g, "").toLowerCase();
	const variant = (game.variant ?? "").replace(/ /g, "").toLowerCase();
	const isRevo = map.includes("revolution") || variant.includes("revolution");

	if (!isRevo) return "not revo";
};

const knownMaps = [
	"Sheep Tag ReVoLuTiOn 3.1.w3x",
	"Sheep Tag ReVoLuTiOn 6.5.3.w3x",
	"Sheep Tag ReVoLuTiOn 6.7.5.8.w3x",
	"Sheep Tag ReVoLuTiOn 6.7.5.w3x",
	"Sheep Tag ReVoLuTiOn 6.9.3.w3x",
	"Sheep Tag ReVoLuTiOn 7.1.0.w3x",
	"Sheep Tag ReVoLuTiOn 7.2.9B.w3x",
	"Sheep Tag ReVoLuTiOn 7.3.0B.w3x",
	"Sheep Tag ReVoLuTiOn 7.3.2B.w3x",
	"Sheep Tag ReVoLuTiOn 7.3.4B.w3x",
	"Sheep Tag ReVoLuTiOn 7.3.5B.w3x",
	"Sheep Tag ReVoLuTiOn 7.3.6B.w3x",
	"Sheep Tag ReVoLuTiOn 7.3.9B.w3x",
	"Sheep Tag ReVoLuTiOn 7.4.0B (1).w3x",
	"Sheep Tag ReVoLuTiOn 7.4.1B.w3x",
	"Sheep Tag ReVoLuTiOn 7.4.3.w3m",
	"Sheep Tag ReVoLuTiOn 7.4.3.w3x",
	"Sheep Tag ReVoLuTiOn 7.4.3~1.w3x",
	"Sheep Tag ReVoLuTiOn 7.5.6.w3x",
	"Sheep Tag ReVoLuTiOn 7.5.8.w3x",
	"Sheep Tag ReVoLuTiOn 7.6.0.w3x",
	"Sheep Tag ReVoLuTiOn 7.6.1.w3x",
	"Sheep Tag ReVoLuTiOn 7.6.5.w3x",
	"Sheep Tag ReVoLuTiOn 7.6.7.w3x",
	"Sheep Tag ReVoLuTiOn 7.6.8.w3x",
	"Sheep Tag ReVoLuTiOn 7.7.2.w3x",
	"Sheep Tag ReVoLuTiOn 7.7.3.w3x",
	"Sheep Tag ReVoLuTiOn 7.7.4_1.w3x",
	"Sheep Tag ReVoLuTiOn 7.7.4.w3x",
	"Sheep Tag ReVoLuTiOn 7.7.4f.w3x",
	"Sheep Tag ReVoLuTiOn 7.8.1.w3x",
	"Sheep Tag ReVoLuTiOn 7.8.1~1.w3x",
	"Sheep Tag ReVoLuTiOn 8.0.3.w3x",
	"Sheep Tag ReVoLuTiOn 8.1.0.w3x",
	"Sheep Tag ReVoLuTiOn 8.1.1.w3x",
	"Sheep Tag ReVoLuTiOn 8.1.2.w3x",
	"Sheep Tag ReVoLuTiOn 8.1.2.w3x",
	"Sheep Tag ReVoLuTiOn 8.1.3.w3x",
	"Sheep Tag ReVoLuTiOn 8.1.3~1.w3x",
	"Sheep Tag ReVoLuTiOn 8.1.5.w3x",
	"Sheep Tag ReVoLuTiOn 8.1.6.w3x",
	"Sheep Tag ReVoLuTiOn 8.1.7.w3x",
	"Sheep Tag ReVoLuTiOn 8.2.1.w3x",
	"Sheep Tag ReVoLuTiOn 8.3.2.w3x",
	"Sheep Tag ReVoLuTiOn 8.4.0.w3x",
	"Sheep Tag ReVoLuTiOn 8.4.1.w3x",
	"Sheep Tag ReVoLuTiOn 8.4.2.w3x",
	"Sheep Tag ReVoLuTiOn 8.5.0.w3x",
	"Sheep Tag ReVoLuTiOn 8.5.1.w3x",
	"Sheep Tag ReVoLuTiOn 8.5.2.w3x",
	"Sheep Tag ReVoLuTiOn 8.6.0.w3x",
	"Sheep Tag ReVoLuTiOn 8.6.0~2.w3x",
	"Sheep Tag ReVoLuTiOn 8.6.1.w3x",
	"Sheep Tag ReVoLuTiOn 8.6.2.w3x",
	"Sheep Tag ReVoLuTiOn 8.6.2~1.w3x",
	"Sheep Tag ReVoLuTiOn 8.6.2hack.w3x",
	"Sheep Tag ReVoLuTiOn 8.6.3.w3x",
	"Sheep Tag ReVoLuTiOn 9.0.0.w3x",
	"Sheep Tag ReVoLuTiOn 9.0.1.w3x",
	"Sheep Tag ReVoLuTiOn 9.0.2.w3x",
	"Sheep Tag ReVoLuTiOn 9.0.2~1.w3x",
	"Sheep Tag ReVoLuTiOn 9.0.3.w3x",
	"Sheep Tag ReVoLuTiOn 9.0.4.w3x",
	"Sheep Tag ReVoLuTiOn 9.0.5.w3x",
	"Sheep Tag ReVoLuTiOn 9.0.6.w3x",
	"Sheep Tag ReVoLuTiOn BUMP 9.0.6.w3x",
	"Sheep Tag ReVoLuTiOn Cagematch 8.6.3.w3x",
	"Sheep Tag ReVoLuTiOn HYPE 8.4.1.w3x",
	"Sheep Tag ReVoLuTiOn Xmas 8.2.1.w3x",
	"Sheep Tag ReVoLuTiOn Xmas 9.0.5.w3x",
	"Sheep Tag ReVoLuTiOn Xmas 9.0.6.w3x",
];
const getSkipReplayReason = (game: Game) => {
	if (!knownMaps.includes(game.map)) return "not whitelisted: " + game.map;
};

export const processReplay = async (listReplay: ListReplay): Promise<void> => {
	const skipListReplayReason = getSkipListReplayReason(listReplay);
	if (skipListReplayReason) {
		if (LOG)
			console.log(
				"Skipping",
				listReplay.id,
				"from",
				new Date(listReplay.playedOn * 1000),
				skipListReplayReason,
			);
		return;
	}

	const replay = await fetchReplay(listReplay.id);
	const skipReplayReason = getSkipReplayReason(replay.data.game);
	if (skipReplayReason) {
		if (LOG)
			console.log(
				"Skipping",
				listReplay.id,
				"from",
				new Date(listReplay.playedOn * 1000),
				skipReplayReason,
			);
		return;
	}

	const players = replay.data.game.players;
	const recordKeeper = players.find((p) => p.variables?.setup);
	if (!recordKeeper) {
		if (LOG)
			console.log(
				"Skipping replay with no data",
				replay.id,
				"from",
				new Date(listReplay.playedOn * 1000),
			);
		return;
	}

	const playerTimes: {
		times: number[];
		cursor: number;
		slot: number;
		name: string;
	}[] = [];
	players.forEach((p) => {
		playerTimes[p.slot] = {
			times: (p.variables?.roundTimes?.toString() ?? "")
				.split("|")
				.map((round: string) => round.trim())
				.filter(Boolean)
				.map((round: string) => parseFloat(round)),
			slot: p.slot,
			cursor: 0,
			name: p.name,
		};
	});

	const rawSetup = recordKeeper.variables!.setup!.toString();
	if (rawSetup.length === 218 && LOG)
		console.log("Max w3mmd value setup encountered; skipping last round");
	const setup =
		rawSetup.length === 218
			? rawSetup.slice(0, rawSetup.lastIndexOf(" "))
			: rawSetup;

	const playerIds = players.map((p) => p.slot);

	// : [number[], number[]][]
	const teams = setup
		.split(" ")
		.map((round: string) => deduceTeams(playerIds, round.toLowerCase()))
		.filter((v): v is [number[], number[]] => !!v);

	const rounds = teams
		.map(([sheep, wolves], matchId) => {
			let time: number | undefined;
			let inconsistentTime = false;
			sheep.forEach((s: number, index: number) => {
				const playerTime =
					playerTimes[s].times[playerTimes[s].cursor++];
				if (index === 0) time = playerTime;
				else if (playerTime !== time) {
					inconsistentTime = true;
					if (LOG)
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
				if (LOG)
					console.warn("Skipping match with multiple times", matchId);
				return;
			}

			if (time === undefined) {
				if (LOG)
					console.warn(
						"Skipping match that is missing a time",
						matchId,
					);
				return;
			}

			return {
				sheep: sheep.map((slot) => playerTimes[slot].name),
				wolves: wolves.map((slot) => playerTimes[slot].name),
				time,
			};
		})
		.filter((v): v is Round => !!v);

	for (const round of rounds) await processRound(round);
	// if (rounds[0]) {
	// 	console.log(new Date(replay.playedOn * 1000));
	// 	console.log(rounds[0]);
	// 	await processRound(rounds[0]);
	// 	temp.processedARound = true;
	// }
};

// export const temp = { processedARound: false };
