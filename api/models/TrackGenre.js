module.exports = {
    attributes: {
        trackId: {
            type: 'string',
            required: true,
            unique: true,
            primaryKey: true
        },
        genre: {
            type: 'string',
            required: false
        }
    }
};