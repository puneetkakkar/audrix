module.exports = {
    attributes: {
        username: {
            type: 'string',
            // required: true,
            unique: false
        },
        trackId: {
            type: 'string',
            required: true,
        },
        play_count: {
            type: 'integer',
            required: false
        },
        likes: {
            type: 'integer',
            required: false
        },
        lastPlayed: {
            type: 'integer',
            required: false
        }
    }
};