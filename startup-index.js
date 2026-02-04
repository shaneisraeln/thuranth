#!/usr/bin/env node

/**
 * PDCP Project - Startup Resources Index
 * A guide to all available startup files and documentation
 */

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
};

function print(text, color = 'reset') {
    console.log(`${colors[color]}${text}${colors.reset}`);
}

console.clear();

print(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║         PDCP - Post-Dispatch Consolidation Platform             ║
║           Autonomous Startup Suite - Resources Index            ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`, 'bright');

print('\n📍 YOU ARE HERE: /workspaces/thuranth\n', 'magenta');

print('═'.repeat(70), 'blue');
print('🚀 STARTUP SCRIPTS (Choose One)', 'bright');
print('═'.repeat(70), 'blue');

const scripts = [
    {
        name: 'run-complete-project.js',
        icon: '🏆',
        desc: 'Most comprehensive - RECOMMENDED',
        lines: 450,
        features: ['Full logging', 'Error handling', 'Status checking', 'Beautiful output']
    },
    {
        name: 'auto-run-project.js',
        icon: '⚡',
        desc: 'Simpler automated setup',
        lines: 220,
        features: ['Lightweight', 'Still automated', 'Basic logging']
    },
    {
        name: 'auto-run-project.sh',
        icon: '🐚',
        desc: 'Bash version for Unix/Linux/Mac',
        lines: 180,
        features: ['Shell script', 'Native bash', 'POSIX compatible']
    }
];

scripts.forEach((script, idx) => {
    print(`\n${script.icon} ${script.name}`, 'yellow');
    print(`   ${script.desc}`, 'blue');
    print(`   Lines: ${script.lines}`, 'blue');
    print(`   Features: ${script.features.join(', ')}`, 'blue');
});

print('\n' + '═'.repeat(70), 'blue');
print('📖 DOCUMENTATION FILES', 'bright');
print('═'.repeat(70), 'blue');

const docs = [
    {
        name: 'START-HERE.md',
        icon: '⭐',
        purpose: 'Main entry point - overview & quick start',
        audience: 'Everyone'
    },
    {
        name: 'QUICK-START.md',
        icon: '📄',
        purpose: 'One-page quick reference card',
        audience: 'Quick starters'
    },
    {
        name: 'STARTUP-GUIDE.md',
        icon: '📚',
        purpose: 'Detailed step-by-step instructions',
        audience: 'Detailed learners'
    },
    {
        name: 'SETUP-COMPLETE.md',
        icon: '✅',
        purpose: 'What has been created & next steps',
        audience: 'Current reference'
    },
    {
        name: 'PROJECT-SETUP-COMPLETE.md',
        icon: '📋',
        purpose: 'Complete overview & architecture',
        audience: 'Deep divers'
    },
    {
        name: 'SYSTEM-ARCHITECTURE.md',
        icon: '🏗️',
        purpose: 'Visual diagrams & system design',
        audience: 'Architects'
    }
];

docs.forEach((doc, idx) => {
    print(`\n${doc.icon} ${doc.name}`, 'yellow');
    print(`   Purpose: ${doc.purpose}`, 'blue');
    print(`   Audience: ${doc.audience}`, 'blue');
});

print('\n' + '═'.repeat(70), 'blue');
print('🛠️ SUPPORT & STATUS TOOLS', 'bright');
print('═'.repeat(70), 'blue');

print('\nproject-status.js', 'yellow');
print('   Check system requirements & project status', 'blue');
print('   Run: node project-status.js', 'blue');

print('\n' + '═'.repeat(70), 'blue');
print('🎯 QUICK START PATHS', 'bright');
print('═'.repeat(70), 'blue');

print('\n1. FASTEST (Just run it):', 'green');
print('   $ node run-complete-project.js', 'bright');

print('\n2. WITH DOCUMENTATION:', 'green');
print('   $ read START-HERE.md', 'bright');
print('   $ node run-complete-project.js', 'bright');

print('\n3. STEP-BY-STEP:', 'green');
print('   $ read STARTUP-GUIDE.md', 'bright');
print('   $ npm install', 'bright');
print('   $ npm run docker:up', 'bright');
print('   $ npm run build', 'bright');
print('   $ npm run dev', 'bright');

print('\n4. CHECK STATUS FIRST:', 'green');
print('   $ node project-status.js', 'bright');
print('   $ node run-complete-project.js', 'bright');

print('\n' + '═'.repeat(70), 'blue');
print('📊 SERVICES THAT WILL RUN', 'bright');
print('═'.repeat(70), 'blue');

const services = [
    ['Service', 'Port', 'Docs URL'],
    ['API Gateway', '3000', 'http://localhost:3000'],
    ['Decision Engine', '3001', 'http://localhost:3001/api/docs'],
    ['Vehicle Tracking', '3002', 'http://localhost:3002/api/docs'],
    ['Auth Service', '3003', 'http://localhost:3003/api/docs'],
    ['Parcel Management', '3004', 'http://localhost:3004/api/docs'],
    ['Custody Service', '3005', 'http://localhost:3005/api/docs'],
    ['Analytics Service', '3006', 'http://localhost:3006/api/docs'],
    ['Audit Service', '3007', 'http://localhost:3007/api/docs'],
    ['PostgreSQL', '5432', 'localhost'],
    ['Redis', '6379', 'localhost']
];

services.forEach((row, idx) => {
    if (idx === 0) {
        print(`\n${colors.bright}${row[0].padEnd(20)} ${row[1].padEnd(8)} ${row[2]}${colors.reset}`, 'blue');
        print('-'.repeat(70), 'blue');
    } else {
        const color = row[1] > 3007 ? 'magenta' : 'green';
        print(`${row[0].padEnd(20)} ${row[1].padEnd(8)} ${row[2]}`, color);
    }
});

print('\n' + '═'.repeat(70), 'blue');
print('💾 DATABASE CREDENTIALS', 'bright');
print('═'.repeat(70), 'blue');

print('\nPostgreSQL:', 'yellow');
print('   Host: localhost', 'blue');
print('   Port: 5432', 'blue');
print('   User: pdcp_user', 'blue');
print('   Password: pdcp_password', 'blue');
print('   Database: pdcp_db', 'blue');

print('\nRedis:', 'yellow');
print('   Host: localhost', 'blue');
print('   Port: 6379', 'blue');
print('   No authentication (dev only)', 'blue');

print('\n' + '═'.repeat(70), 'blue');
print('📋 RECOMMENDED READING ORDER', 'bright');
print('═'.repeat(70), 'blue');

print('\n1️⃣  START-HERE.md (2 min)', 'yellow');
print('   └─ Overview & quick start paths', 'blue');

print('\n2️⃣  QUICK-START.md (1 min)', 'yellow');
print('   └─ One-page reference', 'blue');

print('\n3️⃣  Run the project (2-3 min)', 'yellow');
print('   └─ node run-complete-project.js', 'green');

print('\n4️⃣  SYSTEM-ARCHITECTURE.md (optional)', 'yellow');
print('   └─ Visual diagrams & system design', 'blue');

print('\n5️⃣  STARTUP-GUIDE.md (optional)', 'yellow');
print('   └─ Detailed troubleshooting', 'blue');

print('\n' + '═'.repeat(70), 'blue');
print('⚡ SYSTEM REQUIREMENTS CHECK', 'bright');
print('═'.repeat(70), 'blue');

try {
    const nodeVersion = require('child_process').execSync('node --version', { encoding: 'utf-8' }).trim();
    print(`\n✓ Node.js: ${nodeVersion}`, 'green');
} catch {
    print('\n✗ Node.js: NOT FOUND', 'yellow');
}

try {
    const npmVersion = require('child_process').execSync('npm --version', { encoding: 'utf-8' }).trim();
    print(`✓ npm: ${npmVersion}`, 'green');
} catch {
    print('✗ npm: NOT FOUND', 'yellow');
}

try {
    require('child_process').execSync('docker --version', { encoding: 'utf-8' });
    print('✓ Docker: INSTALLED', 'green');
} catch {
    print('✗ Docker: NOT FOUND (will need it)', 'yellow');
}

try {
    require('child_process').execSync('docker-compose --version', { encoding: 'utf-8' });
    print('✓ Docker Compose: INSTALLED', 'green');
} catch {
    print('✗ Docker Compose: NOT FOUND (will need it)', 'yellow');
}

print('\n' + '═'.repeat(70), 'blue');
print('🚀 READY TO START?', 'bright');
print('═'.repeat(70), 'blue');

print(`
${colors.green}
   node run-complete-project.js
${colors.reset}

${colors.bright}This single command will:${colors.reset}
   ✓ Check prerequisites
   ✓ Install dependencies
   ✓ Start Docker services
   ✓ Build all microservices
   ✓ Initialize database
   ✓ Start all services

${colors.bright}Estimated time: 2-3 minutes (first run)${colors.reset}

`);

print('═'.repeat(70), 'blue');
print('📞 SUPPORT', 'bright');
print('═'.repeat(70), 'blue');

print('\nIf something goes wrong:', 'yellow');
print('  1. Check project-status.js', 'blue');
print('  2. Read STARTUP-GUIDE.md', 'blue');
print('  3. Check QUICK-START.md troubleshooting', 'blue');

print('\nFor more details:', 'yellow');
print('  • Check START-HERE.md', 'blue');
print('  • Check README.md', 'blue');
print('  • Check individual service READMEs in apps/', 'blue');

print('\n' + '═'.repeat(70), 'blue');
print(`${colors.green}Everything is ready! Let's go! 🎉${colors.reset}`);
print('═'.repeat(70), 'blue');
print('');
