const fs = require('node:fs/promises');
const path = require('node:path');

const defaultEventLogPath = path.join(__dirname, 'data', 'event-log.json');

class EventStore {
    constructor(filePath = process.env.EVENT_LOG_PATH || defaultEventLogPath) {
        this.filePath = filePath;
        this.writeQueue = Promise.resolve();
    }

    async ensureStore() {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });

        try {
            await fs.access(this.filePath);
        } catch {
            await fs.writeFile(this.filePath, '[]\n', 'utf8');
        }
    }

    async readAll() {
        await this.ensureStore();

        try {
            const raw = await fs.readFile(this.filePath, 'utf8');
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    async append(event) {
        const appendOperation = this.writeQueue.catch(() => {}).then(async () => {
            const events = await this.readAll();
            events.push(event);
            await this.writeAll(events);
            return event;
        });

        this.writeQueue = appendOperation.catch(() => {});

        return appendOperation;
    }

    async writeAll(events) {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });

        const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
        const content = `${JSON.stringify(events, null, 2)}\n`;

        try {
            await fs.writeFile(tempPath, content, 'utf8');
            await fs.rename(tempPath, this.filePath);
        } catch (error) {
            try {
                await fs.unlink(tempPath);
            } catch {
                // Best-effort cleanup; keep the original write error intact.
            }

            throw error;
        }
    }
}

module.exports = {
    EventStore
};
