const supportHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BodyPilot Support</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; max-width: 720px; margin: 0 auto; padding: 32px 20px; color: #151515; }
    h1 { font-size: 32px; line-height: 1.2; }
    a { color: #0a7cff; }
  </style>
</head>
<body>
  <h1>BodyPilot Support</h1>
  <p>Need help with BodyPilot, account access, data export, or account deletion?</p>
  <p>Email support at <a href="mailto:dhairya5402@gmail.com">dhairya5402@gmail.com</a>.</p>
  <p>We review support and privacy requests as quickly as possible.</p>
</body>
</html>`;

Deno.serve(() => new Response(supportHtml, {
    headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
    },
}));
