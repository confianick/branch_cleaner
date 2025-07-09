# 🧹 Git Branch Cleaner

This script deletes old branches from a remote Git repository based on a cutoff date. It supports dry runs, logs deleted branches in a CSV file, and optionally includes metadata like commit hash, message, and whether the branch was merged into `main`.

---

## 📦 Features

* Deletes remote branches older than a specified date
* Supports `--dry-run` to preview branches that would be deleted
* Logs deleted branches with:

  * Branch name
  * Last commit date
  * Commit hash and message
  * Whether the branch was merged into `main`
* Generates a unique CSV log file per run
* Automatically checks out and cleans up local branches

---

## 🛠 Installation

1. Clone the repo

   ```bash
   git clone git@github.com:your-username/branch_cleaner.git
   cd branch_cleaner
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Install ts-node globally (if not installed)

   ```bash
   npm install -g ts-node typescript
   ```

---

## 🚀 Usage

Basic command

```bash
ts-node delete-old-branches.ts <repo-url> <cutoff-date>
```

* `<repo-url>`: Full Git remote URL (use `git@github.com:user/repo.git` for SSH)
* `<cutoff-date>`: ISO 8601 formatted date (e.g., `2025-07-01T00:00:00`)

Example

```bash
ts-node delete-old-branches.ts git@github.com:your-username/branch_cleaner_test.git "2025-07-01T00:00:00"
```

This will delete any branch whose last commit is on or before July 1, 2025.

✅ Dry Run (preview only)

```bash
ts-node delete-old-branches.ts <repo-url> <cutoff-date> --dry-run
```

Shows which branches would be deleted, but makes no changes and does not create a CSV.

---

## 📄 Output

When run without `--dry-run`, the script writes a CSV log file such as:

```
deleted_branches_log_2025-07-08T12-34-56-789Z.csv
```

### CSV Columns

| Column              | Description                                |
| ------------------- | ------------------------------------------ |
| Branch Name         | Name of the deleted branch                 |
| Last Commit Date    | ISO timestamp of the last commit           |
| Date Deleted        | When the branch was deleted (or `DRY-RUN`) |
| Last Commit Hash    | SHA-1 hash of the last commit              |
| Last Commit Message | Message of the last commit                 |
| Merged to Main      | Whether the branch was merged into `main`  |

---

## ⚙️ Requirements

* Node.js (v16+)
* Git installed
* SSH access to the remote repository (recommended), or PAT via HTTPS

---

## 🔐 Authentication Notes

If using an HTTPS URL (e.g., `https://github.com/username/repo.git`), you must:

* Use a GitHub Personal Access Token (PAT)
* Ensure your PAT has repo access scope
* Configure Git credential manager correctly

Or, to simplify, use SSH:

```bash
git@github.com:username/repo.git
```

Make sure your SSH key is added at: [https://github.com/settings/keys](https://github.com/settings/keys)