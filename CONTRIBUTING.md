# Contributing Guidelines

## Git Workflow

### Branch Structure
- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: New features
- `release/*`: Release preparation
- `hotfix/*`: Production hotfixes

### Development Process

1. **Starting a New Feature**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Making Changes**
   - Make your changes
   - Write tests
   - Update documentation
   - Commit with conventional commits:
     ```bash
     git add .
     git commit -m "type: description"
     ```
   - Types: feat, fix, docs, style, refactor, test, chore

3. **Submitting Changes**
   ```bash
   git push origin feature/your-feature-name
   ```
   - Create a Pull Request to `develop`
   - Ensure CI checks pass
   - Get code review approval
   - Resolve any conflicts
   - Merge to `develop`

4. **Release Process**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b release/v1.x.x
   ```
   - Update version numbers
   - Update changelog
   - Create PR to `main`
   - Get approval
   - Merge to `main`
   - Tag the release
   - Merge back to `develop`

### Pull Request Guidelines

1. **Title Format**
   - Use conventional commits format
   - Example: "feat: add user authentication"

2. **Description**
   - What does this PR do?
   - How to test?
   - Any breaking changes?
   - Related issues?

3. **Review Process**
   - All PRs require at least one approval
   - CI checks must pass
   - No merge conflicts
   - Up-to-date with target branch

### Code Style

- Follow project's ESLint configuration
- Write meaningful commit messages
- Keep PRs focused and small
- Include tests for new features
- Update documentation as needed

### Emergency Hotfixes

1. Create hotfix branch from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/issue-description
   ```

2. Make changes and create PR to `main`
3. After merging to `main`, merge to `develop`
4. Delete hotfix branch

## Questions?

If you have any questions about this workflow, please reach out to the team leads or create an issue in the repository. 