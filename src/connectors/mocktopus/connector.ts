import { Connector, Data } from "@chili-publish/studio-connectors";

/**************************************************************************/
/* Mock data                                                              */
/**************************************************************************/

const ADJECTIVES = [
	"Mock", "Wobbly", "Inky", "Bubbly", "Sneaky", "Squiggly", "Goofy",
	"Wonky", "Jolly", "Noodly", "Bouncy", "Cheeky", "Wiggly", "Salty",
	"Giggly", "Zany", "Flappy", "Loopy", "Blobby", "Quirky",
];

const NOUNS = [
	"Tentacle", "Barnacle", "Blobfish", "Squid", "Cuttle", "Coral",
	"Anchovy", "Seahorse", "Jellybean", "Nautilus", "Plankton", "Puffer",
	"Splash", "Inkpot", "Bubbles", "Kelp", "Current", "Drift", "Pebble", "Tide",
];

const VERBS = [
	"wiggles", "sloshes", "blorps", "splatters", "drifts",
	"wobbles", "bounces", "splashes", "noodles", "boops",
];

const FILLERS = [
	"through the reef", "under suspicious circumstances", "with extra bubbles",
	"near the mock dock", "before the tide compiles", "in a deeply questionable current",
	"without any production guarantees", "like a confused cephalopod",
	"during light panic", "for testing purposes only",
];

const pickRandom = <T>(items: T[]): T =>
	items[Math.floor(Math.random() * items.length)];

const LONGER_TEMPLATES = [
	() => `The ${pickRandom(ADJECTIVES)} ${pickRandom(NOUNS)} ${pickRandom(VERBS)} ${pickRandom(FILLERS)}.`,
	() => `Meanwhile, a ${pickRandom(ADJECTIVES)} ${pickRandom(NOUNS)} quietly ${pickRandom(VERBS)} near the testing reef.`,
	() => `No ${pickRandom(NOUNS)} was harmed, although the ${pickRandom(ADJECTIVES)} current remains highly suspicious.`,
	() => `Mocktopus reports that the ${pickRandom(NOUNS)} ${pickRandom(VERBS)} again, which is technically expected behavior.`,
	() => `The ${pickRandom(ADJECTIVES)} ${pickRandom(NOUNS)} ${pickRandom(VERBS)} ${pickRandom(FILLERS)}, while a ${pickRandom(ADJECTIVES)} ${pickRandom(NOUNS)} quietly reorganizes the kelp-based backlog for testing purposes only.`,
	() => `Somewhere beyond the ${pickRandom(ADJECTIVES)} reef, the ${pickRandom(NOUNS)} ${pickRandom(VERBS)} with impressive confidence, even though the surrounding ${pickRandom(NOUNS)} community agrees that nothing about the current situation appears production-ready.`,
	() => `At approximately bubble o'clock, a ${pickRandom(ADJECTIVES)} ${pickRandom(NOUNS)} was observed to ${pickRandom(VERBS)} ${pickRandom(FILLERS)}, prompting several nearby ${pickRandom(NOUNS)} to file strongly worded but entirely decorative incident reports.`,
	() => `Mocktopus analytics indicate that the ${pickRandom(ADJECTIVES)} ${pickRandom(NOUNS)} continues to ${pickRandom(VERBS)} near the outer coral ring, which is technically acceptable, emotionally suspicious, and fully aligned with the expected chaos profile.`,
	() => `Although no certified ${pickRandom(NOUNS)} experts were available for comment, the ${pickRandom(ADJECTIVES)} tide insists that something definitely ${pickRandom(VERBS)} ${pickRandom(FILLERS)}, leaving only bubbles, questions, and a mildly offended ${pickRandom(NOUNS)} behind.`,
	() => `Following a comprehensive review of the ${pickRandom(ADJECTIVES)} seabed, the local ${pickRandom(NOUNS)} committee concluded that repeated ${pickRandom(VERBS)} events are normal during low tide, especially when mock data has been seasoned with extra ink and unnecessary enthusiasm.`,
	() => `The ${pickRandom(ADJECTIVES)} ${pickRandom(NOUNS)} drifted into view shortly before sunset, began to ${pickRandom(VERBS)} ${pickRandom(FILLERS)}, and somehow turned an otherwise routine underwater operation into a deeply questionable but visually impressive demonstration.`,
	() => `Despite earlier assurances from the Department of ${pickRandom(ADJECTIVES)} ${pickRandom(NOUNS)}, the system once again ${pickRandom(VERBS)} under gentle oceanic pressure, confirming that all observed weirdness remains reproducible, testable, and oddly adorable.`,
];

const selectAdjectives = (count: number): string => {
	const adjectivesToChooseFrom = [...ADJECTIVES];
	const chosen: string[] = [];
	for (let i = 0; i < count && 0 < adjectivesToChooseFrom.length; i++) {
		const index = Math.floor(Math.random() * adjectivesToChooseFrom.length);
		chosen.push(adjectivesToChooseFrom.splice(index, 1)[0]);
	}
	return chosen.join(" ");
};

const createMockWords = (count: number): string =>
	`${selectAdjectives(Math.max(0, count - 1))} ${pickRandom(NOUNS)}`;

const createMockSentence = (): string => {
	if (Math.random() < 0.5) return pickRandom(LONGER_TEMPLATES)();
	return `${selectAdjectives(1)} ${pickRandom(NOUNS)} ${pickRandom(VERBS)} ${pickRandom(FILLERS)}.`;
};

const createMockSentences = (count: number): string =>
	Array.from({ length: count }, createMockSentence).join(" ");

const createMockParagraphs = (count: number): string =>
	Array.from({ length: count }, () => createMockSentences(4)).join("\n\n");

/**************************************************************************/
/* Utility functions                                                      */
/**************************************************************************/

const VALID_TYPES = [
	"shortText",
	"longText",
	"number",
	"boolean",
	"date",
	"list",
	"image",
] as const;

const MODEL_TYPE_MAP: Record<FieldType, Data.DataModelProperty["type"]> = {
	shortText: "singleLine",
	longText: "multiLine",
	number: "number",
	boolean: "boolean",
	date: "date",
	list: "singleLine",
	image: "singleLine",
};

type FieldType = typeof VALID_TYPES[number];

interface SchemaField {
	name: string;
	type: FieldType;
	params: Record<string, string>;
}

function isFieldType(type: string): type is FieldType {
	return (VALID_TYPES as readonly string[]).includes(type);
}

function parseParams(paramsStr: string): Record<string, string> {
	const params: Record<string, string> = {};
	if (!paramsStr) return params;
	for (const pair of paramsStr.split(",")) {
		const [key, value] = pair.split("=").map(s => s.trim());
		if (key && value) {
			params[key] = value;
		}
	}
	return params;
}

function splitFields(schema: string): string[] {
	const result: string[] = [];
	let depth = 0;
	let current = "";
	for (const ch of schema) {
		if (ch === "(") depth++;
		else if (ch === ")") depth--;
		else if (ch === "," && depth === 0) {
			result.push(current);
			current = "";
			continue;
		}
		current += ch;
	}
	if (current) result.push(current);
	return result;
}

function parseDSL(schema: string, logError: (msg: string) => void): SchemaField[] {
	if (!schema?.trim())
		return [];
	
	const fields: SchemaField[] = [];
	for (const entry of splitFields(schema)) {
		const trimmed = entry.trim();
		if (!trimmed) continue;
		const colonIndex = trimmed.indexOf(":");
		if (colonIndex === -1) {
			logError(`Mocktopus: invalid field "${trimmed}" — expected "fieldName:type" or "fieldName:type(param=value)"`);
			continue;
		}
		const name = trimmed.slice(0, colonIndex).trim();
		const rest = trimmed.slice(colonIndex + 1).trim();
		if (!name) {
			logError(`Mocktopus: invalid field "${trimmed}" — field name is required`);
			continue;
		}
		const parenIndex = rest.indexOf("(");
		// rest can be with or without values (shortText or shortText(values=active|inactive|pending))
		const rawType = parenIndex === -1 ? rest : rest.slice(0, parenIndex).trim(); 
		if (rawType === "") {
			logError(`Mocktopus: invalid field "${trimmed}" — type is required`);
			continue;
		}
		const closeParenIndex = rest.lastIndexOf(")");
		if (parenIndex !== -1 && (closeParenIndex === -1 || closeParenIndex < parenIndex)) {
			logError(`Mocktopus: invalid field "${trimmed}" — missing closing ")"`);
			continue;
		}
		const paramsStr = parenIndex === -1 ? "" : rest.slice(parenIndex + 1, closeParenIndex);
		if (!isFieldType(rawType)) {
			logError(`Mocktopus: unknown type "${rawType}" for field "${name}" — valid types: ${VALID_TYPES.join(", ")}`);
			continue;
		}
		fields.push({ name, type: rawType, params: parseParams(paramsStr) });
	}
	return fields;
}

function ParseNumberParameter(value: string | undefined, fallback: number): number {
	const n = Number(value ?? fallback);
	return isNaN(n) ? fallback : n;
}

function generateValue(field: SchemaField, index: number): string | number | boolean | Date {
	if (field.params.values) {
		const values = (field.params.values as string).split("|");
		return values[Math.floor(Math.random() * values.length)];
	}
	switch (field.type) {
		case "shortText":
			return createMockWords(ParseNumberParameter(field.params.numberOfWords, 2));
		case "longText":
			return createMockParagraphs(ParseNumberParameter(field.params.numberOfParagraphs, 2));
		case "number": {
			const rawMin = Math.floor(ParseNumberParameter(field.params.min, 0));
			const rawMax = Math.floor(ParseNumberParameter(field.params.max, 1000));
			const minVal = Math.min(rawMin, rawMax);
			const maxVal = Math.max(rawMin, rawMax);
			return minVal + (index * 42) % (maxVal - minVal + 1);
		}
		case "boolean":
			return Math.random() < 0.5;
		case "date": {
			const base = new Date("2020-01-01").getTime();
			const range = new Date("2030-01-01").getTime() - base;
			const d = new Date(base + (index % 100) * Math.floor(range / 100));
			return d.toISOString().slice(0, 10);
		}
		case "list": {
			return createMockWords(1);
		}
		case "image": 
			return String(Math.floor(Math.random() * 100) + 1);
	}
}

function simulateDelay(ms: number): void {
	// QuickJS (the connector runtime) has no setTimeout — busy-wait instead
	const end = Date.now() + ms;
	while (Date.now() < end) {}
}

/**************************************************************************/
/* Connector                                                              */
/**************************************************************************/

export default class MocktopusConnector implements Data.DataConnector {
	runtime: Connector.ConnectorRuntimeContext;

	constructor(runtime: Connector.ConnectorRuntimeContext) {
		this.runtime = runtime;
	}

	getCapabilities(): Data.DataConnectorCapabilities {
		return { filtering: false, sorting: false, model: true };
	}

	getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
		return [
			{ name: "schema", displayName: "Schema (e.g. firstName:shortText, age:number, photo:image)", type: "text" },
			{ name: "recordCount", displayName: "Record count", type: "text" },
			{ name: "simulateDelays", displayName: "Simulate delays", type: "boolean" },
			{ name: "minDelay", displayName: "Min delay (ms)", type: "text" },
			{ name: "maxDelay", displayName: "Max delay (ms)", type: "text" },
		];
	}

	async getModel(context: Connector.Dictionary): Promise<Data.DataModel> {
		const schema = (context["schema"] as string) ?? "";
		const fields = parseDSL(schema, (msg) => this.runtime.logError(msg));
		return {
			properties: fields.map((f) => ({
				name: f.name,
				type: MODEL_TYPE_MAP[f.type],
			})),
		};
	}

	async getPage(
		config: Data.PageConfig,
		context: Connector.Dictionary
	): Promise<Data.DataPage> {
		const schema = (context["schema"] as string) ?? "";
		const recordCount = parseInt((context["recordCount"] as string) ?? "10", 10) || 10;
		const simulateDelays = (context["simulateDelays"] as boolean) ?? false;
		const minDelay = parseInt((context["minDelay"] as string) ?? "100", 10) || 100;
		const maxDelay = parseInt((context["maxDelay"] as string) ?? "1000", 10) || 1000;

		if (simulateDelays && (minDelay > 0 || maxDelay > 0)) {
			const lo = Math.min(minDelay, maxDelay);
			const hi = Math.max(minDelay, maxDelay);
			simulateDelay(lo + Math.floor(Math.random() * (hi - lo + 1)));
		}

		const fields = parseDSL(schema, (msg) => this.runtime.logError(msg));
		const limit = Math.min(config.limit || recordCount, recordCount);
		const offset = config.continuationToken ? parseInt(config.continuationToken, 10) : 0;

		const data: Data.DataItem[] = [];
		for (let i = 0; i < limit && offset + i < recordCount; i++) {
			const index = offset + i;
			const record: Data.DataItem = {} as Data.DataItem;
			for (const field of fields) {
				record[field.name] = generateValue(field, index);
			}
			data.push(record);
		}

		const nextOffset = offset + limit;
		const continuationToken = nextOffset < recordCount ? String(nextOffset) : undefined;

		return { data, continuationToken };
	}
}
