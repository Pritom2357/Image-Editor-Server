# AI Image Editor Server

## Git Workflow Instructions

### Getting Started

1. **Clone the repository** (first time only):
   ```bash
   git clone [repository URL]
   cd AI\ Image\ Editor\ Server
   ```

2. **Pull the latest changes** before starting any new work:
   ```bash
   git pull origin main
   ```

### Working on New Features

1. **Create a new branch** for your feature or bug fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
   Use a descriptive name following conventions:
   - `feature/` for new features
   - `bugfix/` for bug fixes
   - `hotfix/` for critical fixes

2. **Work on your changes** in this branch.

3. **Commit your changes** regularly with meaningful messages:
   ```bash
   git add .
   git commit -m "Descriptive message about what you changed"
   ```

4. **Pull the latest changes** from the main branch to stay up-to-date:
   ```bash
   git pull origin main
   ```

5. **Resolve any merge conflicts** if they occur.

6. **Push your branch** to the remote repository:
   ```bash
   git push origin feature/your-feature-name
   ```

### Completing Your Work

1. **Create a Pull Request** from your branch to the main branch.

2. **After the PR is approved and merged**, you can delete your local branch:
   ```bash
   git checkout main
   git pull origin main
   git branch -d feature/your-feature-name
   ```
   
3. **Delete the remote branch** (optional):
   ```bash
   git push origin --delete feature/your-feature-name
   ```


### Prerequisites
- Node.js and npm installed on your machine

### Dependency Installation
1. Navigate to the project directory:

2. Install dependencies:
   ```
   npm install
   ```

### Running the Server
1. Start the server:
   ```
   npm start
   ```
2. The server will be available at http://localhost:3000
