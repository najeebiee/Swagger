// api/codes.js

export default async function handler(req, res) {
  try {
    const { user, apikey, df, dt } = req.query;

    const url = new URL('https://gmin.onegrindersguild.com/api.get.codes.php');
    if (user)   url.searchParams.set('user', user);
    if (apikey) url.searchParams.set('apikey', apikey);
    if (df)     url.searchParams.set('df', df);
    if (dt)     url.searchParams.set('dt', dt);

    const response = await fetch(url.toString());
    const text = await response.text();

    // Codes API sometimes returns empty body (204). Normalize to { data: [] }
    const body = text && text.trim() ? text : JSON.stringify({ data: [] });

    res.setHeader('Content-Type', 'application/json');
    res.status(response.status).send(body);
  } catch (err) {
    console.error('Vercel /api/codes error:', err);
    res.status(500).json({ error: 'Proxy failed', details: err.message });
  }
}
