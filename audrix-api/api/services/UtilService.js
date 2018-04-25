const crypto = require("crypto");

module.exports = {

  authorizeToken: (req, res) => {
    try {
      if (!req.header('Authorization')) {
        return res.status(401).send({
          message: 'Please make sure your request has an Authorization header'
        });
      }
      var token = '';
      var credentials = req.header('Authorization').split(' ');
      if (!_.isEmpty(credentials[1])) {
        token = credentials[1];
      } else {
        return res.status(401).send({
          message: 'Please make sure your request has correct Authorization header'
        });
      }
    } catch (err) {
      return null;
    }
    // console.log(token);
    return TokenService.isTokenValid(token);
  },

  generateTrackID: () => {
    // let length = 12;
    // let timestamp = +new Date();

    // let ts = timestamp.toString();
    // let parts = ts.split("").reverse();
    // let id = "";

    // for (let i = 0; i < length; ++i) {
    //   let index = getRandomInt(0, parts.length - 1);
    //   id += parts[index];
    // }

    //  function getRandomInt(min, max) {
    //   return Math.floor(Math.random() * (max - min + 1)) + min;
    // }

    const id = crypto.randomBytes(16).toString("hex");

    return id;
  }
}
