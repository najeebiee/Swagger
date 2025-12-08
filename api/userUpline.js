// api/userUpline.js

import crypto from 'crypto';

// This hash is what you use in Postman to load the whole tree
const ROOT_UPLINE_HASH = 'a835fe3a228fc669c76b90504b7c08e5';

export default async function handler(req, res) {
  try {
    const { user, apikey, username, accounthash } = req.query;

    const url = new URL('https://gmin.onegrindersguild.com/api.get.user.upline.binary.php');

    if (user)   url.searchParams.set('user', user);
    if (apikey) url.searchParams.set('apikey', apikey);

    // Decide which hash to send:
    // 1) If caller gave an explicit accounthash, use it
    // 2) Else if username given, MD5(username)
    // 3) Else use ROOT_UPLINE_HASH (full tree)
    let hashToSend = accounthash;

    if (!hashToSend) {
      if (username) {
        hashToSend = crypto.createHash('md5').update(username).digest('hex');
      } else {
        hashToSend = ROOT_UPLINE_HASH;
      }
    }

    url.searchParams.set('accounthash', hashToSend);

    console.log('[Vercel] Calling USER UPLINE upstream:', url.toString());

    const response = await fetch(url.toString());
    const text = await response.text();

    console.log('[Vercel] USER UPLINE upstream status:', response.status, 'length:', text.length);

    res.setHeader('Content-Type', 'application/json');
    res.status(response.status).send(text);
  } catch (err) {
    console.error('Vercel /api/userUpline failed:', err);
    res.status(500).json({ error: 'Proxy failed', details: err.message });
  }
}
