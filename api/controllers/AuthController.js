'use strict'

var _ = require("lodash");
var jwt = require('jwt-simple');
var bcrypt = require('bcrypt');
var passport = require('passport');
var querystring = require('querystring');
var request = require('request');

module.exports = {

	signup: function (req, res) {

		User.findOne({
			email: req.body.email
		}, function(err, existingUser) {
			if (existingUser) {
				return res.status(409).send({
					status:false,
					message: 'Email is already taken'
				});
			}

			User.findOne({
				username: req.body.username
			}, function(err,userUsed) {
				if (userUsed) {
					return res.status(409).send({
						status:false,
						message: 'Username is already taken'
					});
				}
				const saltRounds = 10;
				bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
					if(err) {
						hash = req.body.password;
					}
					var cred = {
						email: req.body.email,
						username:req.body.username,
						password: hash,
					};

					User.create(cred).exec(function(err, result) {
						if (err) {
							return res.status(500).send({
								status:false,
								message: err.message
							});
						}
						return res.status(200).send({
							status:true,
							message: "Account Created Successfully"
						});
					});
				});
			});
		});
	},

	signin: function(req, res){
		if (!req.header('Authorization')) {
			return res.status(401).send({ message: 'Please make sure your request has an Authorization header' });
		}
		var username = '';
		var pwd = '';
		var credentials = req.header('Authorization').split(' ');
		if( !_.isEmpty( credentials[1]) ) {
			username = credentials[1].split(':')[0];
			pwd   = credentials[1].split(':')[1];

			if( _.isEmpty(username) || _.isEmpty(pwd) ) {
				return res.status(401).send({ message: 'Please make sure your request has an Authorization header' });
			}
		}
		else {
			return res.status(401).send({ message: 'Please make sure your request has an Authorization header' });
		}
		req.body = {
			username: username,
			password: pwd
		};
		passport.authenticate('local', function(err, user, info) {
			if ((err) || (!user)) {
				return res.send({
					message: 'login failed'
				});
				res.send(err);
			}
			req.logIn(user, function(err) {
				if (err) res.send(err);
				return res.send({
					status: true,
					data :{
						username: user.username,
						email:user.email,
						token: TokenService.createJWT(user.username, 3600000),
						id: user.id
					}
				});
			});
		})(req, res);
	},
	logout: function (req,res){
		req.logout();
		res.send({
			status:true
		});
	},
	validateToken : function( req, res ) {
		var payload = UtilService.authorizeToken(req, res);
		if( payload !== null && payload !== false && payload !== ' ') {
			return res.status(200).send({ status:true });
		}
		else
			return res.status(200).send({ status:false, invalid: true });
	},
	facebook: function(req, res) {
		var fields = ['id', 'email', 'first_name', 'last_name', 'link', 'name'];
		var accessTokenUrl = 'https://graph.facebook.com/v2.5/oauth/access_token';
		var graphApiUrl = 'https://graph.facebook.com/v2.5/me?fields=' + fields.join(',');
		var params = {
			code: req.body.code,
			client_id: req.body.clientId,
			client_secret: sails.config.FACEBOOK_SECRET,
			redirect_uri: req.body.redirectUri
		};
        // Step 1. Exchange authorization code for access token.
        request.get({
        	url: accessTokenUrl,
        	qs: params,
        	json: true
        }, function(err, response, accessToken) {
        	if (response.statusCode !== 200) {
        		return res.status(500).send({
        			message: accessToken.error.message
        		});
        	}

            // Step 2. Retrieve profile information about the current user.
            request.get({
            	url: graphApiUrl,
            	qs: accessToken,
            	json: true
            }, function(err, response, profile) {
            	if (response.statusCode !== 200) {
            		return res.status(500).send({
            			message: profile.error.message
            		});
            	}
            	User.findOne({
            		facebookId: profile.id
            	}, function(err, existingUser) {
            		User.findOne({
            			email: profile.email
            		}).exec(function (err, existingUser) {
            			if(!existingUser){
            				var username = profile.email.split('@')[0];
            				var cred = {
            					firstname : profile.first_name,
            					lastname : profile.last_name,
            					email : profile.email,
            					username : username,
            					displayName: profile.name,
            					facebookId : profile.id
            				};

            				User.create(cred).exec(function (err, newUser) {
            					if(err) {
            						return (err);
            					} else {
            						var token = TokenService.createJWT(newUser.username, 3600000);
            						return res.status(200).send({
            							status:true,
            							token: token,
            							username: newUser.username,
            							email: newUser.email,
            							fbId: newUser.facebookId
            						});
            					}
            				});
            			} else {
            				existingUser.facebookId = profile.id;
							// existingUser.picture = 'https://graph.facebook.com/' + profile.id + '/picture?type=large';
							existingUser.displayName = profile.name;
							var newUsername = profile.email.split('@')[0];
							existingUser.username = newUsername;
							existingUser.save(function() {
								var token = TokenService.createJWT(existingUser.username, 3600000);
								return res.status(200).send({
									status:true,
									token: token,
									username: existingUser.username,
									email: existingUser.email,
									fbId: existingUser.facebookId
								});
							});
						}
					});
            	});
            });
        });
    },
};
