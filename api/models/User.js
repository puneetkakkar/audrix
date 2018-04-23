module.exports = {
    attributes: {
        firstname: {
            type: 'string',
            required: false
        },
        lastname: {
            type: 'string',
            required: false
        },
        email: {
            type: 'string',
            required: true,
            unique: true
        },
        username: {
            type: 'string',
            required: true,
            unique: true
        },
        password: {
            type: 'string',
            // required: true
        },
        googleId: {
            type: 'string',
            unique: true
        },
        facebookId: {
            type: 'string',
            unique: true
        },
        fbUsername: {
            type: 'string',
            unique: true
        },
        fbAccessToken: {
            type: 'string',
            unique: true
        },                                                                                                                                                                                      
        toJSON: function() {
            var obj = this.toObject();
            delete obj.password;
            return obj;
        }
    },
};
