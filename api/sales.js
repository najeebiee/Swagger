// api/sales.js

export default async function handler(req, res) {
  try {
    const { user, apikey, df, dt } = req.query;

    const url = new URL('https://gmin.onegrindersguild.com/api.get.sales.php');
    if (user)   url.searchParams.set('user', user);
    if (apikey) url.searchParams.set('apikey', apikey);
    if (df)     url.searchParams.set('df', df);
    if (dt)     url.searchParams.set('dt', dt);

    const response = await fetch(url.toString());
    const text = await response.text();

    res.setHeader('Content-Type', 'application/json');
    res.status(response.status).send(text);
  } catch (err) {
    console.error('Vercel /api/sales error:', err);
    res.status(500).json({ error: 'Proxy failed', details: err.message });
  }
}
