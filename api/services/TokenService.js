var jwt = require('jwt-simple');
var bcrypt = require('bcrypt');
var secret = sails.config.TOKEN_SECRET;

module.exports = {
	createJWT: function(username, expiry) {
	    expiry = typeof expiry !== 'undefined' ? expiry : 86400;//1 Day token by default
	    var epoch = (new Date()).getTime();
	    var payload = {username:username, created:epoch , expiry:expiry*1};
	    var token = jwt.encode(payload, secret);
	    return token;
	},
	getTokenPayload : function( token ) {
		console.log("getPayloadToken" - token);
		if( token = ' ' || (typeof token === 'undefined') ) {
			return null;
		}

		var epoch = (new Date()).getTime();
		var payload = jwt.decode( token, secret );
		// console.log(payload.expiry);
		// console.log(epoch - payload.created);
		if( payload ) {
			if( payload.expiry >= ( epoch - payload.created ) ) {
				return payload;
			}
		}
		return null;
	},
	isTokenValidWithUsername : function( username, token, response ) {
		var status = false;
		var epoch = (new Date()).getTime();
		var payload = jwt.decode( token, secret );

		if( payload ) {
			if( payload.username === username ) {
				if( payload.expiry >= ( epoch - payload.created ) ) {
					status = true;
					response.payload = payload;
				}
				else {
					response.message = 'Expired Token';
				}
			}
			else {
				response.message = 'Invalid Token, payload mismatch';
			}
		}
		else {
			response.message = 'Invalid Token';
		}
		response.status = status;
		return response.status;
	},
	isTokenValid : function( token) {
		var status = false;
		var message = ' ';
		if( token === 'null' || (typeof token === 'undefined')) {
			return status = false;
		}
		var epoch = (new Date()).getTime();
		var payload = jwt.decode( token, secret );
		if( payload ) {
			if( payload.expiry >= ( epoch - payload.created ) ) {
				status = true;
			}
			else {
				status = false;
				message = 'Expired Token';
			}
		}
		else {
			status = false;
			message = 'Invalid Token';
		}
		return ({
			status: status,
			payload: payload
		});;
	}
};
