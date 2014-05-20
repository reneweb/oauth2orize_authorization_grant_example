var oauth2orize = require('oauth2orize')
    , passport = require('passport')
    , db = require('./db').db()
    , crypto = require('crypto')
    , utils = require("./utils")
    , bcrypt = require('bcrypt')

// create OAuth 2.0 server
var server = oauth2orize.createServer();

//(De-)Serialization for clients
server.serializeClient(function(client, done) {
    return done(null, client.id)
})

server.deserializeClient(function(id, done) {
    db.collection('clients').find(id, function(err, client) {
        if (err) return done(err)
        return done(null, client)
    })
})

//Register grant (used to issue authorization codes)
server.grant(oauth2orize.grant.code(function(client, redirectURI, user, ares, done) {
    var code = utils.uid(16)
    var codeHash = crypto.createHash('sha1').update(code).digest('hex')
    
    db.collection('authorizationCodes').save({code: codeHash, clientId: client._id, redirectURI: redirectURI, userId: user.username}, function(err) {
        if (err) return done(err)
        done(null, code)
    })
}))

//Used to exchange authorization codes for access token
server.exchange(oauth2orize.exchange.code(function (client, code, redirectURI, done) {
    db.collection('authorizationCodes').findOne({code: code}, function (err, authCode) {
        if (err) return done(err)
        if (!authCode) return done(null, false)
        if (client._id !== authCode.clienclientIdtID) return done(null, false)
        if (redirectURI !== authCode.redirectURI) return done(null, false)
        
        db.collection('authorizationCodes').delete({code: code}, function(err) {
            if(err) return done(err)
            var token = utils.uid(256)
            var tokenHash = crypto.createHash('sha1').update(token).digest('hex')
            
            var expirationDate = new Date(new Date().getTime() + (3600 * 1000))
            
            db.collection('accessTokens').save({token: tokenHash, expirationDate: expirationDate, userId: authCode.userId, clientId: authCode.clientId}, function(err) {
                if (err) return done(err)
                done(null, token)
            })
        })
    })
}))

//Refresh Token
server.exchange(oauth2orize.exchange.refreshToken(function (client, refreshToken, scope, done) {
    var refreshTokenHash = crypto.createHash('sha1').update(refreshToken).digest('hex')
    
    db.collection('accessTokens').findOne({refreshToken: refreshTokenHash}, function (err, token) {
        if (err) return done(err)
        if (!token) return done(null, false)
        if (client.username !== token.clientID) return done(null, false)
        
        var newAccessToken = utils.uid(256)
        var accessTokenHash = crypto.createHash('sha1').update(newAccessToken).digest('hex')
        
        var expirationDate = new Date(new Date().getTime() + (3600 * 1000))
    
        db.collection('accessTokens').update({refreshToken: refreshTokenHash}, {$set: {token: accessTokenHash, scope: scope, expirationDate: expirationDate}}, function (err) {
            if (err) return done(err)
            done(null, newAccessToken, refreshToken, {expires_in: expirationDate});
        })
    })
}))

// user authorization endpoint
exports.authorization = [
  function(req, res, next) {
    if (req.user) next()
    else res.redirect('/login')
  },
  server.authorization(function(clientId, redirectURI, done) {
    db.collection('clients').findOne({clientId: clientId}, function(err, client) {
      if (err) return done(err)
      // WARNING: For security purposes, it is highly advisable to check that
      // redirectURI provided by the client matches one registered with
      // the server. For simplicity, this example does not. You have
      // been warned.
      return done(null, client, redirectURI)
    })
  }),
  function(req, res) {
    res.render('decision', { transactionID: req.oauth2.transactionID, user: req.user, client: req.oauth2.client });
  }
]

// user decision endpoint

exports.decision = [
  function(req, res, next) {
    if (req.user) next()
    else res.redirect('/login')
  },
  server.decision()
]

// token endpoint
exports.token = [
    passport.authenticate(['clientBasic', 'clientPassword'], { session: false }),
    server.token(),
    server.errorHandler()
]

