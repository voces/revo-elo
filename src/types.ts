export interface ListReplay {
	map?: string;
	variant?: string;
	processed: boolean;
	isVoid: boolean;
	id: number;
	players: { name: string; colour: number }[];
	playedOn: number;
}

interface Player {
	id: number;
	name: string;
	variables?: Record<string, number | string | undefined>;
	slot: number;
}

export interface Game {
	players: Player[];
	map: string;
}

export interface Replay {
	id: number;
	playedOn: number;
	data: { game: Game };
}

export interface Round {
	sheep: string[];
	wolves: [];
	time: number;
}
