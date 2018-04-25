var passport = require('passport'),
LocalStrategy = require('passport-local').Strategy,
FacebookStrategy = require('passport-facebook').Strategy,
bcrypt = require('bcryptjs');

function findById(id, fn) {
  User.findOne(id).done(function (err, user) {
    if (err) {
      return fn(null, null);
    } else {
      return fn(null, user);
    }
  });
}

function findByUsername(u, fn) {
  User.findOne({
    username: u
  }).exec(function (err, user) {
    if (err) {
      return fn(null, null);

    } else {
      return fn(null, user);
    }
  });
}

// Passport session setup.
// To support persistent login sessions, Passport needs to be able to
// serialize users into and deserialize users out of the session. Typically,
// this will be as simple as storing the user ID when serializing, and finding
// the user by ID when deserializing.
passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  findById(id, function (err, user) {
    done(err, user);
  });
});

// Use the LocalStrategy within Passport.
// Strategies in passport require a `verify` function, which accept
// credentials (in this case, a username and password), and invoke a callback
// with a user object.

passport.use(new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password'
},
function(username, password, done) {
  findByUsername(username, function (err, user) {
    if (err)
      return done(null, err);
    if (!user) {
      return done(null, false, {
        message: 'Unknown user ' + username
      });
    }
    bcrypt.compare(password, user.password, function (err, res) {
      if (!res)
        return done(null, false, {
          message: 'Invalid Password'
        });
      var returnUser = {
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        id: user.id
      };
      return done(null, returnUser, {
        message: 'Logged In Successfully'
      });
    });
  })
}
));

passport.use(new FacebookStrategy({
    clientID: '878487939005131',
    clientSecret: 'ab65e40c3802e0ca8d40d7c7942e8d7e',
    callbackURL: "http://localhost:1337/v1/auth/facebook"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log('hello');
    User.find({ email: profile.email }, function (err, user) {
      if(err)
        console.log('err');
      else
        console.log(user);
      return cb(err, user);
    });
  }
));

module.exports = {
    http: {
        customMiddleware: function(app) {
            app.use( passport.initialize() );
            app.use( passport.session() );
        }
    }
};















// passport.use(new LocalStrategy(
//   function (username, password, done) {
//     // asynchronous verification, for effect...
//     process.nextTick(function () {
//       // Find the user by username. If there is no user with the given
//       // username, or the password is not correct, set the user to `false` to
//       // indicate failure and set a flash message. Otherwise, return the
//       // authenticated `user`.
//       findByUsername(username, function (err, user) {
//         if (err)
//           return done(null, err);
//         if (!user) {
//           return done(null, false, {
//             message: 'Unknown user ' + username
//           });
//         }
//         bcrypt.compare(password, user.password, function (err, res) {
//           if (!res)
//             return done(null, false, {
//               message: 'Invalid Password'
//             });
//           var returnUser = {
//             username: user.username,
//             createdAt: user.createdAt,
//             id: user.id
//           };
//           return done(null, returnUser, {
//             message: 'Logged In Successfully'
//           });
//         });
//       })
//     });
//   }
// ));
