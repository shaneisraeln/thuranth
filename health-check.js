#!/usr/bin/env node

/**
 * PDCP Health Check Script
 * 
 * This script checks the health of all PDCP services and provides
 * a quick overview of system status.
 */

const http = require('http');
const https = require('https');

const services = [{
        name: 'API Gateway',
        url: 'http://localhost:3000/health'
    },
    {
        name: 'Decision Engine',
        url: 'http://localhost:3001/health'
    },
    {
        name: 'Vehicle Tracking',
        url: 'http://localhost:3002/health'
    },
    {
        name: 'Auth Service',
        url: 'http://localhost:3003/health'
    },
    {
        name: 'Parcel Management',
        url: 'http://localhost:3004/health'
    },
    {
        name: 'Custody Service',
        url: 'http://localhost:3005/health'
    },
    {
        name: 'Analytics Service',
        url: 'http://localhost:3006/health'
    },
    {
        name: 'Audit Service',
        url: 'http://localhost:3007/health'
    }
];

function checkService(service) {
    return new Promise((resolve) => {
        const url = new URL(service.url);
        const client = url.protocol === 'https:' ? https : http;

        const req = client.get(service.url, {
            timeout: 5000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    name: service.name,
                    status: res.statusCode === 200 ? 'healthy' : 'unhealthy',
                    statusCode: res.statusCode,
                    response: data
                });
            });
        });

        req.on('error', (error) => {
            resolve({
                name: service.name,
                status: 'offline',
                error: error.message
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                name: service.name,
                status: 'timeout',
                error: 'Request timeout'
            });
        });
    });
}

async function main() {
    console.log('🏥 PDCP Health Check\n');
    console.log('Checking all services...\n');

    const results = await Promise.all(services.map(checkService));

    console.log('📊 Service Status:');
    console.log('='.repeat(50));

    let healthyCount = 0;
    let totalCount = results.length;

    results.forEach(result => {
        let statusIcon = '❌';
        let statusColor = '\x1b[31m'; // Red

        if (result.status === 'healthy') {
            statusIcon = '✅';
            statusColor = '\x1b[32m'; // Green
            healthyCount++;
        } else if (result.status === 'offline') {
            statusIcon = '🔴';
            statusColor = '\x1b[31m'; // Red
        } else if (result.status === 'timeout') {
            statusIcon = '⏰';
            statusColor = '\x1b[33m'; // Yellow
        }

        console.log(`${statusIcon} ${statusColor}${result.name.padEnd(20)}${'\x1b[0m'} ${result.status.toUpperCase()}`);

        if (result.error) {
            console.log(`   Error: ${result.error}`);
        }
        if (result.statusCode && result.statusCode !== 200) {
            console.log(`   Status Code: ${result.statusCode}`);
        }
    });

    console.log('='.repeat(50));
    console.log(`📈 Overall Health: ${healthyCount}/${totalCount} services healthy`);

    if (healthyCount === 0) {
        console.log('\n❌ No services are running. Try starting the development environment:');
        console.log('   node run-dev.js');
    } else if (healthyCount < totalCount) {
        console.log('\n⚠️  Some services are not responding. This is normal during development.');
        console.log('   Core services (API Gateway, Auth) should be running for basic functionality.');
    } else {
        console.log('\n🎉 All services are healthy!');
    }

    console.log('\n🔗 Quick Links:');
    console.log('   • API Gateway: http://localhost:3000');
    console.log('   • API Documentation: http://localhost:3000/api');
    console.log('   • Health Check: http://localhost:3000/health');

    console.log('\n🧪 Test Commands:');
    console.log('   • curl http://localhost:3000/health');
    console.log('   • curl http://localhost:3000/api');
    console.log('   • node health-check.js');
}

main().catch(console.error);