const privacyHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BodyPilot Privacy Policy</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; max-width: 760px; margin: 0 auto; padding: 32px 20px; color: #151515; }
    h1, h2 { line-height: 1.2; }
    h1 { font-size: 32px; margin-bottom: 4px; }
    h2 { margin-top: 32px; }
    .date { color: #666; margin-top: 0; }
  </style>
</head>
<body>
  <h1>BodyPilot Privacy Policy</h1>
  <p class="date">Effective date: May 18, 2026</p>

  <p>BodyPilot helps users track fitness, nutrition, recovery, goals, and progress. This policy explains what data the app collects and how it is used.</p>

  <h2>Information We Collect</h2>
  <p>BodyPilot may collect account information such as email address, optional phone number, and profile details you provide during onboarding. The app stores fitness and wellness data you choose to enter, including workouts, exercises, meals, water intake, calories, macros, body measurements, weight entries, goals, recovery logs, supplement logs, progress photos, and social activity.</p>
  <p>If you use camera or photo features, BodyPilot processes the images you choose for barcode scanning, food analysis, meal logging, receipt scanning, or progress tracking. If you use cardio tracking, BodyPilot may collect location points during the active session to calculate distance, pace, and route data.</p>

  <h2>How We Use Information</h2>
  <p>BodyPilot uses your information to provide app features, personalize workout and nutrition recommendations, sync your account data, generate progress insights, support social features you choose to use, and improve reliability and security.</p>

  <h2>Sharing</h2>
  <p>BodyPilot does not sell your personal information. Data may be processed by service providers used to operate the app, including authentication, database, file storage, and AI analysis providers. Social content is visible according to the sharing behavior of the social features you use.</p>

  <h2>Permissions</h2>
  <p>Camera access is used for scanning food barcodes, analyzing meal photos, receipt scanning, and capturing progress photos. Photo library access is used when you choose existing images. Location access is used only for cardio tracking while a session is active.</p>

  <h2>Data Retention And Deletion</h2>
  <p>Your data is retained while your account is active or as needed to provide the service. You can export your data in the app, and you can initiate account deletion from Account Settings. You may also contact support using the address listed on the support page.</p>

  <h2>Children</h2>
  <p>BodyPilot is not intended for children under 13.</p>

  <h2>Changes</h2>
  <p>We may update this policy as the app changes. Updates will be reflected by changing the effective date.</p>

  <h2>Contact</h2>
  <p>For privacy questions or deletion requests, contact <a href="mailto:dhairya5402@gmail.com">dhairya5402@gmail.com</a>.</p>
</body>
</html>`;

Deno.serve(() => new Response(privacyHtml, {
    headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=3600',
    },
}));
