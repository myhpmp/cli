import { describe, it, expect } from 'vitest';
import { renderStatusLine, formatProjectPath } from '../../src/display/status-line.js';

// eslint-disable-next-line no-control-regex
const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');

describe('renderStatusLine', () => {
  const baseData = {
    username: 'Swift-Coder42' as string | null,
    level: 9,
    hpPercent: 89,
    resetMinutes: 210,
    mpPercent: 80,
    weeklyResetDays: 3,
    ctxPercent: 6,
    projectName: 'my-project',
    gitBranch: 'main*' as string | null,
  };

  it('renders Korean status line with project on first line', () => {
    const line = renderStatusLine(baseData, 'ko');
    const [first, second] = line.split('\n');
    expect(stripAnsi(first)).toBe('📂 my-project (main*)');
    expect(second).toContain('LV.9 Swift-Coder42');
    expect(second).toContain('❤️ 89%');
    expect(second).toContain('⏱️3h30m');
    expect(second).toContain('💙 80% ⏱️3일');
    expect(second).toContain('🧠 6%');
  });

  it('renders English status line', () => {
    const line = renderStatusLine(baseData, 'en');
    expect(line).toContain('LV.9 Swift-Coder42');
    expect(line).toContain('💙 80% ⏱️3d');
  });

  it('hides weekly reset days when 0', () => {
    const data = { ...baseData, weeklyResetDays: 0 };
    const line = renderStatusLine(data, 'ko');
    expect(line).toContain('💙 80%');
    expect(line).not.toMatch(/💙.*⏱️/);
  });

  it('hides git branch when null', () => {
    const data = { ...baseData, gitBranch: null };
    const line = renderStatusLine(data, 'ko');
    expect(stripAnsi(line)).toContain('📂 my-project');
    expect(stripAnsi(line)).not.toContain('(');
  });

  it('respects custom segment order', () => {
    const line = renderStatusLine(baseData, 'ko', ['project', 'hp']);
    expect(stripAnsi(line)).toBe('📂 my-project (main*)\n❤️ 89% ⏱️3h30m');
  });

  it('applies ANSI colors to project and branch', () => {
    const line = renderStatusLine(baseData, 'ko');
    const [first] = line.split('\n');
    expect(first).toContain('\x1b[1;96m');  // bold bright cyan for project
    expect(first).toContain('\x1b[1;93m');  // bold bright yellow for branch
    expect(first).toContain('\x1b[0m');     // reset
  });

  it('filters invalid segment keys', () => {
    const line = renderStatusLine(baseData, 'ko', ['hp', 'invalid' as never]);
    expect(line).toBe('❤️ 89% ⏱️3h30m');
  });
});

describe('formatProjectPath', () => {
  const home = '/home/user';

  it('shows ~ for home directory', () => {
    expect(formatProjectPath('/home/user', home)).toBe('~');
  });

  it('shows ~/folder for 1 level deep', () => {
    expect(formatProjectPath('/home/user/projects', home)).toBe('~/projects');
  });

  it('shows ~/parent/folder for 2 levels deep', () => {
    expect(formatProjectPath('/home/user/code/my-app', home)).toBe('~/code/my-app');
  });

  it('shows ~/…/parent/folder for 3+ levels deep', () => {
    expect(formatProjectPath('/home/user/code/repos/my-app', home)).toBe('~/…/repos/my-app');
  });

  it('shows ~/…/parent/folder for deeply nested paths', () => {
    expect(formatProjectPath('/home/user/a/b/c/d/project', home)).toBe('~/…/d/project');
  });

  it('shows basename for paths outside home', () => {
    expect(formatProjectPath('/opt/projects/my-app', home)).toBe('my-app');
  });

  it('normalizes Windows backslashes', () => {
    expect(formatProjectPath('C:\\Users\\Me\\code\\app', 'C:\\Users\\Me')).toBe('~/code/app');
  });
});
