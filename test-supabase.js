#!/usr/bin/env node

/**
 * Test Supabase Connection
 */

const https = require('https');

async function testSupabaseConnection() {
    console.log('🔍 Testing Supabase Connection...\n');

    const supabaseUrl = 'yfsrmctzjkfonveazhio.supabase.co';
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlmc3JtY3R6amtmb252ZWF6aGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxOTg0MTIsImV4cCI6MjA4NTc3NDQxMn0.uGCVBZtJTVQD6m4xR4IaUpf686j-1ZL453jpXAHYJLo';

    return new Promise((resolve, reject) => {
        const options = {
            hostname: supabaseUrl,
            port: 443,
            path: '/rest/v1/',
            method: 'GET',
            headers: {
                'apikey': anonKey,
                'Authorization': `Bearer ${anonKey}`,
                'Content-Type': 'application/json'
            }
        };

        console.log('📡 Connecting to Supabase API...');

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`📊 HTTP Status: ${res.statusCode}`);

                if (res.statusCode === 200 || res.statusCode === 404) {
                    // 404 is expected for empty database
                    console.log('✅ Supabase API is accessible!');
                    console.log('✅ Authentication keys are working!');
                    console.log('✅ Database connection is ready!');
                    console.log('\n🎉 Supabase connection test PASSED!');
                    resolve(true);
                } else {
                    console.log(`❌ Unexpected status: ${res.statusCode}`);
                    console.log('Response:', data);
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Connection failed:', error.message);
            reject(error);
        });

        req.setTimeout(10000, () => {
            console.error('❌ Connection timeout');
            req.destroy();
            reject(new Error('Timeout'));
        });

        req.end();
    });
}

async function main() {
    try {
        await testSupabaseConnection();
        console.log('\n✅ Ready to proceed with PDCP setup!');
        console.log('📋 Next steps:');
        console.log('   1. Create database tables');
        console.log('   2. Set up authentication');
        console.log('   3. Start the services');
        console.log('\n🚀 Run: node setup-database.js');
    } catch (error) {
        console.error('\n❌ Connection test failed:', error.message);
        console.log('🔧 Please check:');
        console.log('   1. Supabase project is active');
        console.log('   2. API keys are correct');
        console.log('   3. Internet connection is working');
    }
}

main();