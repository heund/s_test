export class DeityAssignmentResolver {
    constructor(config) {
        this.eventDeityRules = config.eventDeityRules || [];
        this.deitiesById = new Map(config.deities.map(deity => [deity.id, deity]));
    }

    resolve(baseResolution) {
        if (baseResolution.status !== 'resolved') {
            return baseResolution;
        }

        const injectedDeityId = this.findInjectedDeityId(baseResolution);
        if (!injectedDeityId) {
            return baseResolution;
        }

        const injectedDeity = this.deitiesById.get(injectedDeityId);
        if (!injectedDeity) {
            return baseResolution;
        }

        return {
            ...baseResolution,
            deity: injectedDeity,
            assignmentSource: 'event-rule'
        };
    }

    findInjectedDeityId(baseResolution) {
        // Future event logic can activate rules from aggregate logs without changing scanner flow.
        const activeRule = this.eventDeityRules.find(rule => {
            return rule.active && rule.locationId === baseResolution.location.id && rule.injectedDeityId;
        });

        return activeRule ? activeRule.injectedDeityId : null;
    }
}
