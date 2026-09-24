import * as wanakana from "wanakana";

/**
 * Maps Japanese Kana characters to valid Romaji representations.
 */
export const ROMAJI_ALTERNATIVES: Record<string, string[]> = {
	し: ["shi", "si"],
	ち: ["chi", "ti"],
	つ: ["tsu", "tu"],
	じ: ["ji", "zi"],
	ぢ: ["ji", "di"],
	づ: ["dzu", "du"],
	ふ: ["fu", "hu"],
	を: ["wo", "o"],
	ん: ["n", "nn", "n'"],
	しゃ: ["sha", "sya"],
	しゅ: ["shu", "syu"],
	しょ: ["sho", "syo"],
	ちゃ: ["cha", "tya"],
	ちゅ: ["chu", "tyu"],
	ちょ: ["cho", "tyo"],
	じゃ: ["ja", "zya", "jya"],
	じゅ: ["ju", "zyu", "jyu"],
	じょ: ["jo", "zyo", "jyo"],
	ぢゃ: ["dya", "ja"],
	ぢゅ: ["dyu", "ju"],
	ぢょ: ["dyo", "jo"],

	シ: ["shi", "si"],
	チ: ["chi", "ti"],
	ツ: ["tsu", "tu"],
	ジ: ["ji", "zi"],
	ヂ: ["ji", "di"],
	ヅ: ["dzu", "du"],
	フ: ["fu", "hu"],
	ヲ: ["wo", "o"],
	ン: ["n", "nn", "n'"],
	シャ: ["sha", "sya"],
	シュ: ["shu", "syu"],
	ショ: ["sho", "syo"],
	チャ: ["cha", "tya"],
	チュ: ["chu", "tyu"],
	チョ: ["cho", "tyo"],
	ジャ: ["ja", "zya", "jya"],
	ジュ: ["ju", "zyu", "jyu"],
	ジョ: ["jo", "zyo", "jyo"],
};

/**
 * Custom Romaji mapping used to normalize converted Kana for prefix validation.
 */
export const CUSTOM_ROMAJI_MAPPING: Record<string, string> = {
	づ: "dzu",
	ヅ: "dzu",
};

/**
 * Generates all valid Romaji spellings for a given Japanese Kana string.
 *
 * @param {string} kanaStr - The Japanese Kana string to expand.
 * @returns {string[]} An array of all possible Romaji spellings.
 */
export function generateRomajiSpellings(kanaStr: string): string[] {
	const segments: (string[] | { type: string; index: number })[] = [];
	let i = 0;
	while (i < kanaStr.length) {
		const char = kanaStr[i] || "";
		const nextChar = kanaStr[i + 1] || "";

		if (nextChar && /[ゃゅょぁぃぅぇぉャュョァィゥェォ]/.test(nextChar)) {
			const combo = char + nextChar;
			if (ROMAJI_ALTERNATIVES[combo]) {
				segments.push(ROMAJI_ALTERNATIVES[combo]);
			} else {
				segments.push([wanakana.toRomaji(combo)]);
			}
			i += 2;
		} else if (char === "っ" || char === "ッ") {
			segments.push({ type: "tsu", index: i });
			i += 1;
		} else if (char === "ー") {
			if (segments.length > 0) {
				const prevSegment = segments[segments.length - 1];
				if (Array.isArray(prevSegment)) {
					const vowels = prevSegment
						.map((alt) => alt[alt.length - 1])
						.filter((c): c is string =>
							Boolean(c && /[aeiouy]/i.test(c)),
						);
					const uniqueVowels = [...new Set(vowels)];
					segments.push(
						uniqueVowels.length > 0 ? uniqueVowels : ["o"],
					);
				} else {
					segments.push(["o"]);
				}
			} else {
				segments.push(["-"]);
			}
			i += 1;
		} else {
			if (ROMAJI_ALTERNATIVES[char]) {
				segments.push(ROMAJI_ALTERNATIVES[char]);
			} else {
				segments.push([wanakana.toRomaji(char)]);
			}
			i += 1;
		}
	}

	for (let j = 0; j < segments.length; j++) {
		const current = segments[j];
		if (current && !Array.isArray(current) && current.type === "tsu") {
			let nextArr: string[] | null = null;
			for (let k = j + 1; k < segments.length; k++) {
				const nextSeg = segments[k];
				if (Array.isArray(nextSeg)) {
					nextArr = nextSeg;
					break;
				}
			}
			if (nextArr) {
				const firstLetters = nextArr
					.map((alt) => alt[0])
					.filter((c): c is string =>
						Boolean(c && /[a-zA-Z]/.test(c)),
					);
				const uniqueLetters = [...new Set(firstLetters)];
				segments[j] = uniqueLetters.length > 0 ? uniqueLetters : ["t"];
			} else {
				segments[j] = ["t"];
			}
		}
	}

	let results: string[] = [""];
	for (const seg of segments) {
		if (Array.isArray(seg)) {
			const nextResults: string[] = [];
			for (const r of results) {
				for (const opt of seg) {
					nextResults.push(r + opt);
				}
			}
			results = nextResults;
		}
	}

	return results;
}

/**
 * Checks if the user's current input is a valid prefix of any accepted Romaji spelling.
 *
 * @param {string} input - The user's input string.
 * @param {string} targetKana - The target Japanese Kana string.
 * @returns {boolean} True if the input matches a valid prefix.
 */
export function isInputValidPrefix(input: string, targetKana: string): boolean {
	const romajiInput = wanakana.toRomaji(input, {
		customRomajiMapping: CUSTOM_ROMAJI_MAPPING,
	});
	const cleanInput = romajiInput
		.toLowerCase()
		.replace(/[’‘]/g, "'")
		.replace(/\s+/g, "");
	if (!cleanInput) return true;
	const spellings = generateRomajiSpellings(targetKana);
	return spellings.some((spelling) =>
		spelling.toLowerCase().startsWith(cleanInput),
	);
}

/**
 * Checks whether input is a complete accepted Kana or Romaji spelling.
 *
 * @param {string} input - The user's complete answer.
 * @param {string} targetKana - The displayed Japanese reading.
 * @returns {boolean} True when the input exactly matches an accepted answer.
 */
export function isInputValidAnswer(input: string, targetKana: string): boolean {
	const options = { customKanaMapping: { dzu: "づ" } };
	if (
		wanakana.toHiragana(input, options) ===
		wanakana.toHiragana(targetKana, options)
	) {
		return true;
	}

	const romajiInput = wanakana
		.toRomaji(input, { customRomajiMapping: CUSTOM_ROMAJI_MAPPING })
		.toLowerCase()
		.replace(/[’‘]/g, "'");
	return generateRomajiSpellings(targetKana).some(
		(spelling) => spelling.toLowerCase() === romajiInput,
	);
}
