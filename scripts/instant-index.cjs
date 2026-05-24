const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

// 1. Read Google Service Account Key
const keyPath = path.join(__dirname, '..', 'google-key.json');
if (!fs.existsSync(keyPath)) {
  console.error('❌ Error: google-key.json not found in the project root directory.');
  console.log('Please download your Service Account JSON key from Google Cloud Console, place it in the project root, and rename it to google-key.json.');
  process.exit(1);
}

const keyData = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
const clientEmail = keyData.client_email;
const privateKey = keyData.private_key;

// Helper to sign JWT using Node.js built-in crypto
function generateJWT() {
  const header = JSON.stringify({ alg: 'RS256', typ: 'JWT' });
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600; // 1 hour expiration
  const payload = JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    exp: exp,
    iat: iat
  });

  const base64UrlHeader = Buffer.from(header).toString('base64url');
  const base64UrlPayload = Buffer.from(payload).toString('base64url');
  const signatureInput = `${base64UrlHeader}.${base64UrlPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  const signature = signer.sign(privateKey, 'base64url');

  return `${signatureInput}.${signature}`;
}

// Helper to request OAuth2 access token from Google
function getAccessToken() {
  return new Promise((resolve, reject) => {
    const jwt = generateJWT();
    const postData = `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`;

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
            reject(new Error(`Failed to get access token: ${data}`));
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
    console.log('🔑 Authenticating with Google Indexing API...');
    const token = await getAccessToken();
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
