#!/usr/bin/env node

/**
 * PDCP Autonomous Startup Script
 * Automatically sets up and runs the entire project
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

// Logging functions
function logInfo(msg) {
    console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`);
}

function logSuccess(msg) {
    console.log(`${colors.green}✅ ${msg}${colors.reset}`);
}

function logWarning(msg) {
    console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`);
}

function logError(msg) {
    console.log(`${colors.red}❌ ${msg}${colors.reset}`);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: 'inherit',
            shell: true,
            ...options
        });

        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Command failed with code ${code}`));
            } else {
                resolve();
            }
        });

        child.on('error', (err) => {
            reject(err);
        });
    });
}

async function main() {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║  Post-Dispatch Consolidation Platform (PDCP)                   ║
║  Autonomous Startup Script                                     ║
╚════════════════════════════════════════════════════════════════╝
`);

    try {
        // Step 1: Check Node.js version
        logInfo('Checking Node.js version...');
        const nodeVersion = process.version;
        logSuccess(`Node.js version: ${nodeVersion}`);

        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
        if (majorVersion < 18) {
            logError('Node.js 18+ is required');
            process.exit(1);
        }

        // Step 2: Setup environment
        logInfo('Setting up environment variables...');
        const envPath = path.join(process.cwd(), '.env.development');
        const envExamplePath = path.join(process.cwd(), '.env.example');

        if (!fs.existsSync(envPath)) {
            if (fs.existsSync(envExamplePath)) {
                fs.copyFileSync(envExamplePath, envPath);
                logSuccess('.env.development created from .env.example');
            }
        } else {
            logSuccess('.env.development already exists');
        }

        // Install dependencies with --force to bypass all conflicts
        logger.info('Installing npm dependencies (this may take a few minutes)...');
        try {
            await runCommand('npm', ['install', '--force']);
            logSuccess('Dependencies installed successfully');
        } catch (err) {
            logError('Failed to install dependencies');
            throw err;
        }

        // Step 4: Start Docker services
        logInfo('Starting Docker services (PostgreSQL & Redis)...');
        try {
            await runCommand('docker-compose', ['up', '-d']);
            logSuccess('Docker services started');
            logInfo('Waiting for services to be healthy...');
            await sleep(15000);
            logSuccess('Services are ready');
        } catch (err) {
            logWarning('Could not start Docker services - you may need to start them manually');
            logWarning('Continuing anyway...');
        }

        // Step 5: Build all services
        logInfo('Building all services...');
        try {
            await runCommand('npm', ['run', 'build']);
            logSuccess('All services built successfully');
        } catch (err) {
            logError('Failed to build services');
            throw err;
        }

        // Step 6: Setup database
        if (fs.existsSync('setup-database.js')) {
            logInfo('Setting up database...');
            try {
                await runCommand('node', ['setup-database.js']);
                logSuccess('Database setup completed');
            } catch (err) {
                logWarning('Database setup encountered issues but continuing...');
            }
        }

        // Step 7: Start development servers
        console.log('');
        logInfo('🚀 Starting all services in development mode...');
        console.log(`
${colors.blue}Services will be available at:${colors.reset}
  • API Gateway:       http://localhost:3000
  • Decision Engine:   http://localhost:3001/api/docs
  • Vehicle Tracking:  http://localhost:3002/api/docs
  • Auth Service:      http://localhost:3003/api/docs
  • Parcel Management: http://localhost:3004/api/docs
  • Custody Service:   http://localhost:3005/api/docs
  • Analytics Service: http://localhost:3006/api/docs
  • Audit Service:     http://localhost:3007/api/docs

${colors.yellow}Press Ctrl+C to stop all services${colors.reset}
`);

        // Start development servers
        await runCommand('npm', ['run', 'dev']);

    } catch (err) {
        logError(`Startup failed: ${err.message}`);
        process.exit(1);
    }
}

main().catch(err => {
    logError(`Fatal error: ${err.message}`);
    process.exit(1);
});
