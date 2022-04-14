import { Client, Pool } from 'pg';

import 'dotenv';

export default class DataBase {
  prod = false;

  connectedDataBase() {
    if (this.prod) {
      const pool = new Pool({
        connectionString: process.env.DATA_BASE_URL,
        ssl: {
          rejectUnauthorized: false,
        },
      });
      return pool;
    } else {
      const client = new Client({
        user: process.env.PQ_USER,
        host: process.env.PQ_HOST,
        database: process.env.PQ_DB,
        password: process.env.PQ_PASSWORD,
        port: Number(process.env.PQ_PORT),
      });
      client.connect();
      return client;
    }
  }
}
