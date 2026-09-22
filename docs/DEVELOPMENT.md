# Development Guide

This guide covers local environment setup, developer scripts, testing workflows, and build procedures for **Asobimashou!**.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20 or higher recommended; v24 LTS in CI)
- [npm](https://www.npmjs.com/)

### 1. Clone the Repository

```sh
git clone https://github.com/rapjul/asobimashou.git
cd asobimashou
```

### 2. Install Dependencies

```sh
npm install
```

---

## Development Server

Start Vite's local development server with instant Hot Module Replacement (HMR):

```sh
npm run dev
```

Open your browser to `http://localhost:5173`.

---

## Production Build and Preview

Compile TypeScript and bundle assets with Vite PWA:

```sh
# Typecheck and build production distribution in dist/
npm run build

# Start a local preview server serving the production build
npm run preview
```

---

## Testing & Quality Assurance

### Code Quality & Linting

```sh
# Run ESLint with TypeScript and JSDoc rules
npm run lint

# Check TypeScript types without emitting files
npm run typecheck

# Format code with Prettier
npm run format
```

### Automated Unit Testing

Run unit tests and view coverage reports using Vitest:

```sh
# Run unit tests once
npm run test

# Run unit tests once with coverage breakdown
npm run test:coverage
```

The V8 coverage report includes runtime TypeScript under `src/`, including application startup and UI modules. Type-only declarations and the logic re-export barrel are excluded; Playwright separately verifies browser behavior across engines.

### End-to-End Browser Testing

Run Playwright browser automation tests across Desktop and Mobile devices:

```sh
# Install required browser binaries (Chromium, WebKit)
npx playwright install

# Run all E2E tests
npm run test:e2e
```
