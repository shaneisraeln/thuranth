#!/usr/bin/env node

/**
 * PDCP Development Runner
 * 
 * This script runs the PDCP services in development mode without Docker.
 * It starts services individually and provides a simple way to test the system.
 */

const {
    spawn
} = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting PDCP Development Environment...\n');

// Check if Node.js version is compatible
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 18) {
    console.error('❌ Node.js version 18 or higher is required');
    console.error(`   Current version: ${nodeVersion}`);
    process.exit(1);
}

console.log(`✅ Node.js version: ${nodeVersion}`);

// Services configuration
const services = [{
        name: 'Types Package',
        path: 'packages/types',
        command: 'npm',
        args: ['run', 'build'],
        port: null,
        color: '\x1b[36m', // Cyan
        required: true
    },
    {
        name: 'Shared Package',
        path: 'packages/shared',
        command: 'npm',
        args: ['run', 'build'],
        port: null,
        color: '\x1b[35m', // Magenta
        required: true
    },
    {
        name: 'Auth Service',
        path: 'apps/auth-service',
        command: 'npm',
        args: ['run', 'dev'],
        port: 3003,
        color: '\x1b[32m', // Green
        required: false
    },
    {
        name: 'Decision Engine',
        path: 'apps/decision-engine',
        command: 'npm',
        args: ['run', 'dev'],
        port: 3001,
        color: '\x1b[33m', // Yellow
        required: false
    },
    {
        name: 'Vehicle Tracking',
        path: 'apps/vehicle-tracking',
        command: 'npm',
        args: ['run', 'dev'],
        port: 3002,
        color: '\x1b[34m', // Blue
        required: false
    },
    {
        name: 'API Gateway',
        path: 'apps/api-gateway',
        command: 'npm',
        args: ['run', 'dev'],
        port: 3000,
        color: '\x1b[31m', // Red
        required: false
    }
];

// Function to check if a service directory exists and has package.json
function validateService(service) {
    const servicePath = path.join(process.cwd(), service.path);
    const packageJsonPath = path.join(servicePath, 'package.json');

    if (!fs.existsSync(servicePath)) {
        console.log(`⚠️  ${service.name}: Directory not found at ${service.path}`);
        return false;
    }

    if (!fs.existsSync(packageJsonPath)) {
        console.log(`⚠️  ${service.name}: package.json not found`);
        return false;
    }

    return true;
}

// Function to run a service
function runService(service) {
    return new Promise((resolve, reject) => {
        if (!validateService(service)) {
            if (service.required) {
                reject(new Error(`Required service ${service.name} is not available`));
            } else {
                console.log(`⏭️  Skipping ${service.name} (not available)`);
                resolve();
            }
            return;
        }

        console.log(`${service.color}🔧 Starting ${service.name}...${'\x1b[0m'}`);

        const servicePath = path.join(process.cwd(), service.path);
        const child = spawn(service.command, service.args, {
            cwd: servicePath,
            stdio: 'pipe',
            shell: true,
            env: {
                ...process.env,
                NODE_ENV: 'development',
                PORT: service.port || process.env.PORT
            }
        });

        let output = '';
        let hasStarted = false;

        child.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;

            // Log output with service color
            const lines = text.split('\n').filter(line => line.trim());
            lines.forEach(line => {
                console.log(`${service.color}[${service.name}]${'\x1b[0m'} ${line}`);
            });

            // Check if service has started successfully
            if (!hasStarted && (
                    text.includes('Nest application successfully started') ||
                    text.includes('Server running on') ||
                    text.includes('Application is running on') ||
                    text.includes('Build succeeded') ||
                    text.includes('Successfully compiled')
                )) {
                hasStarted = true;
                if (service.port) {
                    console.log(`${service.color}✅ ${service.name} started on port ${service.port}${'\x1b[0m'}`);
                } else {
                    console.log(`${service.color}✅ ${service.name} built successfully${'\x1b[0m'}`);
                }
                resolve(child);
            }
        });

        child.stderr.on('data', (data) => {
            const text = data.toString();
            console.error(`${service.color}[${service.name} ERROR]${'\x1b[0m'} ${text}`);
        });

        child.on('close', (code) => {
            if (code !== 0 && !hasStarted) {
                console.error(`${service.color}❌ ${service.name} failed to start (exit code ${code})${'\x1b[0m'}`);
                if (service.required) {
                    reject(new Error(`Required service ${service.name} failed to start`));
                } else {
                    resolve();
                }
            } else if (hasStarted) {
                console.log(`${service.color}🔄 ${service.name} restarted${'\x1b[0m'}`);
            }
        });

        child.on('error', (error) => {
            console.error(`${service.color}❌ ${service.name} error: ${error.message}${'\x1b[0m'}`);
            if (service.required) {
                reject(error);
            } else {
                resolve();
            }
        });

        // For build-only services, resolve after a short delay
        if (!service.port) {
            setTimeout(() => {
                if (!hasStarted) {
                    console.log(`${service.color}⏳ ${service.name} build in progress...${'\x1b[0m'}`);
                    resolve(child);
                }
            }, 5000);
        }
    });
}

// Main execution
async function main() {
    console.log('\n📋 Validating services...\n');

    const runningProcesses = [];

    try {
        // Build packages first
        console.log('🔨 Building shared packages...\n');
        for (const service of services.filter(s => s.required)) {
            const process = await runService(service);
            if (process) {
                runningProcesses.push(process);
            }
        }

        // Wait a bit for packages to build
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Start services
        console.log('\n🚀 Starting services...\n');
        for (const service of services.filter(s => !s.required)) {
            try {
                const process = await runService(service);
                if (process) {
                    runningProcesses.push(process);
                }
                // Small delay between service starts
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.log(`⚠️  Failed to start ${service.name}: ${error.message}`);
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('🎉 PDCP Development Environment Started!');
        console.log('='.repeat(60));
        console.log('\n📍 Available Services:');

        services.filter(s => s.port).forEach(service => {
            if (validateService(service)) {
                console.log(`   ${service.color}• ${service.name}:${'\x1b[0m'} http://localhost:${service.port}`);
            }
        });

        console.log('\n🔧 Development Tools:');
        console.log('   • API Documentation: http://localhost:3000/api (when API Gateway is running)');
        console.log('   • Health Checks: http://localhost:3000/health');
        console.log('   • Test API: curl http://localhost:3000/health');

        console.log('\n📝 Next Steps:');
        console.log('   1. Open http://localhost:3000 in your browser');
        console.log('   2. Check service health endpoints');
        console.log('   3. Run integration tests: npm run test');
        console.log('   4. View logs in the console above');

        console.log('\n⚠️  Note: Some services may not start due to missing dependencies.');
        console.log('   This is normal for development. Core services should be working.');

        console.log('\n🛑 Press Ctrl+C to stop all services\n');

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down services...');
            runningProcesses.forEach(proc => {
                if (proc && proc.kill) {
                    proc.kill('SIGTERM');
                }
            });
            process.exit(0);
        });

        // Keep the main process alive
        await new Promise(() => {}); // Run forever

    } catch (error) {
        console.error('\n❌ Failed to start development environment:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('   1. Make sure Node.js 18+ is installed');
        console.log('   2. Run: npm install --legacy-peer-deps');
        console.log('   3. Check that service directories exist');
        console.log('   4. Verify package.json files are present');

        // Clean up any running processes
        runningProcesses.forEach(proc => {
            if (proc && proc.kill) {
                proc.kill('SIGTERM');
            }
        });

        process.exit(1);
    }
}

// Run the development environment
main().catch(console.error);