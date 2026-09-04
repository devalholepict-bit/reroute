import { describe, it, expect } from '@jest/globals';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envFilePath = path.resolve(__dirname, '../../src/config/env.js');

describe('Integration: Environment Config & Fast Fail', () => {
  it('fails fast with exit code 1 and lists missing variables when required env vars are unset', (done) => {
    // Run node on src/config/env.js with empty environment
    const nodeCmd = `node "${envFilePath}"`;
    exec(nodeCmd, { env: { PATH: process.env.PATH, SYSTEMROOT: process.env.SYSTEMROOT } }, (error, stdout, stderr) => {
      expect(error).not.toBeNull();
      expect(error.code).toBe(1);

      const combinedOutput = stdout + stderr;
      expect(combinedOutput).toContain('Missing required environment variables');
      expect(combinedOutput).toContain('MONGO_URI');
      expect(combinedOutput).toContain('PORT');
      done();
    });
  });
});
