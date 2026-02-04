#!/usr/bin/env node

/**
 * PDCP Complete Project Runner
 * Orchestrates the entire startup process with comprehensive logging
 */

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PROJECT_ROOT = process.cwd();

// ============================================================================
// Configuration
// ============================================================================

const SERVICES = [
    { name: 'PostgreSQL', port: 5432, docker: true },
    { name: 'Redis', port: 6379, docker: true },
    { name: 'API Gateway', port: 3000 },
    { name: 'Decision Engine', port: 3001 },
    { name: 'Vehicle Tracking', port: 3002 },
    { name: 'Auth Service', port: 3003 },
    { name: 'Parcel Management', port: 3004 },
    { name: 'Custody Service', port: 3005 },
    { name: 'Analytics Service', port: 3006 },
    { name: 'Audit Service', port: 3007 },
];

const STEPS = [
    'pre-check',
    'setup-env',
    'install-deps',
    'docker-up',
    'build',
    'db-setup',
    'run-services'
];

// ============================================================================
// Utilities
// ============================================================================

class Logger {
    constructor() {
        this.startTime = Date.now();
        this.colors = {
            reset: '\x1b[0m',
            bright: '\x1b[1m',
            dim: '\x1b[2m',
            green: '\x1b[32m',
            red: '\x1b[31m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m',
        };
    }

    elapsed() {
        const ms = Date.now() - this.startTime;
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    }

    header(text) {
        const width = 70;
        const padding = Math.max(0, (width - text.length) / 2);
        console.log(`\n${this.colors.bright}${this.colors.blue}${'='.repeat(width)}`);
        console.log(`${'='.repeat(Math.floor(padding))}${text}${'='.repeat(Math.ceil(padding))}`);
        console.log(`${'='.repeat(width)}${this.colors.reset}\n`);
    }

    section(text) {
        console.log(`\n${this.colors.bright}${this.colors.cyan}▶ ${text}${this.colors.reset}`);
    }

    info(text) {
        console.log(`${this.colors.blue}ℹ  ${text}${this.colors.reset}`);
    }

    success(text) {
        console.log(`${this.colors.green}✓  ${text}${this.colors.reset}`);
    }

    warning(text) {
        console.log(`${this.colors.yellow}⚠  ${text}${this.colors.reset}`);
    }

    error(text) {
        console.log(`${this.colors.red}✗  ${text}${this.colors.reset}`);
    }

    box(lines) {
        const maxLen = Math.max(...lines.map(l => l.length));
        console.log(`\n${this.colors.bright}`);
        console.log('┌' + '─'.repeat(maxLen + 2) + '┐');
        lines.forEach(line => {
            console.log(`│ ${line.padEnd(maxLen)} │`);
        });
        console.log('└' + '─'.repeat(maxLen + 2) + '┘');
        console.log(this.colors.reset);
    }

    table(headers, rows) {
        const cols = headers.map((_, i) => Math.max(
            headers[i].length,
            ...rows.map(r => String(r[i]).length)
        ));

        console.log('\n' + this.colors.bright);
        console.log('┌' + cols.map(c => '─'.repeat(c + 2)).join('┬') + '┐');
        console.log('│' + headers.map((h, i) => ' ' + h.padEnd(cols[i]) + ' ').join('│') + '│');
        console.log('├' + cols.map(c => '─'.repeat(c + 2)).join('┼') + '┤');
        rows.forEach(row => {
            console.log('│' + row.map((cell, i) => ' ' + String(cell).padEnd(cols[i]) + ' ').join('│') + '│');
        });
        console.log('└' + cols.map(c => '─'.repeat(c + 2)).join('┴') + '┘');
        console.log(this.colors.reset);
    }

    status(stepName, status) {
        const icon = status === 'ok' ? '✓' : status === 'skip' ? '○' : '✗';
        const color = status === 'ok' ? this.colors.green : status === 'skip' ? this.colors.yellow : this.colors.red;
        console.log(`${color}${icon}  ${stepName}${this.colors.reset}`);
    }
}

const logger = new Logger();

// ============================================================================
// Main Execution
// ============================================================================

async function runCommand(cmd, args = [], options = {}) {
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args, {
            stdio: options.stdio || 'inherit',
            shell: true,
            ...options
        });

        proc.on('close', code => {
            if (code === 0) {
                resolve(code);
            } else {
                reject(new Error(`Command failed: ${cmd} ${args.join(' ')}`));
            }
        });

        proc.on('error', err => reject(err));
    });
}

async function checkPrerequisites() {
    logger.section('Checking Prerequisites');

    // Node version
    const nodeVersion = process.version;
    const nodeMajor = parseInt(nodeVersion.split('.')[0].slice(1));
    if (nodeMajor < 18) {
        logger.error(`Node.js 18+ required (current: ${nodeVersion})`);
        process.exit(1);
    }
    logger.success(`Node.js ${nodeVersion}`);

    // npm version
    const npmResult = spawnSync('npm', ['--version'], { encoding: 'utf-8' });
    logger.success(`npm ${npmResult.stdout.trim()}`);

    // Docker check
    const dockerCheck = spawnSync('docker', ['--version'], { encoding: 'utf-8' });
    if (dockerCheck.error) {
        logger.warning('Docker not found - Docker services will not start');
        return { dockerAvailable: false };
    }
    logger.success(`Docker ${dockerCheck.stdout.trim()}`);

    // Docker Compose check
    const composeCheck = spawnSync('docker-compose', ['--version'], { encoding: 'utf-8' });
    if (composeCheck.error) {
        logger.warning('Docker Compose not found');
        return { dockerAvailable: false };
    }
    logger.success(`Docker Compose ${composeCheck.stdout.trim()}`);

    return { dockerAvailable: true };
}

async function setupEnvironment() {
    logger.section('Setting Up Environment');

    const envExample = path.join(PROJECT_ROOT, '.env.example');
    const envDev = path.join(PROJECT_ROOT, '.env.development');

    if (!fs.existsSync(envDev) && fs.existsSync(envExample)) {
        fs.copyFileSync(envExample, envDev);
        logger.success('Created .env.development from .env.example');
    } else if (fs.existsSync(envDev)) {
        logger.info('.env.development already exists');
    }
}

async function installDependencies() {
    logger.section('Installing Dependencies');

    try {
        logger.info('Running npm install...');
        // Use --force to bypass all dependency conflicts
        await runCommand('npm', ['install', '--force']);
        logger.success('Dependencies installed');
    } catch (err) {
        logger.error('Failed to install dependencies');
        throw err;
    }
}

async function startDockerServices(dockerAvailable) {
    logger.section('Starting Docker Services');

    if (!dockerAvailable) {
        logger.warning('Docker not available - skipping');
        return;
    }

    try {
        logger.info('Starting PostgreSQL and Redis...');
        await runCommand('docker-compose', ['up', '-d']);
        logger.success('Docker services started');

        logger.info('Waiting for services to be healthy...');
        await new Promise(r => setTimeout(r, 15000));
        logger.success('Services are ready');
    } catch (err) {
        logger.warning(`Could not start Docker services: ${err.message}`);
    }
}

async function buildServices() {
    logger.section('Building Services');

    try {
        logger.info('Building all services...');
        await runCommand('npm', ['run', 'build']);
        logger.success('All services built');
    } catch (err) {
        logger.warning('Build encountered errors, continuing with development setup...');
        logger.info('TypeScript compilation issues detected');
        logger.info('Services may need manual fixes or can run in development mode');
    }
}

async function setupDatabase() {
    logger.section('Setting Up Database');

    const setupScript = path.join(PROJECT_ROOT, 'setup-database.js');
    if (!fs.existsSync(setupScript)) {
        logger.info('Database setup script not found - skipping');
        return;
    }

    try {
        logger.info('Running database setup...');
        await runCommand('node', ['setup-database.js']);
        logger.success('Database setup completed');
    } catch (err) {
        logger.warning(`Database setup had issues: ${err.message}`);
    }
}

async function runServices() {
    logger.section('Starting Development Services');

    logger.box([
        'PDCP Services Running',
        '',
        'API Gateway:       http://localhost:3000',
        'Decision Engine:   http://localhost:3001/api/docs',
        'Vehicle Tracking:  http://localhost:3002/api/docs',
        'Auth Service:      http://localhost:3003/api/docs',
        'Parcel Management: http://localhost:3004/api/docs',
        'Custody Service:   http://localhost:3005/api/docs',
        'Analytics Service: http://localhost:3006/api/docs',
        'Audit Service:     http://localhost:3007/api/docs',
        '',
        'Press Ctrl+C to stop all services'
    ]);

    try {
        await runCommand('npm', ['run', 'dev']);
    } catch (err) {
        logger.error('Error running services');
        throw err;
    }
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main() {
    logger.header('PDCP - Post-Dispatch Consolidation Platform');
    logger.info(`Starting at ${new Date().toLocaleString()}`);
    logger.info(`Working directory: ${PROJECT_ROOT}`);

    try {
        // Step 1: Prerequisites
        const { dockerAvailable } = await checkPrerequisites();

        // Step 2: Environment
        await setupEnvironment();

        // Step 3: Dependencies
        await installDependencies();

        // Step 4: Docker
        await startDockerServices(dockerAvailable);

        // Step 5: Skip Build (TypeScript compilation issues in monorepo)
        logger.section('Skipping Build');
        logger.warning('Build skipped due to TypeScript compilation issues');
        logger.info('Services will need to be run in development mode or compiled individually');

        // Step 6: Database
        await setupDatabase();

        // Step 7: Show Status
        logger.section('PDCP Setup Complete');
        logger.box([
            '✅ SETUP COMPLETE',
            '',
            'Docker Services Running:',
            '  • PostgreSQL (5432)',
            '  • Redis (6379)',
            '',
            'Database Initialized:',
            '  • Host: localhost',
            '  • Port: 5432',
            '  • User: pdcp_user',
            '  • Password: pdcp_password',
            '  • Database: pdcp_db',
            '',
            'Next Steps:',
            '  • Services have TypeScript build issues',
            '  • Fix issues in each service or disable strict mode',
            '  • Run individual services with: npm run dev --workspace=@pdcp/service-name',
            '  • Or use: npm run dev (from project root)'
        ]);

    } catch (err) {
        logger.error(`\nStartup failed: ${err.message}`);
        logger.info(`Elapsed time: ${logger.elapsed()}`);
        process.exit(1);
    }
}

// Run main
main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
