# Development Workflow Standards
This document outlines the standard procedures for branching, submitting changes, and merging code in the **Amplify** project. Following these steps ensures a clean git history and efficient collaboration.

---
## 1. Creating a New Branch
When starting a new feature or fixing a bug, always create a fresh branch to isolate your work.

### Step 1: Sync with `main`
Always start from the latest version of the `main` branch to avoid future merge conflicts.

```bash
git checkout main
git pull origin main
```

### Step 2: Create your branch
We follow a strict naming convention to link code with issue tickets.

**Naming Convention Rules:**
1. **Prefix:** Choose the type of your work:
    - `feature/` — for new features.
    - `fix/` — for bug fixes.
    - `chore/` — for maintenance, configs, or docs.
2. **Issue ID:** Add the ticket number (e.g., `AMPLIFY-37`).
3. **Description:** Add a short, meaningful description in kebab-case (lowercase words separated by hyphens).

**Template:**
`{prefix}AMPLIFY-{IssueID}-{short-description}`

**Example:**
> Task: "AMPLIFY-37: Add deployment instructions"
> Branch name: `feature/AMPLIFY-37-Add-deploy-instructions`

**Command:**
```sh
git checkout -b feature/AMPLIFY-37-Add-deploy-instructions
```

---
## 2. Creating a Pull Request (Merge Request)
Once your work is done and committed locally, you are ready to submit it for review.

### Step 1: Push your branch
Make sure you pushed your new branch to the remote repository:
```sh
git push -u origin feature/AMPLIFY-37-add-deploy-instructions
```

### Step 2: Open Pull Request
Go to the repository on GitHub. You should see a prompt to open a PR for your recently pushed branch. Click the green **Compare & pull request** button.
![open-pr](./assets/dev_standards/Pasted%20image%2020260126192955.png)

### Step 3: Fill in PR Details
Fill in the fields to help reviewers understand your changes and to link the PR to the project board.
- **Title:** Must follow the format: `AMPLIFY-{IssueID}: {Meaningful Title}`
    - _Example:_ `AMPLIFY-37: Add deploy docs`
- **Description:** Briefly describe what was done.
    - _Tip:_ Add `Closes #37` (or your issue number) in the description to automatically close the issue when merged.
- **Projects:** Select **Amplify**.
- **(Optional) Assignees:** Assign yourself.
- **(Optional) Reviewers:** Select a team member to review your code.
![creating_pull_request](./assets/dev_standards/Pasted%20image%2020260126193653.png)

---
## 3. Merging

After your Pull Request is approved and all CI/CD checks have passed, you can merge your changes.

### Important: Squash and Merge

We use the **Squash and merge** strategy to keep our `main` branch history clean. This combines all your intermediate commits into a single commit.
1. Click the arrow next to the "Merge pull request" button.
2. Select **Squash and merge**.
3. Confirm the merge.

![SquashButton](./assets/dev_standards/Pasted%20image%2020260126193933.png)
