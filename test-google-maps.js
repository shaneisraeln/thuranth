#!/usr/bin/env node

/**
 * Google Maps API Test Script
 * Tests Google Maps API key and required services
 */

require('dotenv').config();
const https = require('https');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

function makeRequest(url, description) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    if (response.status === 'OK') {
                        console.log(`✅ ${description}: Working`);
                        resolve(response);
                    } else {
                        console.log(`❌ ${description}: ${response.status} - ${response.error_message || 'Unknown error'}`);
                        reject(new Error(response.status));
                    }
                } catch (error) {
                    console.log(`❌ ${description}: Invalid JSON response`);
                    reject(error);
                }
            });
        }).on('error', (error) => {
            console.log(`❌ ${description}: Network error - ${error.message}`);
            reject(error);
        });
    });
}

async function testGoogleMapsAPI() {
    console.log('🗺️ Testing Google Maps API...\n');

    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'your_google_maps_key_here') {
        console.log('❌ Google Maps API key not configured in .env file');
        return;
    }

    console.log(`🔑 API Key: ${GOOGLE_MAPS_API_KEY.substring(0, 20)}...`);
    console.log('');

    try {
        // Test 1: Geocoding API
        console.log('📍 Testing Geocoding API...');
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Mumbai,India&key=${GOOGLE_MAPS_API_KEY}`;
        await makeRequest(geocodeUrl, 'Geocoding API (Address to Coordinates)');

        // Test 2: Directions API
        console.log('\n🧭 Testing Directions API...');
        const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=Mumbai&destination=Pune&key=${GOOGLE_MAPS_API_KEY}`;
        await makeRequest(directionsUrl, 'Directions API (Route Planning)');

        // Test 3: Distance Matrix API
        console.log('\n📏 Testing Distance Matrix API...');
        const distanceUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=Mumbai&destinations=Pune&key=${GOOGLE_MAPS_API_KEY}`;
        await makeRequest(distanceUrl, 'Distance Matrix API (Travel Time)');

        console.log('\n🎉 Google Maps API test completed successfully!');
        console.log('\n🚀 Ready for PDCP services:');
        console.log('   ✅ Vehicle location tracking');
        console.log('   ✅ Route optimization');
        console.log('   ✅ Distance calculations');
        console.log('   ✅ Interactive maps in dashboard');
        console.log('   ✅ Navigation for mobile app');

    } catch (error) {
        console.error('\n❌ Google Maps API test failed');

        if (error.message === 'REQUEST_DENIED') {
            console.log('\n🔧 Possible fixes:');
            console.log('   - Enable billing in Google Cloud Console');
            console.log('   - Check API key restrictions');
            console.log('   - Verify APIs are enabled');
        } else if (error.message === 'OVER_QUERY_LIMIT') {
            console.log('\n🔧 Fix: Check billing account and quotas');
        }
    }
}

testGoogleMapsAPI();