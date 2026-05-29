const supportText = `BodyPilot Support

Need help with BodyPilot, account access, data export, or account deletion?

Email support: dhairya5402@gmail.com

We review support and privacy requests as quickly as possible.
`;

Deno.serve(() => new Response(supportText, {
    headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'public, max-age=3600',
    },
}));
