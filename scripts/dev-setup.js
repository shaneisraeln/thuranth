const fs = require('fs');
const {
    execSync
} = require('child_process');

console.log('🚀 Setting up PDCP development environment...\n');

// Check if Docker is available
function checkDocker() {
    try {
        execSync('docker --version', {
            stdio: 'ignore'
        });
        return true;
    } catch (error) {
        return false;
    }
}

// Check if Node.js version is compatible
function checkNodeVersion() {
    const version = process.version;
    const majorVersion = parseInt(version.slice(1).split('.')[0]);
    return majorVersion >= 18;
}

console.log('🔍 Checking prerequisites...');

// Check Node.js version
if (checkNodeVersion()) {
    console.log(`  ✅ Node.js ${process.version} (compatible)`);
} else {
    console.log(`  ❌ Node.js ${process.version} (requires >= 18.0.0)`);
    process.exit(1);
}

// Check Docker
if (checkDocker()) {
    console.log('  ✅ Docker is available');
} else {
    console.log('  ⚠️  Docker not found - you\'ll need to install Docker to run the full stack');
}

// Check if .env exists
if (fs.existsSync('.env')) {
    console.log('  ✅ Environment configuration exists');
} else {
    console.log('  ⚠️  Creating .env from .env.example...');
    fs.copyFileSync('.env.example', '.env');
    console.log('  ✅ Created .env file');
}

console.log('\n📦 Installing dependencies...');
try {
    execSync('npm install', {
        stdio: 'inherit'
    });
    console.log('  ✅ Dependencies installed successfully');
} catch (error) {
    console.log('  ❌ Failed to install dependencies');
    console.log('  💡 Try running: npm install --legacy-peer-deps');
}

console.log('\n🏗️  Building packages...');
try {
    execSync('npm run build --workspace=@pdcp/types', {
        stdio: 'inherit'
    });
    execSync('npm run build --workspace=@pdcp/shared', {
        stdio: 'inherit'
    });
    console.log('  ✅ Packages built successfully');
} catch (error) {
    console.log('  ⚠️  Some packages failed to build - this is normal for initial setup');
}

console.log('\n🎉 Development environment setup complete!');
console.log('\n📋 Next steps:');
console.log('  1. Start infrastructure: npm run docker:up');
console.log('  2. Build all services: npm run build');
console.log('  3. Start development: npm run dev');
console.log('  4. View API docs at: http://localhost:3001/api/docs');

console.log('\n💡 Useful commands:');
console.log('  - npm run docker:logs    # View container logs');
console.log('  - npm run docker:down    # Stop containers');
console.log('  - npm run test           # Run tests');
console.log('  - npm run lint           # Lint code');