import { reverseTween } from "./processRound";

describe("reverseTween", () => {
	it("works", () => {
		const arr = [1, 10, 100];
		expect(reverseTween(arr, 0)).toEqual(0);
		expect(reverseTween(arr, 1)).toEqual(0);
		// Mid way between 1 and 10
		expect(reverseTween(arr, 11 / 2)).toBeCloseTo(0.25);
		expect(reverseTween(arr, 9.5)).toBeCloseTo(0.47);
		expect(reverseTween(arr, 10)).toEqual(0.5);
		// Mid way between 1 and 10
		expect(reverseTween(arr, 110 / 2)).toEqual(0.75);
		expect(reverseTween(arr, 100)).toEqual(1);
		expect(reverseTween(arr, 1000)).toEqual(1);

		// 0, 1/3, 2/3, 3/3
		expect(reverseTween([0, 1, 2, 3], 2)).toEqual(2 / 3);

		// 0, 1/4, 2/4, 3/4, 4/4
		expect(reverseTween([0, 1, 2, 2, 3], 2)).toEqual((2 / 4 + 3 / 4) / 2);
	});
});
