import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logAudit } from '../../src/services/auditLogger.service.js';
import AuditLog from '../../src/models/AuditLog.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../../src');

describe('auditLogger.service', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('persists a complete AuditLog document with correct fields', async () => {
    const mockCreated = {
      _id: 'audit_doc_123',
      timestamp: new Date('2026-08-30T10:00:00Z'),
      customer_id: 'cust_01',
      payment_id: 'pay_01',
      cause: 'insufficient_funds',
      confidence: 0.95,
      policy: 'delayed_retry',
      action: 'delayed_retry',
      channel: 'sms',
      attempt_number: 1,
      outcome: 'paid_immediately',
      reason: 'Standard recovery policy applied',
      stopping_rule_status: 'allowed',
      toObject: function () {
        return { ...this };
      },
    };

    jest.spyOn(AuditLog, 'create').mockResolvedValue(mockCreated);

    const result = await logAudit({
      customer_id: 'cust_01',
      payment_id: 'pay_01',
      cause: 'insufficient_funds',
      confidence: 0.95,
      policy: 'delayed_retry',
      action: 'delayed_retry',
      channel: 'sms',
      attempt_number: 1,
      outcome: 'paid_immediately',
      reason: 'Standard recovery policy applied',
      stopping_rule_status: 'allowed',
    });

    expect(result._id).toBe('audit_doc_123');
    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: 'cust_01',
        payment_id: 'pay_01',
        cause: 'insufficient_funds',
        confidence: 0.95,
        action: 'delayed_retry',
        channel: 'sms',
        outcome: 'paid_immediately',
        stopping_rule_status: 'allowed',
      })
    );
  });

  it('ASSERTION INVARIANT: AuditLog.create is ONLY ever called from auditLogger.service.js in entire codebase', () => {
    function getAllFiles(dir, fileList = []) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
          getAllFiles(filePath, fileList);
        } else if (file.endsWith('.js')) {
          fileList.push(filePath);
        }
      }
      return fileList;
    }

    const allSrcFiles = getAllFiles(srcDir);
    const violatingFiles = [];

    for (const filePath of allSrcFiles) {
      const relativePath = path.relative(srcDir, filePath).replace(/\\/g, '/');
      if (relativePath === 'services/auditLogger.service.js') {
        continue; // This is the designated single writer
      }

      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('AuditLog.create') || content.includes('new AuditLog(')) {
        violatingFiles.push(relativePath);
      }
    }

    expect(violatingFiles).toEqual([]);
  });
});
