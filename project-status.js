#!/usr/bin/env node

/**
 * PDCP Project Status & Information Dashboard
 * Shows system status and available commands
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
};

function print(text, color = 'reset') {
    console.log(`${colors[color]}${text}${colors.reset}`);
}

function check(label, condition) {
    const icon = condition ? '✓' : '✗';
    const color = condition ? 'green' : 'red';
    print(`${icon} ${label}`, color);
}

function section(title) {
    console.log(`\n${colors.bright}${colors.cyan}▶ ${title}${colors.reset}`);
}

// Check system requirements
section('System Requirements Check');
try {
    const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
    check('Node.js installed', true);
    print(`  Version: ${nodeVersion}`, 'blue');
} catch {
    check('Node.js installed', false);
}

try {
    const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
    check('npm installed', true);
    print(`  Version: ${npmVersion}`, 'blue');
} catch {
    check('npm installed', false);
}

try {
    execSync('docker --version', { encoding: 'utf-8' });
    check('Docker installed', true);
} catch {
    check('Docker installed', false);
}

try {
    execSync('docker-compose --version', { encoding: 'utf-8' });
    check('Docker Compose installed', true);
} catch {
    check('Docker Compose installed', false);
}

// Check project files
section('Project Files');
const files = {
    'package.json': 'Root package.json',
    'docker-compose.yml': 'Docker configuration',
    '.env.example': 'Environment template',
    'run-complete-project.js': 'Complete startup script',
    'QUICK-START.md': 'Quick start guide',
};

Object.entries(files).forEach(([file, desc]) => {
    const exists = fs.existsSync(path.join(process.cwd(), file));
    check(desc, exists);
    if (exists) print(`  ${file}`, 'blue');
});

// Check services structure
section('Microservices');
const services = [
    'api-gateway',
    'decision-engine',
    'vehicle-tracking',
    'auth-service',
    'parcel-management',
    'custody-service',
    'analytics-service',
    'audit-service',
];

services.forEach(service => {
    const path_to_service = path.join(process.cwd(), 'apps', service);
    const exists = fs.existsSync(path_to_service);
    check(`${service}`, exists);
});

// Display services info
section('Available Services (after startup)');
const serviceInfo = [
    ['Service', 'Port', 'URL'],
    ['API Gateway', '3000', 'http://localhost:3000'],
    ['Decision Engine', '3001', 'http://localhost:3001/api/docs'],
    ['Vehicle Tracking', '3002', 'http://localhost:3002/api/docs'],
    ['Auth Service', '3003', 'http://localhost:3003/api/docs'],
    ['Parcel Management', '3004', 'http://localhost:3004/api/docs'],
    ['Custody Service', '3005', 'http://localhost:3005/api/docs'],
    ['Analytics Service', '3006', 'http://localhost:3006/api/docs'],
    ['Audit Service', '3007', 'http://localhost:3007/api/docs'],
];

// Simple table display
console.log();
serviceInfo.forEach((row, idx) => {
    if (idx === 0) {
        print(`${row[0].padEnd(20)} ${row[1].padEnd(8)} ${row[2]}`, 'bright');
        print('-'.repeat(60), 'blue');
    } else {
        print(`${row[0].padEnd(20)} ${row[1].padEnd(8)} ${row[2]}`, 'cyan');
    }
});

// Quick commands
section('Quick Commands');
const commands = {
    'Start entire project': 'node run-complete-project.js',
    'Stop Docker services': 'npm run docker:down',
    'View Docker logs': 'npm run docker:logs',
    'Build services': 'npm run build',
    'Run tests': 'npm run test',
};

Object.entries(commands).forEach(([desc, cmd]) => {
    print(`${desc}:`, 'yellow');
    print(`  $ ${cmd}`, 'bright');
});

// Database info
section('Database Configuration');
const dbInfo = {
    'PostgreSQL Host': 'localhost',
    'PostgreSQL Port': '5432',
    'PostgreSQL User': 'pdcp_user',
    'PostgreSQL Password': 'pdcp_password',
    'PostgreSQL Database': 'pdcp_db',
    'Redis Host': 'localhost',
    'Redis Port': '6379',
};

Object.entries(dbInfo).forEach(([key, value]) => {
    print(`${key}: ${value}`, 'blue');
});

// Next steps
section('Next Steps');
print('1. Ensure Docker is running', 'yellow');
print('2. Run: node run-complete-project.js', 'yellow');
print('3. Wait for "Services Running" message', 'yellow');
print('4. Open http://localhost:3000 in browser', 'yellow');

// Footer
console.log(`\n${colors.bright}${colors.green}═`.repeat(60) + `${colors.reset}`);
print('PDCP is ready to launch!', 'bright');
print('Run: node run-complete-project.js', 'green');
print(`═`.repeat(60), 'green');
