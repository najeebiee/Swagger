// api/users.js

export default async function handler(req, res) {
  try {
    const { user, apikey, df, dt } = req.query;

    const url = new URL('https://gmin.onegrindersguild.com/api.get.user.php');

    if (user)   url.searchParams.set('user', user);
    if (apikey) url.searchParams.set('apikey', apikey);
    if (df)     url.searchParams.set('df', df);
    if (dt)     url.searchParams.set('dt', dt);

    console.log('[Vercel] Calling USERS upstream:', url.toString());

    const response = await fetch(url.toString());
    const text = await response.text();

    console.log('[Vercel] USERS upstream status:', response.status, 'length:', text.length);

    res.setHeader('Content-Type', 'application/json');
    res.status(response.status).send(text);
  } catch (err) {
    console.error('Vercel /api/users failed:', err);
    res.status(500).json({ error: 'Proxy failed', details: err.message });
  }
}
