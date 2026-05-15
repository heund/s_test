const STORAGE_KEY = 'pwaDemoCollection';
const LEGACY_STORAGE_KEY = 'jejuCollection';
const SCHEMA_VERSION = 1;
const STORAGE_TEST_KEY = '__pwaDemoStorageTest__';

function emptyCollection() {
    return {
        schemaVersion: SCHEMA_VERSION,
        items: []
    };
}

function safeParse(value, fallback) {
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function createMemoryStorage() {
    const memory = new Map();

    return {
        getItem(key) {
            return memory.has(key) ? memory.get(key) : null;
        },
        setItem(key, value) {
            memory.set(key, String(value));
        },
        removeItem(key) {
            memory.delete(key);
        }
    };
}

function createSafeStorage(candidateStorage) {
    const fallbackStorage = createMemoryStorage();
    let usingFallback = false;

    try {
        if (!candidateStorage) {
            usingFallback = true;
            return fallbackStorage;
        }

        candidateStorage.setItem(STORAGE_TEST_KEY, '1');
        candidateStorage.removeItem(STORAGE_TEST_KEY);

        return {
            getItem(key) {
                if (usingFallback) {
                    return fallbackStorage.getItem(key);
                }

                try {
                    return candidateStorage.getItem(key);
                } catch {
                    usingFallback = true;
                    return fallbackStorage.getItem(key);
                }
            },
            setItem(key, value) {
                if (usingFallback) {
                    fallbackStorage.setItem(key, value);
                    return;
                }

                try {
                    candidateStorage.setItem(key, value);
                } catch {
                    usingFallback = true;
                    fallbackStorage.setItem(key, value);
                }
            },
            removeItem(key) {
                if (usingFallback) {
                    fallbackStorage.removeItem(key);
                    return;
                }

                try {
                    candidateStorage.removeItem(key);
                } catch {
                    usingFallback = true;
                    fallbackStorage.removeItem(key);
                }
            }
        };
    } catch {
        return fallbackStorage;
    }
}

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeLegacyItem(item) {
    if (!isObject(item)) {
        return null;
    }

    const rawDeityId = item.id || item.deityId;
    if (typeof rawDeityId !== 'string' || rawDeityId.trim().length === 0) {
        return null;
    }

    const rawCollectedAt = item.collectedAt || item.firstCollectedAt || item.lastScannedAt;
    const collectedAt = typeof rawCollectedAt === 'string' && rawCollectedAt.trim().length > 0
        ? rawCollectedAt
        : new Date().toISOString();

    return {
        deityId: rawDeityId.trim(),
        firstCollectedAt: collectedAt,
        lastScannedAt: collectedAt,
        scanCountLocal: 1
    };
}

export class CollectionStore {
    constructor(storage) {
        let candidateStorage = storage;

        if (!candidateStorage && typeof window !== 'undefined') {
            try {
                candidateStorage = window.localStorage;
            } catch {
                candidateStorage = null;
            }
        }

        this.storage = createSafeStorage(candidateStorage);
        this.migrateLegacyCollection();
    }

    getCollection() {
        const stored = safeParse(this.storage.getItem(STORAGE_KEY), null);
        if (!isObject(stored) || stored.schemaVersion !== SCHEMA_VERSION || !Array.isArray(stored.items)) {
            return emptyCollection();
        }

        return {
            schemaVersion: SCHEMA_VERSION,
            items: stored.items.filter(item => {
                return isObject(item) && typeof item.deityId === 'string' && item.deityId.trim().length > 0;
            })
        };
    }

    getItems() {
        return this.getCollection().items;
    }

    addOrUpdate({ deityId, scannedAt = new Date().toISOString() }) {
        if (typeof deityId !== 'string' || deityId.trim().length === 0) {
            return this.getCollection();
        }

        const collection = this.getCollection();
        const normalizedDeityId = deityId.trim();
        const existing = collection.items.find(item => item.deityId === normalizedDeityId);

        if (existing) {
            existing.lastScannedAt = scannedAt;
            existing.scanCountLocal = (Number(existing.scanCountLocal) || 1) + 1;
        } else {
            collection.items.push({
                deityId: normalizedDeityId,
                firstCollectedAt: scannedAt,
                lastScannedAt: scannedAt,
                scanCountLocal: 1
            });
        }

        this.save(collection);
        return collection;
    }

    clear() {
        this.storage.removeItem(STORAGE_KEY);
        this.storage.removeItem(LEGACY_STORAGE_KEY);
    }

    save(collection) {
        this.storage.setItem(STORAGE_KEY, JSON.stringify(collection));
    }

    migrateLegacyCollection() {
        if (this.storage.getItem(STORAGE_KEY)) return;

        const legacyItems = safeParse(this.storage.getItem(LEGACY_STORAGE_KEY), null);
        if (!Array.isArray(legacyItems)) return;

        const migrated = emptyCollection();
        for (const legacyItem of legacyItems) {
            const item = normalizeLegacyItem(legacyItem);
            if (!item || migrated.items.find(existing => existing.deityId === item.deityId)) {
                continue;
            }

            migrated.items.push(item);
        }

        this.save(migrated);
    }
}
