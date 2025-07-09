const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = {
  connect: async (callback) => {
    try {
      const connection = await pool.getConnection();
      console.log('Connected to MySQL database');
      connection.release();
      callback(null);
    } catch (err) {
      callback(err);
    }
  },
  query: async (sql, params) => {
    const [rows] = await pool.query(sql, params);
    return rows;
  },
  execute: async (sql, params) => {
    const [result] = await pool.execute(sql, params);
    return result;
  }
};
