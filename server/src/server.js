const env = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');

(async () => {
  try {
    await connectDB(env.mongoUri);
    app.listen(env.port, () => console.log(`BugBoard API running on http://localhost:${env.port}`));
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
})();
