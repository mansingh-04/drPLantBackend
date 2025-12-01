const axios = require('axios');

// Get URL from command line args or environment variable
// Default to localhost for testing if not provided
const TARGET_URL = process.argv[2] || process.env.SERVER_URL || 'http://localhost:3000/health';

const INTERVAL_MINUTES = 14;
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;

console.log(`Starting uptime bot...`);
console.log(`Target: ${TARGET_URL}`);
console.log(`Interval: ${INTERVAL_MINUTES} minutes`);

const pingServer = async () => {
  try {
    const response = await axios.get(TARGET_URL);
    console.log(`[${new Date().toISOString()}] Ping successful: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Ping failed: ${error.message}`);
  }
};

// Initial ping
pingServer();

// Schedule periodic pings
setInterval(pingServer, INTERVAL_MS);
