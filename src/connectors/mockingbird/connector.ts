import { Connector, Media } from "@chili-publish/studio-connectors";

/**************************************************************************/
/* Pre-encoded 1×1 colored PNG placeholders (no external connection)      */
/**************************************************************************/

export const PLACEHOLDER_PNGS: Record<string, string> = {
	sunset:   "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mP4WSwGAAPrAYPccVSnAAAAAElFTkSuQmCC",
	mountain: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mOwbvoGAAKvAbSJsn7VAAAAAElFTkSuQmCC",
	city:     "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mPojvkGAANTAd5bBcfQAAAAAElFTkSuQmCC",
	forest:   "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mNQOhoHAAJSAUZEuwQDAAAAAElFTkSuQmCC",
	ocean:    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mPgW/oSAAJhAZ13CQERAAAAAElFTkSuQmCC",
	desert:   "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mN4tZkDAAQwAaYb1KNdAAAAAElFTkSuQmCC",
	snow:     "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mM4ffUhAATwAoLs9l8mAAAAAElFTkSuQmCC",
	tropical: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mMQ2bEMAAJWAXPppz4uAAAAAElFTkSuQmCC",
	abstract: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mN44zETAAPxAc6x3OsqAAAAAElFTkSuQmCC",
	vintage:  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR42mOoKMwBAAK6AVbzBxfJAAAAAElFTkSuQmCC",
};

/**************************************************************************/
/* Mock catalogue                                                          */
/**************************************************************************/

interface MockAsset {
	id: string;
	name: string;
	placeholder: string;
	width: number;
	height: number;
}

const BASE_ASSETS = [
	{ name: "Sunset Beach",    placeholder: "sunset",   width: 800,  height: 600  },
	{ name: "Mountain Peak",   placeholder: "mountain", width: 1200, height: 800  },
	{ name: "City Lights",     placeholder: "city",     width: 1920, height: 1080 },
	{ name: "Forest Trail",    placeholder: "forest",   width: 600,  height: 900  },
	{ name: "Ocean Waves",     placeholder: "ocean",    width: 1000, height: 667  },
	{ name: "Desert Dunes",    placeholder: "desert",   width: 1400, height: 700  },
	{ name: "Snowy Cabin",     placeholder: "snow",     width: 800,  height: 800  },
	{ name: "Tropical Garden", placeholder: "tropical", width: 750,  height: 500  },
	{ name: "Abstract Shapes", placeholder: "abstract", width: 500,  height: 500  },
	{ name: "Vintage Film",    placeholder: "vintage",  width: 640,  height: 480  },
];

const MOCK_ASSETS: MockAsset[] = Array.from({ length: 100 }, (_, i) => {
	const base = BASE_ASSETS[i % BASE_ASSETS.length];
	return { id: String(i + 1), name: `${base.name} ${i + 1}`, placeholder: base.placeholder, width: base.width, height: base.height };
});

/**************************************************************************/
/* Connector                                                              */
/**************************************************************************/

export default class MockingbirdConnector implements Media.MediaConnector {
	runtime: Connector.ConnectorRuntimeContext;

	constructor(runtime: Connector.ConnectorRuntimeContext) {
        this.runtime = runtime;
	}

	getCapabilities(): Media.MediaConnectorCapabilities {
		return { query: true, detail: true, filtering: false, metadata: false };
	}

	getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
		return [];
	}

	async query(
		options: Connector.QueryOptions,
		_context: Connector.Dictionary,
	): Promise<Media.MediaPage> {
		const pageSize = options.pageSize || 10;
		const offset = Number(options.pageToken) || 0;
		const slice = MOCK_ASSETS.slice(offset, offset + pageSize);

		const data = slice.map((a) => ({
			id: a.id,
			name: a.name,
			relativePath: "/",
			extension: "png",
			type: 0 as const,
			metaData: {},
		}));

		const nextOffset = offset + pageSize;
		return {
			pageSize,
			data,
			links: { nextPage: nextOffset < MOCK_ASSETS.length ? String(nextOffset) : "" },
		};
	}

	async detail(
		id: string,
		_context: Connector.Dictionary,
	): Promise<Media.MediaDetail> {
		const asset = MOCK_ASSETS.find((a) => a.id === id) ?? MOCK_ASSETS[Math.floor(Math.random() * MOCK_ASSETS.length)];
		return {
			id: asset.id,
			name: asset.name,
			relativePath: "/",
			extension: "png",
			type: 0,
			metaData: {},
			width: asset.width,
			height: asset.height,
		};
	}

	async download(
		id: string,
		previewType: Media.DownloadType,
		_intent: Media.DownloadIntent,
		context: Connector.Dictionary,
	): Promise<Connector.ArrayBufferPointer> {
		const asset = MOCK_ASSETS.find((a) => a.id === id) ?? MOCK_ASSETS[Math.floor(Math.random() * MOCK_ASSETS.length)];

		if (this.runtime.options['useRemoteImages'] === "true") {
			let w = asset.width;
			let h = asset.height;
			if (previewType === "thumbnail") { w = 200; h = Math.round(200 * h / w); }
			else if (previewType === "mediumres") { w = 400; h = Math.round(400 * h / w); }
			const resp = await this.runtime.fetch(`https://picsum.photos/seed/${asset.id}/${w}/${h}`, { method: "GET" });
			if (!resp.ok) throw new ConnectorHttpError(resp.status, `picsum returned ${resp.status}`);
			return resp.arrayBuffer;
		}

		const base64 = PLACEHOLDER_PNGS[asset.placeholder] ?? PLACEHOLDER_PNGS["sunset"];
		const resp = await this.runtime.fetch(`data:image/png;base64,${base64}`, { method: "GET" });
		return resp.arrayBuffer;
	}
}
