import fs from 'node:fs';
import path from 'node:path';
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

export interface QuarantineRecord {
  testId: string;
  title: string;
  file: string;
  line: number;
  totalAttempts: number;
  durationMs: number;
  classification: 'FLAKY_QUARANTINE';
  timestamp: string;
  failureReason?: string;
}

export default class QuarantineReporter implements Reporter {
  private quarantinedRecords: QuarantineRecord[] = [];
  private readonly targetPath: string;

  constructor(options: { outputFile?: string } = {}) {
    this.targetPath = options.outputFile
      ? path.resolve(process.cwd(), options.outputFile)
      : path.resolve(process.cwd(), 'flaky-tests.json');
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const wasFlaky = result.retry > 0 && result.status === 'passed';

    if (wasFlaky) {
      const priorFailure = test.results.find((r) => r.status === 'timedOut' || r.status === 'failed');

      const entry: QuarantineRecord = {
        testId: test.id,
        title: test.title,
        file: test.location.file,
        line: test.location.line,
        totalAttempts: result.retry + 1,
        durationMs: result.duration,
        classification: 'FLAKY_QUARANTINE',
        timestamp: new Date().toISOString(),
        failureReason: priorFailure?.error?.message || 'Intermittent run failure',
      };

      this.quarantinedRecords.push(entry);

      console.warn(
        `\x1b[33m[QUARANTINE ENGINE]\x1b[0m Isolation flagged: "${test.title}" passed on attempt #${result.retry + 1}. Stored in triage ledger.`
      );
    }
  }

  async onEnd(_result: FullResult): Promise<void> {
    if (this.quarantinedRecords.length === 0) {
      return;
    }

    let existingData: QuarantineRecord[] = [];
    if (fs.existsSync(this.targetPath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(this.targetPath, 'utf8'));
      } catch {
        existingData = [];
      }
    }

    const aggregated = [...existingData, ...this.quarantinedRecords];
    fs.mkdirSync(path.dirname(this.targetPath), { recursive: true });
    fs.writeFileSync(this.targetPath, JSON.stringify(aggregated, null, 2), 'utf8');
  }
}