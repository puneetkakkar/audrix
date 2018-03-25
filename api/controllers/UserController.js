'use strict'

const _ = require("lodash");

module.exports = {

	getUserInfo: (req, res) => {
		if (!req.header('Authorization')) {
			return res.status(401).send({
				message: 'Please make sure your request has an Authorization header'
			});
		}
		let username = '';
		let credentials = req.header('Authorization').split(' ');
		if (!_.isEmpty(credentials[1])) {
			username = credentials[1];

			if (_.isEmpty(username)) {
				return res.status(401).send({
					message: 'Please make sure your request has an username'
				});
			}
		} else {
			return res.status(401).send({
				message: 'Please make sure your request has an Authorization header'
			});
		}

		User.find({
			username: username
		}).exec( (err, user) => {
			const userInfo = user[0];
			return res.status(200).send({
				status: true,
				user: userInfo
			});
		})
	}

};
