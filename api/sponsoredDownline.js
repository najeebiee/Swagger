// api/sponsoredDownline.js

import crypto from 'crypto';

// This hash is what you use in Postman to load the whole tree
const ROOT_DOWNLINE_HASH = 'b1a2f3c4d5e6f708192a0b1c2d3e4f50';

export default async function handler(req, res) {
  try {
    const { user, apikey, username, accounthash } = req.query;

    const url = new URL('https://gmin.onegrindersguild.com/api.get.sponsored.php');

    if (user)   url.searchParams.set('user', user);
    if (apikey) url.searchParams.set('apikey', apikey);

    let hashToSend = accounthash;

    if (!hashToSend) {
      if (username) {
        hashToSend = crypto.create.hash('md5').update(username).digest('hex');
        } else {
        hashToSend = ROOT_DOWNLINE_HASH;
      }
    }

    url.searchParams.set('accounthash', hashToSend);

    console.log('[Vercel] Calling SPONSORED DOWNLINE upstream:', url.toString());

    const response = await fetch(url.toString());
    const text = await response.text();

    console.log('[Vercel] SPONSORED DOWNLINE upstream status:', response.status, 'length:', text.length);

    res.setHeader('Content-Type', 'application/json');
    res.status(response.status).send(text);
  } catch (err) {
    console.error('Vercel /api/sponsoredDownline failed:', err);
    res.status(500).json({ error: 'Proxy failed', details: err.message });
  }
}