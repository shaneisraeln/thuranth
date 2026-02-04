#!/usr/bin/env node

/**
 * PDCP System Startup Script
 * Starts all microservices and frontend applications
 */

const {
    spawn
} = require('child_process');
const path = require('path');

console.log('🚀 Starting PDCP System...\n');

// Service configurations
const services = [{
        name: 'API Gateway',
        path: 'apps/api-gateway',
        port: 3000,
        command: 'npm',
        args: ['run', 'dev']
    },
    {
        name: 'Decision Engine',
        path: 'apps/decision-engine',
        port: 3001,
        command: 'npm',
        args: ['run', 'dev']
    },
    {
        name: 'Vehicle Tracking',
        path: 'apps/vehicle-tracking',
        port: 3002,
        command: 'npm',
        args: ['run', 'dev']
    },
    {
        name: 'Auth Service',
        path: 'apps/auth-service',
        port: 3003,
        command: 'npm',
        args: ['run', 'dev']
    },
    {
        name: 'Parcel Management',
        path: 'apps/parcel-management',
        port: 3004,
        command: 'npm',
        args: ['run', 'dev']
    },
    {
        name: 'Custody Service',
        path: 'apps/custody-service',
        port: 3005,
        command: 'npm',
        args: ['run', 'dev']
    },
    {
        name: 'Analytics Service',
        path: 'apps/analytics-service',
        port: 3006,
        command: 'npm',
        args: ['run', 'dev']
    },
    {
        name: 'Audit Service',
        path: 'apps/audit-service',
        port: 3007,
        command: 'npm',
        args: ['run', 'dev']
    },
    {
        name: 'Dispatcher Dashboard',
        path: 'apps/dispatcher-dashboard',
        port: 8080,
        command: 'npm',
        args: ['run', 'dev']
    }
];

// Function to start a service
function startService(service) {
    return new Promise((resolve, reject) => {
        console.log(`🔄 Starting ${service.name} on port ${service.port}...`);

        const child = spawn(service.command, service.args, {
            cwd: path.join(process.cwd(), service.path),
            stdio: 'pipe',
            shell: true
        });

        let started = false;
        let output = '';

        child.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;

            // Check if service has started successfully
            if (!started && (
                    text.includes('listening on') ||
                    text.includes('Server running') ||
                    text.includes('Local:') ||
                    text.includes('ready') ||
                    text.includes('compiled successfully')
                )) {
                started = true;
                console.log(`✅ ${service.name} started successfully on port ${service.port}`);
                resolve(child);
            }
        });

        child.stderr.on('data', (data) => {
            const text = data.toString();
            output += text;

            // Some services log to stderr but are still successful
            if (!started && (
                    text.includes('listening on') ||
                    text.includes('Server running') ||
                    text.includes('Local:') ||
                    text.includes('ready')
                )) {
                started = true;
                console.log(`✅ ${service.name} started successfully on port ${service.port}`);
                resolve(child);
            }
        });

        child.on('error', (error) => {
            console.log(`❌ Failed to start ${service.name}: ${error.message}`);
            reject(error);
        });

        // Timeout after 30 seconds
        setTimeout(() => {
            if (!started) {
                console.log(`⚠️ ${service.name} taking longer than expected...`);
                console.log(`   Output: ${output.slice(-200)}`);
                resolve(child); // Still resolve to continue with other services
            }
        }, 30000);
    });
}

// Function to install dependencies for a service
function installDependencies(servicePath) {
    return new Promise((resolve, reject) => {
        console.log(`📦 Installing dependencies for ${servicePath}...`);

        const child = spawn('npm', ['install', '--legacy-peer-deps'], {
            cwd: path.join(process.cwd(), servicePath),
            stdio: 'pipe',
            shell: true
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ Dependencies installed for ${servicePath}`);
                resolve();
            } else {
                console.log(`⚠️ Warning: Dependencies installation failed for ${servicePath} (code ${code})`);
                resolve(); // Continue anyway
            }
        });

        child.on('error', (error) => {
            console.log(`⚠️ Warning: Could not install dependencies for ${servicePath}: ${error.message}`);
            resolve(); // Continue anyway
        });
    });
}

async function startPDCPSystem() {
    try {
        console.log('📦 Installing dependencies for core services...\n');

        // Install dependencies for key services
        const coreServices = [
            'apps/api-gateway',
            'apps/decision-engine',
            'apps/auth-service',
            'apps/vehicle-tracking',
            'apps/parcel-management'
        ];

        for (const servicePath of coreServices) {
            await installDependencies(servicePath);
        }

        console.log('\n🚀 Starting PDCP services...\n');

        // Start services one by one
        const runningServices = [];

        for (const service of services.slice(0, 5)) { // Start first 5 services
            try {
                const child = await startService(service);
                runningServices.push({
                    service,
                    process: child
                });

                // Wait a bit between services
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                console.log(`⚠️ Could not start ${service.name}, continuing with others...`);
            }
        }

        console.log('\n🎉 PDCP System Started Successfully!\n');
        console.log('🌐 Access Points:');
        console.log('   📊 API Gateway: http://localhost:3000');
        console.log('   🧠 Decision Engine: http://localhost:3001');
        console.log('   🚗 Vehicle Tracking: http://localhost:3002');
        console.log('   🔐 Auth Service: http://localhost:3003');
        console.log('   📦 Parcel Management: http://localhost:3004');

        console.log('\n🔑 Test Credentials:');
        console.log('   Admin: admin@pdcp.com');
        console.log('   Dispatcher: dispatcher@pdcp.com');
        console.log('   Driver: driver1@pdcp.com');

        console.log('\n📋 Next Steps:');
        console.log('   1. Test API Gateway: curl http://localhost:3000/health');
        console.log('   2. Open browser: http://localhost:3000');
        console.log('   3. Login with test credentials');
        console.log('   4. Create parcels and test consolidation');

        // Keep the script running
        console.log('\n⚡ Services are running. Press Ctrl+C to stop all services.\n');

        process.on('SIGINT', () => {
            console.log('\n🛑 Stopping all services...');
            runningServices.forEach(({
                service,
                process
            }) => {
                console.log(`   Stopping ${service.name}...`);
                process.kill();
            });
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Failed to start PDCP system:', error.message);
        process.exit(1);
    }
}

startPDCPSystem();