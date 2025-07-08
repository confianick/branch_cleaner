import { createObjectCsvWriter } from 'csv-writer';
import simpleGit, { SimpleGit } from 'simple-git';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

type LogEntry = {
    branch: string;
    lastCommitDate: string;
    deletedAt: string;
    commitHash?: string;
    commitMessage?: string;
    author: string;
    mergedToMain: boolean;
};

const args = process.argv.slice(2);
const repoUrl = args[0];
const cutoffDateArg = args[1];
const isDryRun = args.includes('--dry-run');

console.log(`💡 Dry run: ${isDryRun ? 'enabled' : 'disabled'}`);

if (!repoUrl || !cutoffDateArg) {
    console.error('❌ Usage: ts-node delete-old-branches.ts <repo-url> <cutoff-date>');
    process.exit(1);
}

const CUTOFF_DATE = new Date(cutoffDateArg);
if (isNaN(CUTOFF_DATE.getTime())) {
    console.error('❌ Invalid date format. Use "YYYY-MM-DD" or ISO format.');
    process.exit(1);
}

console.log(`🔗 Repo URL: ${repoUrl}`);
console.log(`📅 Cutoff date: ${CUTOFF_DATE.toISOString()}`);

const LOG_FILE = `deleted_branches_log_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;

async function deleteOldBranches(repoUrl: string, cutoffDate: Date, isDryRun: boolean) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-'));
    console.log(`📁 Cloning into: ${tempDir}`);

    const git: SimpleGit = simpleGit(tempDir);
    await git.clone(repoUrl, tempDir);
    await git.fetch(['--all']);
    await git.checkout('main'); // Adjust if default is 'master'

    const branches = await getAllBranches(git);
    console.log(`Found ${branches.length} branches`);
    const deleted: LogEntry[] = [];

    for (const branch of branches) {
        const commitMeta = await getLastCommitMeta(git, branch);
        if (!commitMeta) continue;

        console.log(`🧪 ${branch} commit=${commitMeta.date.toISOString()} vs cutoff=${cutoffDate.toISOString()}`);
        const merged = await wasMergedToMain(git, branch);
        if (commitMeta.date <= cutoffDate) {
            try {
                await ensureBranchExistsLocally(git, branch);
                if (!isDryRun) {
                    await git.checkout('main');
                    await git.deleteLocalBranch(branch, true);
                }

                deleted.push({
                    branch,
                    lastCommitDate: commitMeta.date.toISOString(),
                    deletedAt: isDryRun ? 'DRY-RUN' : new Date().toISOString(),
                    commitHash: commitMeta.hash,
                    commitMessage: commitMeta.message,
                    author: commitMeta.author,
                    mergedToMain: merged,
                });

                console.log(`${isDryRun ? '🧪 Would delete' : '🧹 Deleted'} branch: ${branch}`);
            } catch (err) {
                console.warn(`⚠️ Failed to delete branch ${branch}:`, err);
            }
        }
    }

    if (!isDryRun && deleted.length > 0) {
        await createCsvLog(deleted);
        console.log(`✅ Cleanup complete. Repo folder: ${tempDir}`);
    }
}

async function getAllBranches(git: SimpleGit): Promise<string[]> {
    const result = await git.raw(['branch', '-r']);
    return result
        .split('\n')
        .map(line => line.trim())
        .filter(line =>
            line &&
            !line.includes('->') &&           // Remove HEAD -> origin/main pointers
            !line.endsWith('/main') &&
            !line.endsWith('/master')
        )
        .map(remoteBranch => remoteBranch.replace('origin/', ''));
}

async function getMergeDate(git: SimpleGit, branch: string): Promise<string | null> {
    try {
        const mergeBase = await git.raw(['merge-base', branch, 'main']);
        const log = await git.raw(['log', '-1', '--format=%ci', mergeBase]);
        return log.trim();
    } catch {
        return null;
    }
}

type CommitMeta = {
    date: Date;
    hash: string;
    message: string;
    author: string;
};

async function getLastCommitMeta(git: SimpleGit, branch: string): Promise<CommitMeta | null> {
    try {
        await ensureBranchExistsLocally(git, branch);

        // ISO 8601 date | commit hash | commit message
        const logOutput = await git.raw(['log', '-1', '--format=%cI|%H|%s', branch]);
        const [dateStr, hash, message, author] = logOutput.trim().split('|');

        const commitDate = new Date(dateStr);

        if (isNaN(commitDate.getTime())) {
            console.warn(`⚠️ Invalid commit date for ${branch}: ${logOutput.trim()}`);
            return null;
        }

        return { date: commitDate, hash, message, author };
    } catch (err) {
        console.warn(`⚠️ Failed to get last commit for ${branch}:`, err);
        return null;
    }
}

async function wasMergedToMain(git: SimpleGit, branch: string): Promise<boolean> {
    try {
        const merged = await git.raw(['branch', '--merged', 'main']);
        return merged.split('\n').some(b => b.trim().replace('* ', '') === branch);
    } catch {
        return false;
    }
}


async function ensureBranchExistsLocally(git: SimpleGit, branch: string): Promise<void> {
    const localBranches = (await git.branchLocal()).all;
    if (!localBranches.includes(branch)) {
        await git.checkout(['-b', branch, `origin/${branch}`]);
    }
}

async function createCsvLog(entries: LogEntry[]) {
    const writer = createObjectCsvWriter({
        path: LOG_FILE,
        header: [
            { id: 'branch', title: 'Branch Name' },
            { id: 'lastCommitDate', title: 'Last Commit Date' },
            { id: 'deletedAt', title: 'Date Deleted' },
            { id: 'commitHash', title: 'Last Commit Hash' },
            { id: 'commitMessage', title: 'Last Commit Message' },
            { id: 'author', title: 'Author' },
            { id: 'mergedToMain', title: 'Merged to Main' },
        ],
    });
    console.log(entries);
    await writer.writeRecords(entries);
    console.log(`📄 Log written to ${LOG_FILE}`);
}

deleteOldBranches(repoUrl, CUTOFF_DATE, isDryRun);