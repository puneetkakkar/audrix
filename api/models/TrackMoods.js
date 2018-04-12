module.exports = {
    attributes: {
        trackId: {
            type: 'string',
            required: true,
            unique: true,
            primaryKey: true
        },
        acoustic: {
            type: 'object',
            required: false
        },
        aggressive: {
            type: 'object',
            required: false
        },
        electronic: {
            type: 'object',
            required: false
        },
        happy: {
            type: 'object',
            required: false
        },
        party: {
            type: 'object',
            required: false
        },
        relaxed: {
            type: 'object',
            required: false
        },
        sad: {
            type: 'object',
            required: false
        },
    }
};