const mongoose = require('mongoose');
const { MONGODB_URI } = require('./config');

let listenersRegistered = false;

const registerConnectionListeners = () => {
  if (listenersRegistered) {
    return;
  }

  listenersRegistered = true;

  mongoose.connection.on('error', (error) => {
    console.error('MongoDB erreur:', error.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB deconnecte');
  });
};

const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  registerConnectionListeners();

  await mongoose.connect(MONGODB_URI);

  console.log(
    `MongoDB connecte sur ${mongoose.connection.host}/${mongoose.connection.name}`
  );

  return mongoose.connection;
};

module.exports = {
  connectToDatabase,
};
