const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test database connection
pool
  .connect()
  .then((client) => {
    console.log("✅ Connected to Neon PostgreSQL");
    client.release();
  })
  .catch((error) => {
    console.error(
      "❌ Database connection error:",
      error.message
    );
  });

module.exports = pool;
