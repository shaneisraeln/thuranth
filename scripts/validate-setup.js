const fs = require('fs');
const path = require('path');

console.log('🔍 Validating PDCP project structure...\n');

// Check root files
const rootFiles = [
    'package.json',
    'tsconfig.json',
    'docker-compose.yml',
    '.env',
    '.env.example',
    'README.md',
    '.gitignore'
];

console.log('📁 Root files:');
rootFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

// Check packages
const packages = ['types', 'shared'];
console.log('\n📦 Packages:');
packages.forEach(pkg => {
    const pkgPath = path.join('packages', pkg);
    const packageJsonPath = path.join(pkgPath, 'package.json');
    const srcPath = path.join(pkgPath, 'src');

    const exists = fs.existsSync(packageJsonPath) && fs.existsSync(srcPath);
    console.log(`  ${exists ? '✅' : '❌'} packages/${pkg}`);

    if (exists) {
        const srcFiles = fs.readdirSync(srcPath);
        console.log(`    📄 Source files: ${srcFiles.length}`);
    }
});

// Check services
const services = [
    'decision-engine',
    'vehicle-tracking',
    'parcel-management',
    'custody-service',
    'analytics-service',
    'audit-service'
];

console.log('\n🚀 Services:');
services.forEach(service => {
    const servicePath = path.join('apps', service);
    const packageJsonPath = path.join(servicePath, 'package.json');
    const mainPath = path.join(servicePath, 'src', 'main.ts');
    const appModulePath = path.join(servicePath, 'src', 'app.module.ts');

    const exists = fs.existsSync(packageJsonPath) && fs.existsSync(mainPath) && fs.existsSync(appModulePath);
    console.log(`  ${exists ? '✅' : '❌'} apps/${service}`);
});

// Check Docker files
console.log('\n🐳 Docker configuration:');
const dockerFiles = [
    'docker-compose.yml',
    'docker/postgres/init.sql'
];

dockerFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

// Check TypeScript configuration
console.log('\n📝 TypeScript configuration:');
try {
    const tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
    console.log(`  ✅ Root tsconfig.json (target: ${tsconfig.compilerOptions.target})`);

    // Check if paths are configured
    if (tsconfig.compilerOptions.paths) {
        console.log(`  ✅ Path mapping configured`);
    } else {
        console.log(`  ⚠️  Path mapping not configured`);
    }
} catch (error) {
    console.log(`  ❌ Error reading tsconfig.json: ${error.message}`);
}

console.log('\n🎉 Project structure validation complete!');
console.log('\n📋 Next steps:');
console.log('  1. Install Docker and Docker Compose');
console.log('  2. Run: npm run docker:up');
console.log('  3. Run: npm install');
console.log('  4. Run: npm run build');
console.log('  5. Run: npm run dev');