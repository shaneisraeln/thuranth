#!/usr/bin/env node

/**
 * PDCP System Health Check
 * Tests all services and endpoints
 */

const https = require('https');
const http = require('http');

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
    }
];

function checkService(service) {
    return new Promise((resolve) => {
        const client = service.url.startsWith('https') ? https : http;

        const req = client.get(service.url, (res) => {
            if (res.statusCode === 200) {
                console.log(`✅ ${service.name}: Healthy`);
                resolve(true);
            } else {
                console.log(`⚠️ ${service.name}: Status ${res.statusCode}`);
                resolve(false);
            }
        });

        req.on('error', () => {
            console.log(`❌ ${service.name}: Not responding`);
            resolve(false);
        });

        req.setTimeout(5000, () => {
            console.log(`⏰ ${service.name}: Timeout`);
            req.destroy();
            resolve(false);
        });
    });
}

async function checkSystemHealth() {
    console.log('🏥 PDCP System Health Check\n');

    const results = [];
    for (const service of services) {
        const isHealthy = await checkService(service);
        results.push(isHealthy);
    }

    const healthyCount = results.filter(r => r).length;
    const totalCount = results.length;

    console.log(`\n📊 System Status: ${healthyCount}/${totalCount} services healthy`);

    if (healthyCount === totalCount) {
        console.log('🎉 All services are running perfectly!');
    } else if (healthyCount > 0) {
        console.log('⚠️ Some services are running, system partially operational');
    } else {
        console.log('❌ No services responding, check if system is started');
    }
}

checkSystemHealth();