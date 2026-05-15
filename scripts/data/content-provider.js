export class LocalContentProvider {
    constructor(config) {
        this.revealTextsByDeityId = new Map();

        for (const revealText of config.revealTexts) {
            if (!this.revealTextsByDeityId.has(revealText.deityId)) {
                this.revealTextsByDeityId.set(revealText.deityId, revealText);
            }
        }
    }

    async getRevealContent({ deity }) {
        const revealText = this.revealTextsByDeityId.get(deity.id);

        if (revealText) {
            return {
                deityId: deity.id,
                title: revealText.title,
                body: revealText.body,
                source: revealText.source || 'local',
                generatedAt: new Date().toISOString()
            };
        }

        return {
            deityId: deity.id,
            title: deity.displayName,
            body: 'Reveal text is not available yet.',
            source: 'fallback',
            generatedAt: new Date().toISOString()
        };
    }
}
