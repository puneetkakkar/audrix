module.exports = {
	
	authorizeToken:function(req, res) {
		try {		
			if (!req.header('Authorization')) {
				return res.status(401).send({ message: 'Please make sure your request has an Authorization header' });
			}
			var token = '';
			var credentials = req.header('Authorization').split(' ');
			if( !_.isEmpty( credentials[1]) ) {
				token = credentials[1];
			}
			else {
				return res.status(401).send({ message: 'Please make sure your request has correct Authorization header' });
			}
		} catch (err) {
			return null;
		}
		// console.log(token);
		return TokenService.isTokenValid(token);
	}
}