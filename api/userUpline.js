// api/userUpline.js
import crypto from 'crypto';

export default async function handler(req, res) {
  try {
    const { user, apikey, username } = req.query;

    if (!username) {
      return res.status(400).json({ error: 'username is required' });
    }

    const accounthash = crypto
      .createHash('md5')
      .update(username)
      .digest('hex');

    const url = new URL('https://gmin.onegrindersguild.com/api.get.user.binary.upline.php');
    url.searchParams.set('user', user);
    url.searchParams.set('apikey', apikey);
    url.searchParams.set('accounthash', accounthash);

    const response = await fetch(url.toString());
    const text = await response.text();

    res.setHeader('Content-Type', 'application/json');
    res.status(response.status).send(text);
  } catch (err) {
    console.error('Vercel /api/userUpline error:', err);
    res.status(500).json({ error: 'Proxy failed', details: err.message });
  }
}
