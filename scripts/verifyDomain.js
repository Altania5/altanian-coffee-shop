#!/usr/bin/env node

const https = require('https');
const dns = require('dns');
const { promisify } = require('util');

const resolve = promisify(dns.resolve);
const resolveCname = promisify(dns.resolveCname);

const domains = [
    'altaniancoffee.com',
    'www.altaniancoffee.com'
];

const expectedTargets = {
    'altaniancoffee.com': 'regular-dryosaurus-5h3y4tnx5x7hpi2ca293a7em.herokudns.com',
    'www.altaniancoffee.com': 'triangular-iceberg-r3g6ywktuv9gk0mtypdlr19a.herokudns.com'
};

async function checkDNS(domain) {
    console.log(`\n🔍 Checking DNS for ${domain}:`);
    
    try {
        // Try to resolve CNAME
        try {
            const cnames = await resolveCname(domain);
            console.log(`   ✅ CNAME: ${cnames[0]}`);
            
            const expected = expectedTargets[domain];
            if (cnames[0] === expected) {
                console.log(`   ✅ DNS Target: Correct (${expected})`);
            } else {
                console.log(`   ❌ DNS Target: Expected ${expected}, got ${cnames[0]}`);
            }
        } catch (error) {
            // If CNAME fails, try A record
            try {
                const addresses = await resolve(domain, 'A');
                console.log(`   ⚠️  A Record: ${addresses.join(', ')} (Should be CNAME instead)`);
            } catch (aError) {
                console.log(`   ❌ DNS: No records found - ${error.message}`);
            }
        }
        
    } catch (error) {
        console.log(`   ❌ DNS Error: ${error.message}`);
    }
}

async function checkHTTP(domain) {
    console.log(`\n🌐 Checking HTTP for ${domain}:`);
    
    return new Promise((resolve) => {
        const options = {
            hostname: domain,
            port: 443,
            path: '/',
            method: 'GET',
            timeout: 10000,
            headers: {
                'User-Agent': 'Domain-Checker/1.0'
            }
        };

        const req = https.request(options, (res) => {
            console.log(`   ✅ HTTPS Status: ${res.statusCode}`);
            console.log(`   ✅ Server: ${res.headers.server || 'Unknown'}`);
            
            if (res.headers.location) {
                console.log(`   ↗️  Redirect: ${res.headers.location}`);
            }
            
            resolve(true);
        });

        req.on('error', (error) => {
            console.log(`   ❌ HTTPS Error: ${error.message}`);
            resolve(false);
        });

        req.on('timeout', () => {
            console.log(`   ❌ HTTPS Timeout: Request timed out`);
            req.destroy();
            resolve(false);
        });

        req.end();
    });
}

async function checkHerokuDirectly() {
    console.log(`\n🚀 Checking Heroku app directly:`);
    
    return new Promise((resolve) => {
        const options = {
            hostname: 'altanian-coffee-shop-b74ac47acbb4.herokuapp.com',
            port: 443,
            path: '/',
            method: 'GET',
            timeout: 5000
        };

        const req = https.request(options, (res) => {
            console.log(`   ✅ Heroku Direct Status: ${res.statusCode}`);
            resolve(true);
        });

        req.on('error', (error) => {
            console.log(`   ❌ Heroku Direct Error: ${error.message}`);
            resolve(false);
        });

        req.on('timeout', () => {
            console.log(`   ❌ Heroku Direct Timeout`);
            req.destroy();
            resolve(false);
        });

        req.end();
    });
}

async function main() {
    console.log('🌐 Domain Configuration Checker');
    console.log('================================');
    
    // Check Heroku app directly first
    await checkHerokuDirectly();
    
    // Check DNS and HTTP for each domain
    for (const domain of domains) {
        await checkDNS(domain);
        await checkHTTP(domain);
        
        console.log(''); // Add spacing
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Ensure nameservers are set to Cloudflare in Squarespace');
    console.log('2. Add the CNAME records shown above to Cloudflare DNS');  
    console.log('3. Set Proxy Status to "DNS only" (gray cloud) in Cloudflare');
    console.log('4. Wait 5-10 minutes for DNS propagation');
    console.log('5. Run this script again to verify');
}

// Run the checker
main().catch(console.error);
