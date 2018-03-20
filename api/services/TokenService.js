var jwt = require('jwt-simple');
var bcrypt = require('bcryptjs');
var secret = sails.config.TOKEN_SECRET;

module.exports = {
	createJWT: (username, expiry) => {
	    expiry = typeof expiry !== 'undefined' ? expiry : 86400;//1 Day token by default
	    let epoch = (new Date()).getTime();
	    let payload = {username:username, created:epoch , expiry:expiry*1};
	    let token = jwt.encode(payload, secret);
	    return token;
	},
	getTokenPayload : ( token ) => {
		console.log("getPayloadToken" - token);
		if( token = ' ' || (typeof token === 'undefined') ) {
			return null;
		}

		let epoch = (new Date()).getTime();
		let payload = jwt.decode( token, secret );
		// console.log(payload.expiry);
		// console.log(epoch - payload.created);
		if( payload ) {
			if( payload.expiry >= ( epoch - payload.created ) ) {
				return payload;
			}
		}
		return null;
	},
	isTokenValidWithUsername : ( username, token, response ) => {
		let status = false;
		let epoch = (new Date()).getTime();
		let payload = jwt.decode( token, secret );

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
	isTokenValid : ( token) => {
		let status = false;
		let message = ' ';
		if( token === 'null' || (typeof token === 'undefined')) {
			return status = false;
		}
		let epoch = (new Date()).getTime();
		let payload = jwt.decode( token, secret );
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
