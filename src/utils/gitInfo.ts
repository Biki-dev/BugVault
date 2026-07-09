import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitInfo {
  branch: string | null;
  commit: string | null;
}

export async function getGitInfo(cwd: string): Promise<GitInfo> {
  if (!cwd) return { branch: null, commit: null };

  try {
    const [branchResult, commitResult] = await Promise.all([
      execAsync('git rev-parse --abbrev-ref HEAD', { cwd }),
      execAsync('git rev-parse --short HEAD', { cwd })
    ]);

    return {
      branch: branchResult.stdout.trim() || null,
      commit: commitResult.stdout.trim() || null
    };
  } catch {
    return { branch: null, commit: null };
  }
}