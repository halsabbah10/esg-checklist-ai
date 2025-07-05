# Frontend Development Tools

This document outlines the equivalent tools to Python's Ruff and Black for the frontend TypeScript/React codebase.

## 🛠️ Tools Setup

### Code Formatting (equivalent to Black)

- **Prettier** - Automatic code formatting
- Configuration: `.prettierrc`
- Ignore file: `.prettierignore`

### Linting (equivalent to Ruff)

- **ESLint** - JavaScript/TypeScript linting
- **TypeScript Compiler** - Type checking
- Configuration: `eslint.config.js`

## 📝 Available Scripts

### Formatting Commands

```bash
# Check if code needs formatting
npm run format:check

# Automatically format all files
npm run format
```

### Linting Commands

```bash
# Check for lint errors
npm run lint

# Fix auto-fixable lint errors
npm run lint:fix
```

### Comprehensive Checks

```bash
# Run all checks (lint + format + typecheck)
npm run check

# Fix all auto-fixable issues
npm run fix
```

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Type check without building
tsc --noEmit
```

## ⚙️ Configuration Details

### Prettier Configuration (`.prettierrc`)

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 100,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

### ESLint Configuration (`eslint.config.js`)

- TypeScript support
- React hooks rules
- React refresh rules
- Prettier integration (no formatting conflicts)

## 🔄 Workflow Integration

### Pre-commit Checks

```bash
# Recommended workflow before committing
npm run check
```

### CI/CD Integration

Add to your CI pipeline:

```bash
npm run lint
npm run format:check
npx tsc --noEmit
```

### IDE Integration

- **VS Code**: Install Prettier and ESLint extensions
- **Format on save**: Enable in VS Code settings
- **Auto-fix on save**: Configure ESLint extension

## 🚀 Benefits

1. **Consistent Code Style**: Prettier ensures uniform formatting
2. **Error Prevention**: ESLint catches common mistakes
3. **Type Safety**: TypeScript compiler ensures type correctness
4. **Developer Experience**: Auto-formatting and auto-fixing
5. **Team Collaboration**: Consistent codebase across team members

## 📚 Alternative Tools

### Biome (Modern Alternative)

```bash
# Install Biome as alternative to ESLint + Prettier
npm install --save-dev @biomejs/biome
```

Biome combines formatting and linting in one fast tool, similar to Ruff for Python.

### Comparison with Python Tools

| Python | Frontend            | Purpose         |
| ------ | ------------------- | --------------- |
| Black  | Prettier            | Code formatting |
| Ruff   | ESLint              | Linting         |
| mypy   | TypeScript          | Type checking   |
| isort  | ESLint import rules | Import sorting  |

The frontend setup now provides the same level of code quality and consistency as the Python backend!
