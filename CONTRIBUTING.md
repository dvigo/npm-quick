# Contributing to Task Executor

Thank you for your interest in contributing to Task Executor! We appreciate all contributions, from bug reports to feature implementations.

## How to Report Bugs

Before creating a bug report, please check the issue list to ensure it hasn't already been reported. When you do create a bug report, include as much detail as possible:

- **Description**: A clear description of what the bug is
- **Steps to Reproduce**: How to reproduce the issue
- **Expected Behavior**: What you expected to happen
- **Actual Behavior**: What actually happened
- **Environment**: Your OS, VS Code version, and Node.js version
- **Screenshots**: If applicable

## Feature Requests

We welcome feature suggestions! Please describe:

- **Use Case**: Why you think this feature is needed
- **Solution**: Your proposed implementation
- **Alternatives**: Any alternative approaches you've considered

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/dvigo/task-executor.git
   cd task-executor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Open in VS Code**
   ```bash
   code .
   ```

4. **Start development**
   - Press `F5` to launch the extension in debug mode
   - Open a project with a `package.json` to test

## Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write your code
   - Update tests if needed
   - Update documentation

3. **Lint your code**
   ```bash
   npm run lint
   ```

4. **Compile and test**
   ```bash
   npm run compile
   npm run test
   ```

5. **Commit with descriptive messages**
   ```bash
   git commit -m "feat: add your feature description"
   ```

6. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

## Code Style

- Use TypeScript for all code
- Follow the existing code style
- Run ESLint before committing: `npm run lint`
- Use meaningful variable and function names
- Add comments for complex logic

## Commit Messages

Use conventional commit format:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting
- `refactor:` for code restructuring
- `test:` for test changes
- `chore:` for maintenance tasks

Example: `feat: add keyboard shortcut for running last script`

## Pull Request Process

1. Update documentation and CHANGELOG if needed
2. Ensure all tests pass
3. Provide a clear description of your changes
4. Reference any related issues
5. Wait for code review

## Project Structure

```
├── src/
│   ├── extension.ts      # Main extension entry point
│   ├── packageManager.ts # Package manager detection logic
│   ├── types.ts          # TypeScript type definitions
│   └── test/             # Test files
├── package.json          # Project manifest
├── tsconfig.json         # TypeScript configuration
├── README.md             # User documentation
└── CHANGELOG.md          # Release notes
```

## Questions?

Feel free to open an issue or discussion on the GitHub repository. We're here to help!

---

Thank you for contributing to Task Executor! 🚀
