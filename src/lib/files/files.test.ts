import { describe, expect, it } from 'vitest';
import { fileSize, kindOf, problemWith } from './files';

const f = (name: string, size = 10) => ({ name, size }) as File;

describe('files', () => {
  it('knows which files Jack can read', () => {
    expect(['a.pdf', 'b.DOCX', 'c.xlsx', 'd.csv', 'e.md', 'f.png'].map(kindOf)).toEqual([
      'pdf',
      'word',
      'sheet',
      'sheet',
      'text',
      'image',
    ]);
    expect(kindOf('setup.exe')).toBeNull();
  });

  it('explains problems before uploading', () => {
    expect(problemWith(f('old.doc'))).toMatch(/\.docx or PDF/);
    expect(problemWith(f('old.xls'))).toMatch(/\.xlsx or CSV/);
    expect(problemWith(f('app.exe'))).toMatch(/only PDF, Word/);
    expect(problemWith(f('empty.txt', 0))).toMatch(/empty/);
    expect(problemWith(f('big.pdf', 21 * 1024 * 1024))).toMatch(/too large \(21\.0 MB\)/);
    expect(problemWith(f('ok.pdf'))).toBeNull();
  });

  it('shows sizes plainly', () => {
    expect([500, 2048, 3 * 1024 * 1024].map(fileSize)).toEqual(['500 B', '2 KB', '3.0 MB']);
  });
});
