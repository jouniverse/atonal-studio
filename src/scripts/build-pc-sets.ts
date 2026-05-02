import { parse } from 'csv-parse/sync';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface RawRow {
  'Forte no.': string;
  'Prime form': string;
  'Interval vector': string;
  'Carter no.': string;
  'Possible spacings': string;
  Complement: string;
}

function parsePrimeForm(str: string): number[] {
  const cleaned = str.replace(/[\[\](){}]/g, '').trim();
  if (!cleaned) return [];
  return cleaned.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
}

function parseIcv(str: string): number[] {
  const match = str.match(/<([^>]+)>/);
  if (!match) return [0, 0, 0, 0, 0, 0];
  return match[1].split(',').map((s) => parseInt(s.trim(), 10));
}

const csvPath = resolve(__dirname, '../../notes/pc-sets-full.csv');
const outPath = resolve(__dirname, '../data/pc-sets.json');

const csv = readFileSync(csvPath, 'utf-8');
const rows: RawRow[] = parse(csv, { columns: true, skip_empty_lines: true });

const sets = rows.map((row) => ({
  forte: row['Forte no.'].trim(),
  primeForm: parsePrimeForm(row['Prime form']),
  icv: parseIcv(row['Interval vector']),
  complement: row['Complement']?.trim() || '',
  carter: row['Carter no.'] ? parseInt(row['Carter no.'], 10) : undefined,
  cardinality: parsePrimeForm(row['Prime form']).length,
  name: row['Possible spacings']?.trim() || undefined,
}));

const output = {
  generatedAt: new Date().toISOString(),
  count: sets.length,
  sets,
};

writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`Built ${sets.length} pc-sets → ${outPath}`);
