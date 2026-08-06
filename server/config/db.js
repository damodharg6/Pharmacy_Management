var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

var mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/pharmacyManagementDB';

var connection = mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

module.exports = connection;