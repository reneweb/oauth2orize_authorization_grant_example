//Module dependencies
var express = require('express')
    , http = require('http')
    , passport = require('passport')
    , util = require('util')
    , bodyParser = require('body-parser')
    , expressValidator = require('express-validator')
    , auth = require("./auth")
    , oauth = require("./oauth")
    , registration = require("./registration")

// Express configuration
var app = express()
app.set('views', __dirname + '/views')
app.set('view engine', 'jade')
app.use(bodyParser())
app.use(expressValidator())

app.use(passport.initialize())

app.get('/client/registration', function(req, res) { res.render('clientRegistration') })
app.post('/client/registration', function(req, res) { registration.registerClient })

app.get('/registration', function(req, res) { res.render('registration') })
app.post('/registration', registration.registerUser)

app.get('/login', function(req, res) { res.render('login') })
app.post('/login', passport.authenticate('local', { successReturnToOrRedirect: '/', failureRedirect: '/login' }))

app.post('/oauth/token', oauth.token)
app.get('/restricted', passport.authenticate('accessToken', { session: false }), function (req, res) {
    res.send("Yay, you successfully accessed the restricted resource!")
})

//Start
http.createServer(app).listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0")