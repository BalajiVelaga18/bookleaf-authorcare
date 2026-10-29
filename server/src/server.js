import app from './app.js';
import { connectDatabase } from './config/database.js';
import { config, validateConfig } from './config/index.js';

async function startServer() {
  try {
    validateConfig();
    await connectDatabase();
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port} in ${config.env} mode`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
