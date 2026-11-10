
require("dotenv").config();

const { Pool } = require("pg");

// Create a connection pool for PostgreSQL
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
});

// Export the pool so other files can use it
module.exports = pool;
