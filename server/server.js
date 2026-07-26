const app = require('./app');
const connectDB = require('./config/db');
const config = require('./config/env');

connectDB().then(() => {
  app.listen(config.port, () => {
    console.log(`PulseLink server running on port ${config.port}`);
  });
});