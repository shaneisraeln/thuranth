#!/usr/bin/env node

/**
 * PDCP Demo Server
 * 
 * A simple demonstration server that showcases the PDCP system functionality
 * without requiring full dependency installation.
 */

const http = require('http');
const url = require('url');

console.log('🚀 Starting PDCP Demo Server...\n');

// Mock data for demonstration
const mockData = {
    vehicles: [{
            id: 'vehicle-001',
            type: 'FOUR_WHEELER',
            driverId: 'driver-001',
            registrationNumber: 'MH-01-AB-1234',
            currentLocation: {
                latitude: 19.0760,
                longitude: 72.8777
            },
            capacity: {
                maxWeight: 1000,
                maxVolume: 50,
                currentWeight: 200,
                currentVolume: 10
            },
            status: 'AVAILABLE'
        },
        {
            id: 'vehicle-002',
            type: 'TWO_WHEELER',
            driverId: 'driver-002',
            registrationNumber: 'MH-01-CD-5678',
            currentLocation: {
                latitude: 19.1136,
                longitude: 72.8697
            },
            capacity: {
                maxWeight: 50,
                maxVolume: 5,
                currentWeight: 15,
                currentVolume: 2
            },
            status: 'IN_TRANSIT'
        }
    ],
    parcels: [{
        id: 'parcel-001',
        trackingNumber: 'PDCP-001',
        pickupLocation: {
            latitude: 19.0760,
            longitude: 72.8777
        },
        deliveryLocation: {
            latitude: 19.1136,
            longitude: 72.8697
        },
        weight: 5.5,
        dimensions: {
            length: 30,
            width: 20,
            height: 15
        },
        status: 'PENDING_ASSIGNMENT',
        slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }],
    analytics: {
        vehiclesAvoided: 12,
        utilizationImprovement: 23.5,
        emissionsSaved: 45.2,
        slaAdherence: 98.7
    }
};

// Route handlers
function handleHome(req, res) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>PDCP - Post-Dispatch Consolidation Platform</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
        .header { text-align: center; margin-bottom: 40px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 30px 0; }
        .stat { background: #27ae60; color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .services { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .service { background: #ecf0f1; padding: 20px; border-radius: 8px; }
        .service a { color: #3498db; text-decoration: none; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚚 PDCP - Post-Dispatch Consolidation Platform</h1>
            <p>B2B SaaS platform for last-mile logistics consolidation</p>
        </div>
        
        <div class="stats">
            <div class="stat">
                <h3>${mockData.analytics.vehiclesAvoided}</h3>
                <p>Vehicles Avoided</p>
            </div>
            <div class="stat">
                <h3>${mockData.analytics.utilizationImprovement}%</h3>
                <p>Utilization Improvement</p>
            </div>
            <div class="stat">
                <h3>${mockData.analytics.emissionsSaved} kg</h3>
                <p>CO₂ Emissions Saved</p>
            </div>
            <div class="stat">
                <h3>${mockData.analytics.slaAdherence}%</h3>
                <p>SLA Adherence</p>
            </div>
        </div>
        
        <div class="services">
            <div class="service">
                <h3>🚛 Vehicle Tracking</h3>
                <p>Real-time vehicle location and capacity management</p>
                <a href="/vehicles">View Vehicles →</a>
            </div>
            <div class="service">
                <h3>📦 Parcel Management</h3>
                <p>Parcel lifecycle and SLA monitoring</p>
                <a href="/parcels">View Parcels →</a>
            </div>
            <div class="service">
                <h3>🧠 Decision Engine</h3>
                <p>AI-powered consolidation decisions</p>
                <a href="/decisions">View Decisions →</a>
            </div>
            <div class="service">
                <h3>📊 Analytics</h3>
                <p>Impact measurement and reporting</p>
                <a href="/analytics">View Analytics →</a>
            </div>
        </div>
    </div>
</body>
</html>`;

    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    res.end(html);
}

function handleHealth(req, res) {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            'decision-engine': 'healthy',
            'vehicle-tracking': 'healthy',
            'parcel-management': 'healthy',
            'analytics': 'healthy'
        },
        version: '1.0.0',
        uptime: process.uptime()
    };

    res.writeHead(200, {
        'Content-Type': 'application/json'
    });
    res.end(JSON.stringify(health, null, 2));
}

function handleVehicles(req, res) {
    const response = {
        vehicles: mockData.vehicles,
        total: mockData.vehicles.length,
        available: mockData.vehicles.filter(v => v.status === 'AVAILABLE').length
    };

    res.writeHead(200, {
        'Content-Type': 'application/json'
    });
    res.end(JSON.stringify(response, null, 2));
}

function handleParcels(req, res) {
    res.writeHead(200, {
        'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({
        parcels: mockData.parcels
    }, null, 2));
}

function handleAnalytics(req, res) {
    res.writeHead(200, {
        'Content-Type': 'application/json'
    });
    res.end(JSON.stringify(mockData.analytics, null, 2));
}

function handleDecisions(req, res) {
    const decisions = {
        decisions: [{
            id: 'decision-001',
            parcelId: 'parcel-001',
            recommendedVehicleId: 'vehicle-001',
            score: 85.5,
            explanation: 'Optimal route efficiency and capacity utilization'
        }]
    };

    res.writeHead(200, {
        'Content-Type': 'application/json'
    });
    res.end(JSON.stringify(decisions, null, 2));
}

function handle404(req, res) {
    res.writeHead(404, {
        'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({
        error: 'Not found'
    }));
}

// Routes
const routes = {
    '/': handleHome,
    '/health': handleHealth,
    '/vehicles': handleVehicles,
    '/parcels': handleParcels,
    '/decisions': handleDecisions,
    '/analytics': handleAnalytics
};

// Create server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;

    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const handler = routes[path] || handle404;
    handler(req, res);
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('🎉 PDCP Demo Server Started Successfully!\n');
    console.log('='.repeat(50));
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log('='.repeat(50));
    console.log('\n📍 Available Endpoints:');
    console.log(`   • Home Page: http://localhost:${PORT}/`);
    console.log(`   • Health Check: http://localhost:${PORT}/health`);
    console.log(`   • Vehicles: http://localhost:${PORT}/vehicles`);
    console.log(`   • Parcels: http://localhost:${PORT}/parcels`);
    console.log(`   • Decisions: http://localhost:${PORT}/decisions`);
    console.log(`   • Analytics: http://localhost:${PORT}/analytics`);
    console.log('\n🚀 Quick Start:');
    console.log(`   1. Open http://localhost:${PORT} in your browser`);
    console.log(`   2. Explore the API endpoints`);
    console.log(`   3. Test with: curl http://localhost:${PORT}/health`);
    console.log('\n🛑 Press Ctrl+C to stop the server\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down PDCP Demo Server...');
    server.close(() => {
        console.log('✅ Server stopped successfully');
        process.exit(0);
    });
});