const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const url = require('url');

// 1. Read Google OAuth Client Secrets
const secretPath = path.join(__dirname, '..', 'client_secret.json');
if (!fs.existsSync(secretPath)) {
  console.error('❌ Error: client_secret.json not found in the project root directory.');
  console.log('Please download your OAuth client JSON credentials from Google Cloud, place it in the project root, and rename it to client_secret.json.');
  process.exit(1);
}

const secretData = JSON.parse(fs.readFileSync(secretPath, 'utf8'));
const webOrInstalled = secretData.installed || secretData.web;

if (!webOrInstalled) {
  console.error('❌ Error: Invalid client_secret.json format.');
  process.exit(1);
}

const clientId = webOrInstalled.client_id;
const clientSecret = webOrInstalled.client_secret;
const redirectUri = 'http://localhost:8080';

// Helper to start local server and get OAuth code
function getAuthCode() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url, true);
      if (parsedUrl.pathname === '/') {
        const code = parsedUrl.query.code;
        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<h1>✅ Success!</h1><p>Authentication was successful. You can close this window now and return to your terminal.</p>');
          res.connection.end();
          server.close();
          resolve(code);
        } else {
          res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Authorization code not found.');
          res.connection.end();
          server.close();
          reject(new Error('No code found in redirect.'));
        }
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(8080, '127.0.0.1', () => {
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/indexing`;
      console.log('\n🔑 Authentication Required!');
      console.log('Please open the following link in your browser to authorize your account:');
      console.log(`\n\x1b[36m${authUrl}\x1b[0m\n`);
      console.log('Waiting for you to log in in the browser...');
    });
  });
}

// Helper to exchange authorization code for access token
function exchangeCodeForToken(code) {
  return new Promise((resolve, reject) => {
    const postData = `code=${encodeURIComponent(code)}&client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&grant_type=authorization_code`;

    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error(`Failed to exchange code: ${data}`));
          }
        } catch (e) {
          reject(new Error(`Response parsing failed: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Helper to notify Google Indexing API about a URL
function notifyIndexing(accessToken, url, type = 'URL_UPDATED') {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      url: url,
      type: type
    });

    const req = https.request({
      hostname: 'indexing.googleapis.com',
      path: '/v3/urlNotifications:publish',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`API Error (Status ${res.statusCode}): ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Main execution
async function main() {
  try {
    const code = await getAuthCode();
    console.log('🔑 Authenticating and fetching access token...');
    const token = await exchangeCodeForToken(code);
    console.log('✅ Authentication successful!');

    // Read URLs from sitemap.xml
    const sitemapPath = path.join(__dirname, '..', 'public', 'sitemap.xml');
    if (!fs.existsSync(sitemapPath)) {
      console.error('❌ Error: public/sitemap.xml not found.');
      process.exit(1);
    }

    const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
    const urlMatches = sitemapContent.match(/<loc>(https?:\/\/[^<]+)<\/loc>/g) || [];
    const urls = urlMatches.map(m => m.replace(/<\/?loc>/g, ''));

    if (urls.length === 0) {
      console.log('⚠️ No URLs found in sitemap.xml.');
      return;
    }

    console.log(`📡 Found ${urls.length} URLs in sitemap.xml. Starting instant indexing...`);

    for (const url of urls) {
      try {
        console.log(`📤 Requesting indexing for: ${url}`);
        await notifyIndexing(token, url);
        console.log(`   ✅ Success!`);
        // Add a slight delay to respect rate limits
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`   ❌ Failed: ${err.message}`);
      }
    }

    console.log('\n🎉 Finished requesting indexing for all pages! Googlebot will crawl them shortly.');
  } catch (error) {
    console.error('💥 Critical Error:', error.message);
  }
}

main();
