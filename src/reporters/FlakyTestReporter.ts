import fs from 'node:fs';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

export interface FlakyRecord {
  testId: string;
  title: string;
  file: string;
  line: number;
  attemptsToPass: number;
  durationMs: number;
  timestamp: string;
  firstFailure: string;
}

/**
 * Records every test that failed and then passed on retry, and writes them to a JSON file.
 * It only reports. It does not skip or exclude tests; a real quarantine would need CI to act on this file.
 */
export default class FlakyTestReporter implements Reporter {
  private readonly records: FlakyRecord[] = [];
  private readonly outputPath: string;

  constructor(options: { outputFile?: string } = {}) {
    this.outputPath = path.resolve(process.cwd(), options.outputFile ?? 'reports/flaky-tests.json');
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status !== 'passed' || result.retry === 0) return;

    const failedAttempt = test.results.find(
      (r) => r.status === 'failed' || r.status === 'timedOut',
    );
    // Playwright colours its error messages; strip the terminal codes so the JSON stays readable.
    const message = stripVTControlCharacters(failedAttempt?.error?.message ?? 'unknown');

    this.records.push({
      testId: test.id,
      title: test.title,
      file: path.relative(process.cwd(), test.location.file),
      line: test.location.line,
      attemptsToPass: result.retry + 1,
      durationMs: result.duration,
      timestamp: new Date().toISOString(),
      firstFailure: message.split('\n')[0],
    });
  }

  onEnd(): void {
    if (this.records.length === 0) return;
    fs.mkdirSync(path.dirname(this.outputPath), { recursive: true });
    fs.writeFileSync(this.outputPath, JSON.stringify(this.records, null, 2), 'utf8');
    console.warn(
      `[flaky] ${this.records.length} test(s) passed only on retry -> ${this.outputPath}`,
    );
  }
}
