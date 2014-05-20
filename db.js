var mongojs = require('mongojs')

var db = mongojs('oauth2orize_authorization_grant_example')

exports.db = function() {
    return db
}
