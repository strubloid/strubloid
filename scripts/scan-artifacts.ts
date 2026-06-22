/**
 * Artifact Scanner
 *
 * Scans source files for generated-artifact patterns that indicate
 * incomplete, broken, or placeholder code.
 *
 * Usage: npm run scan:artifacts
 */

// scan-artifact-allow-self: this file is the scanner itself — see SUSPICIOUS_PATTERNS below.

import * as fs from 'fs';
import * as path from 'path';

const IGNORE_DIRS = ['node_modules', '.next', 'coverage', '.git', '__pycache__'];
const SCAN_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.py', '.sh'];

const SUSPICIOUS_PATTERNS: { pattern: RegExp; message: string }[] = [
  { pattern: /TODO:\s*implement\s*later/i, message: 'TODO implement later' },
  { pattern: /throw\s+new\s+Error\s*\(\s*["']Not\s+implemented/i, message: 'Not implemented throw' },
  { pattern: /<<<<<<</, message: 'Git conflict marker (<<<<<<)' },
  { pattern: /=======/, message: 'Git conflict marker (=======)' },
  { pattern: />>>>>>>/, message: 'Git conflict marker (>>>>>>>)' },
  { pattern: /undefined\s+undefined/, message: 'undefined undefined' },
  { pattern: /null\s+null/, message: 'null null' },
  { pattern: /\bNaN\b/, message: 'NaN value' },
  { pattern: /\bAI_ERROR\b/, message: 'AI_ERROR marker' },
  { pattern: /\bMODEL_ERROR\b/, message: 'MODEL_ERROR marker' },
  { pattern: /^I cannot/i, message: 'I cannot... (AI response leak)' },
  { pattern: /^As an AI/i, message: 'As an AI... (AI response leak)' },
  { pattern: /(?:^|\s)placeholder\s+(?:text|content|value|data)\b/i, message: 'placeholder text' },
  { pattern: /\b(?:placeholder\s+(?:implementation|todo)|TODO\s+placeholder)/i, message: 'placeholder TODO' },
  { pattern: /mock\s+response/i, message: 'mock response' },
];

const TEST_PATTERNS: RegExp[] = [
  /\.(test|spec)\.(ts|tsx|js|jsx)$/,
  /[._]mock\./,
  /[._]fixture\./,
  /__tests__/,
  /\/tests\//,
];

function isTestFile(filePath: string): boolean {
  return TEST_PATTERNS.some((p) => p.test(filePath));
}

function shouldIgnoreFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return IGNORE_DIRS.some((dir) => normalized.includes(`/${dir}/`) || normalized.endsWith(`/${dir}`));
}

function isScannableExt(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return SCAN_EXTS.includes(ext);
}

function scanFile(filePath: string): { line: number; col: number; pattern: string; message: string }[] {
  const findings: { line: number; col: number; pattern: string; message: string }[] = [];
  
  try {
    // Skip binary files
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) return findings;
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { pattern, message } of SUSPICIOUS_PATTERNS) {
        // Special handling for mock response - allow in test files
        if (message.includes('mock response') && isTestFile(filePath)) {
          continue;
        }
        
        const match = line.match(pattern);
        if (match) {
          findings.push({
            line: i + 1,
            col: line.indexOf(match[0]) + 1,
            pattern: match[0],
            message,
          });
        }
      }
    }
  } catch (err) {
    // Skip files we can't read (permission issues, binary, etc.)
  }
  
  return findings;
}

function scanDirectory(dir: string, allFindings: { file: string; findings: { line: number; col: number; pattern: string; message: string }[] }[], selfFile?: string): void {
  if (shouldIgnoreFile(dir)) return;
  // Avoid self-detection: scanner-reporting files contain all literal
  // patterns by definition. Skip files that explicitly opt in with a
  // `// scan-artifact-allow-self` directive AND skip the scanner source itself.
  const skipFiles = new Set<string>();
  if (selfFile) skipFiles.add(selfFile);
  // Also skip any file that opts in via the directive
  for (const f of findSelfOptInFiles(dir)) {
    skipFiles.add(f);
  }

  let entries: string[] = [];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);

    if (shouldIgnoreFile(fullPath)) continue;
    if (skipFiles.has(fullPath)) continue;

    try {
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath, allFindings, selfFile);
      } else if (stat.isFile() && isScannableExt(fullPath)) {
        const findings = scanFile(fullPath);
        if (findings.length > 0) {
          allFindings.push({ file: fullPath, findings });
        }
      }
    } catch {
      // Skip files we can't stat
    }
  }
}

function findSelfOptInFiles(dir: string): string[] {
  // Walk dir shallowly. The scanner is the only realistic place we
  // intentionally embed the literal pattern names, so we follow any file
  // marked with the directive.
  const allowSelfDirective = 'scan-artifact-allow-self';
  const out: string[] = [];
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    try {
      const stat = fs.statSync(full);
      if (!stat.isFile()) continue;
      const head = fs.readFileSync(full, 'utf-8').slice(0, 4096);
      if (head.includes(allowSelfDirective)) out.push(full);
    } catch {
      // skip
    }
  }
  return out;
}

function main() {
  const rootDir = path.resolve(process.cwd(), 'src');
  const scriptsDir = path.resolve(process.cwd(), 'scripts');
  
  console.log('[scan:artifacts] Scanning for generated artifacts...');
  console.log(`[scan:artifacts] Root: ${rootDir}`);
  
  const allFindings: { file: string; findings: { line: number; col: number; pattern: string; message: string }[] }[] = [];
  
  if (fs.existsSync(rootDir)) {
    scanDirectory(rootDir, allFindings);
  }

  if (fs.existsSync(scriptsDir)) {
    // Skip the scanner itself to avoid self-detection. tsx sets both
    // __filename (CJS) and import.meta.url (ESM); fall back to resolved path.
    const selfFile =
      typeof __filename !== 'undefined'
        ? __filename
        : path.resolve(scriptsDir, 'scan-artifacts.ts');
    scanDirectory(scriptsDir, allFindings, selfFile);
  }
  
  if (allFindings.length > 0) {
    console.error('\n[scan:artifacts] FOUND SUSPICIOUS CONTENT:\n');
    
    for (const { file, findings } of allFindings) {
      console.error(`  ${file}:`);
      for (const f of findings) {
        console.error(`    Line ${f.line}:${f.col} - ${f.message}`);
        console.error(`      Found: ${f.pattern}`);
      }
      console.error();
    }
    
    console.error(`[scan:artifacts] FAILED - Found ${allFindings.reduce((a, f) => a + f.findings.length, 0)} artifact(s) in ${allFindings.length} file(s)`);
    process.exit(1);
  }
  
  console.log('[scan:artifacts] PASSED - No artifacts found');
  process.exit(0);
}

main();
