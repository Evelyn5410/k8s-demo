const express = require('express');

const app = express();
const port = process.env.PORT || 8080;
const downstreamUrl = process.env.DOWNSTREAM_URL || 'https://httpbin.org/status/200';
const downstreamTimeoutMs = Number(process.env.DOWNSTREAM_TIMEOUT_MS || 1500);

let ready = true;

app.get('/', (req, res) => {
  console.log("LOCAL HIT")
  res.status(200).json({
    message: 'hello world from k8s-demo',
    service: 'k8s-demo-hello-world',
    timestamp: new Date().toISOString()
  });
});

app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});

app.get('/readyz', (req, res) => {
  if (!ready) {
    return res.status(503).send('not ready');
  }
  res.status(200).send('ready');
});

app.get('/downstream-check', async (req, res) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), downstreamTimeoutMs);

  try {
    const upstream = await fetch(downstreamUrl, {
      signal: controller.signal,
      headers: {
        'x-request-id': req.header('x-request-id') || `local-${Date.now()}`
      }
    });

    res.status(200).json({
      ok: upstream.ok,
      upstreamStatus: upstream.status,
      downstreamUrl
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      error: error.message,
      downstreamUrl
    });
  } finally {
    clearTimeout(timeout);
  }
});

// Optional endpoint to simulate readiness transitions while testing.
app.post('/toggle-ready', (req, res) => {
  ready = !ready;
  res.status(200).json({ ready });
});

app.listen(port, () => {
  console.log(`server listening on ${port}`);
});
