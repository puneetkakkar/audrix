module.exports = {
    attributes: {
        trackId: {
            type: 'integer',
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