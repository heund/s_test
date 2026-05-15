const CONFIG_FILES = {
    qrCodes: './data/qr-codes.json',
    locations: './data/locations.json',
    deities: './data/deities.json',
    mappings: './data/mappings.json',
    revealTexts: './data/reveal-texts.json',
    eventDeityRules: './data/event-deity-rules.json'
};

async function fetchJson(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Unable to load ${path}: ${response.status}`);
    }
    return response.json();
}

export async function loadAppConfig() {
    const entries = await Promise.all(
        Object.entries(CONFIG_FILES).map(async ([key, path]) => [key, await fetchJson(path)])
    );

    return Object.fromEntries(entries);
}
