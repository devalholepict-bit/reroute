import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test_db';
process.env.PORT = process.env.PORT || '3001';
process.env.NODE_ENV = 'test';
