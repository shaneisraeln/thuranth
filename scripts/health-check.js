const http = require('http');

const services = [{
        name: 'Decision Engine',
        port: 3001
    },
    {
        name: 'Vehicle Tracking',
        port: 3002
    },
    {
        name: 'Parcel Management',
        port: 3003
    },
    {
        name: 'Custody Service',
        port: 3004
    },
    {
        name: 'Analytics Service',
        port: 3005
    },
    {
        name: 'Audit Service',
        port: 3006
    }
];

console.log('🏥 PDCP Health Check\n');

async function checkService(service) {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${service.port}/health`, (res) => {
            resolve({
                name: service.name,
                port: service.port,
                status: res.statusCode === 200 ? 'healthy' : 'unhealthy',
                statusCode: res.statusCode
            });
        });

        req.on('error', () => {
            resolve({
                name: service.name,
                port: service.port,
                status: 'offline',
                statusCode: null
            });
        });

        req.setTimeout(5000, () => {
            req.destroy();
            resolve({
                name: service.name,
                port: service.port,
                status: 'timeout',
                statusCode: null
            });
        });
    });
}

async function runHealthCheck() {
    const results = await Promise.all(services.map(checkService));

    results.forEach(result => {
        const icon = result.status === 'healthy' ? '✅' :
            result.status === 'offline' ? '❌' : '⚠️';
        console.log(`${icon} ${result.name} (port ${result.port}): ${result.status}`);
    });

    const healthyCount = results.filter(r => r.status === 'healthy').length;
    const totalCount = results.length;

    console.log(`\n📊 Summary: ${healthyCount}/${totalCount} services healthy`);

    if (healthyCount === 0) {
        console.log('\n💡 No services are running. Try:');
        console.log('  1. npm run docker:up');
        console.log('  2. npm run dev');
    } else if (healthyCount < totalCount) {
        console.log('\n💡 Some services are not responding. Check:');
        console.log('  1. Service logs: npm run docker:logs');
        console.log('  2. Restart services: npm run dev');
    }
}

runHealthCheck().catch(console.error);