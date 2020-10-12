const MongoClient = require( 'mongodb' ).MongoClient;
var mongoConfig = require(__dirname + '/mongo.config.js');
const url = mongoConfig.MongoStr;

var _db;

module.exports = {

  connectToServer: function( callback ) {
    MongoClient.connect( url,  { useNewUrlParser: true }, function( err, client ) {
      _db  = client.db('local');
      return callback( err );
    } );
  },

  getDb: function() {
    return _db;
  }
};