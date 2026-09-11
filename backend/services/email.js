const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const FROM = process.env.SMTP_FROM || 'Observatoire Scolaire <amoskouassi41@gmail.com>';

export async function sendMail({ to, subject, html, text }) {
  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Observatoire Scolaire', email: FROM.match(/<(.+)>/)?.[1] || 'amoskouassi41@gmail.com' },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text || html?.replace(/<[^>]*>/g, ''),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Brevo API error:', response.status, data);
      return { ok: false, error: data.message || `HTTP ${response.status}` };
    }
    return { ok: true, messageId: data.messageId };
  } catch (err) {
    console.error('Email error:', err.message);
    return { ok: false, error: err.message };
  }
}

export function verificationCodeEmail(prenom, code) {
  return {
    subject: 'Code de confirmation — Observatoire Scolaire National',
    html: `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <div style="background:#E8611A;color:white;padding:16px 24px;border-radius:12px 12px 0 0">
          <h1 style="margin:0;font-size:18px">🇨🇮 Observatoire Scolaire National</h1>
        </div>
        <div style="background:#FAF8F3;padding:24px;border-radius:0 0 12px 12px;border:1px solid #CBD5E1">
          <h2 style="color:#0D1B2A;margin-top:0">Bonjour ${prenom},</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6">
            Voici votre code de confirmation :
          </p>
          <div style="background:#0D1B2A;color:white;text-align:center;padding:20px;border-radius:12px;margin:20px 0">
            <span style="font-size:36px;font-weight:900;letter-spacing:12px">${code}</span>
          </div>
          <p style="color:#94A3B8;font-size:12px;text-align:center">
            Ce code expire dans 15 minutes.
          </p>
          <p style="color:#94A3B8;font-size:12px;margin-top:16px">
            Si vous n'avez pas créé de compte, ignorez cet email.
          </p>
        </div>
      </div>
    `,
  };
}

export function welcomeEmail(nom, prenom) {
  return {
    subject: 'Bienvenue sur l\'Observatoire Scolaire National',
    html: `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <div style="background:#E8611A;color:white;padding:16px 24px;border-radius:12px 12px 0 0">
          <h1 style="margin:0;font-size:18px">🇨🇮 Observatoire Scolaire National</h1>
        </div>
        <div style="background:#FAF8F3;padding:24px;border-radius:0 0 12px 12px;border:1px solid #CBD5E1">
          <h2 style="color:#0D1B2A;margin-top:0">Bonjour ${prenom} ${nom},</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6">
            Votre compte a été créé avec succès.
          </p>
          <a href="${process.env.FRONTEND_URL || 'https://observatoire-scolaire-national-fron.vercel.app'}/login"
             style="display:inline-block;background:#E8611A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;margin-top:16px">
            Se connecter
          </a>
        </div>
      </div>
    `,
  };
}

export function collecteReceivedEmail(nomEcole, enqueteurNom) {
  return {
    subject: `Nouvelle collecte : ${nomEcole}`,
    html: `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <div style="background:#0B7A3E;color:white;padding:16px 24px;border-radius:12px 12px 0 0">
          <h1 style="margin:0;font-size:18px">📋 Collecte reçue</h1>
        </div>
        <div style="background:#FAF8F3;padding:24px;border-radius:0 0 12px 12px;border:1px solid #CBD5E1">
          <p style="color:#475569;font-size:14px;line-height:1.6">
            <strong>${enqueteurNom}</strong> a soumis une collecte pour <strong>${nomEcole}</strong>.
          </p>
          <a href="${process.env.FRONTEND_URL || 'https://observatoire-scolaire-national-fron.vercel.app'}/explorer"
             style="display:inline-block;background:#0B7A3E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;margin-top:16px">
            Voir sur la carte
          </a>
        </div>
      </div>
    `,
  };
}

export function collecteValidationEmail(nomEcole, statut) {
  const isAccepted = statut === 'validated';
  return {
    subject: `Collecte ${isAccepted ? 'validée' : 'rejetée'} : ${nomEcole}`,
    html: `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <div style="background:${isAccepted ? '#0B7A3E' : '#ba1a1a'};color:white;padding:16px 24px;border-radius:12px 12px 0 0">
          <h1 style="margin:0;font-size:18px">${isAccepted ? '✅' : '❌'} Collecte ${isAccepted ? 'validée' : 'rejetée'}</h1>
        </div>
        <div style="background:#FAF8F3;padding:24px;border-radius:0 0 12px 12px;border:1px solid #CBD5E1">
          <p style="color:#475569;font-size:14px;line-height:1.6">
            La collecte pour <strong>${nomEcole}</strong> a été ${isAccepted ? 'validée' : 'rejetée'} par un administrateur.
          </p>
          <a href="${process.env.FRONTEND_URL || 'https://observatoire-scolaire-national-fron.vercel.app'}/explorer"
             style="display:inline-block;background:#E8611A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;margin-top:16px">
            Voir les résultats
          </a>
        </div>
      </div>
    `,
  };
}
