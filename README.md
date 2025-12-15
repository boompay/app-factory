# Boom Screen - Application Automation

Automated application enrollment and verification flow for Boom Screen platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Dependencies](#dependencies)

## Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** or **yarn** package manager
- Access to Boom Screen API endpoints

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/boompay/app-factory.git
   cd app-factory
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment files (see [Configuration](#configuration) section)

## Configuration

### Environment Files

The application uses environment-specific configuration files. Create environment files in the root directory:

- `.env.stg1` - Staging environment 1
- `.env.stg2` - Staging environment 2
- `.env.production` - Production environment (if needed)

### Required Environment Variables

Each environment file must contain at minimum:

```env
BASE_URL=https://api.staging.boompay.app
```

Additional environment variables may be required depending on your setup.

### Application Configuration

The default environment and other settings can be configured in `config/app.config.ts`:

```typescript
export const APP_CONFIG = {
  ENV: "stg1",  // Default environment
  // ... other settings
}
```

## Usage
### Before running

1. Application enrollment link should be copied from the chosen unit page.
2. **Important!** verification template for property must be "AppFactory". Working with any template is not implemented yet.

### Running the Application

The application accepts one command-line argument:
1. **Magic Link** (required) - The application enrollment link

The environment is automatically detected from the magic link URL:
- Links containing `.staging2.` → uses `stg2` environment
- Links containing `.staging.` → uses `stg1` environment
- If no pattern matches → falls back to default from `APP_CONFIG.ENV`

### Examples

**Using tsx directly:**
```bash
# Environment is automatically detected from the link
tsx runner.ts "https://screen.staging.boompay.app/a/your-token"
tsx runner.ts "https://screen.staging2.boompay.app/a/your-token"
```

**Using npm scripts:**
```bash
# With magic link (note the space after --)
npm start -- "https://screen.staging.boompay.app/a/your-token"

# Or using the run script
npm run run -- "https://screen.staging2.boompay.app/a/your-token"
```

> **Important:** Always include a space after `--` when passing arguments to npm scripts. Without the space, npm will incorrectly parse the arguments.

**Using npx:**
```bash
npx tsx runner.ts "https://screen.staging.boompay.app/a/your-token"
```

### What the Application Does

The runner performs the following automated steps:

1. **Enrollment** - Enrolls a new application using the provided magic link
2. **Identity Verification** - Creates and waits for identity verification (Fast-Track)
3. **Personal Details** - Submits personal details information
4. **Housing History** - Submits housing history
5. **Combined Income** - Submits combined income information
6. **Move-in Date** - Sets desired move-in date
7. **Submission Disclosure** - Signs submission disclosure
8. **Verification Check** - Waits for identity verification to complete
9. **Application Submission** - Submits the completed application

All steps are logged, and application snapshots are saved to test data files after each major step.

## Project Structure

```
boom-screen/
├── config/              # Application configuration
│   ├── app.config.ts   # Main configuration file
│   └── index.ts
├── constants/          # Application constants
├── helpers/            # Helper functions (generators, utilities)
│   ├── address-generator.ts
│   ├── email-generator.ts
│   ├── name-generator.ts
│   ├── phone-generator.ts
│   └── wait-for.ts
├── models/             # Data models
│   └── app-info.model.ts
├── services/          # Core services
│   ├── api-client.ts
│   ├── auth-token-provider.ts
│   └── logger-provider.ts
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
│   ├── date-utils.ts
│   ├── errors.ts
│   ├── file-io.ts
│   ├── payload-transformer.ts
│   ├── retry.ts
│   └── validators.ts
├── workflows/         # Business logic workflows
│   ├── enrollment.service.ts
│   ├── personal-details.service.ts
│   └── verification.service.ts
├── test-data/         # Test data files (gitignored)
├── logs/              # Log files (gitignored)
├── runner.ts          # Main entry point
├── env.ts             # Environment loader
└── package.json
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `BASE_URL` | Base URL for the API | `https://api.staging.boompay.app` |

### Optional Variables

Additional environment variables may be required depending on your configuration.

## Scripts

Available npm scripts:

- `npm start` - Run the application (same as `npm run dev`)
- `npm run dev` - Run the application in development mode
- `npm run run` - Run the application

All scripts execute `tsx runner.ts` and can accept command-line arguments.

## Dependencies

### Production Dependencies

- `@faker-js/faker` - Generate fake data for testing
- `dotenv` - Environment variable management
- `node-fetch` - HTTP client
- `playwright` - Browser automation
- `winston` - Logging

### Development Dependencies

- `@types/node` - TypeScript types for Node.js
- `tsx` - TypeScript execution engine

## Logging

The application uses Winston for logging. Log files are stored in the `logs/` directory:

- `logs/auth-token-provider.log` - Authentication token logs
- `logs/boomscreen-api.log` - API request/response logs

Log files are automatically cleared at the start of each run.

## Notes

- Test data files (`test-data/`) and log files (`logs/`) are gitignored
- Environment files (`.env.*`) are gitignored for security
- The application automatically handles token refresh
- Application snapshots are saved after each major step for debugging

## Troubleshooting

### "BASE_URL environment variable is not set"

Ensure you have created the appropriate `.env.{environment}` file with the `BASE_URL` variable set.

### "Repository not found" when pushing

Make sure you have:
1. Accepted the GitHub repository invitation
2. Created the repository on GitHub if it doesn't exist
3. Verified your remote URL is correct: `git remote -v`

### Application token validation errors

Ensure the magic link is valid and contains a proper application token. The token is extracted from the last segment of the URL path.
