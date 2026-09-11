import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_LOGIN,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: { rejectUnauthorized: false },
});

const FROM = process.env.SMTP_FROM || 'Observatoire Scolaire <noreply@observatoire.ci>';

export async function sendMail({ to, subject, html, text }) {
  try {
    const info = await transporter.sendMail({
      from: FROM,
      to,
      subject,
      html,
      text: text || html?.replace(/<[^>]*>/g, ''),
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error('Email error:', err.message);
    return { ok: false, error: err.message };
  }
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
            Votre compte a été créé avec succès. Vous pouvez maintenant accéder à la plateforme.
          </p>
          <a href="${process.env.FRONTEND_URL || 'https://observatoire-scolaire-national-frontend.vercel.app'}/login"
             style="display:inline-block;background:#E8611A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;margin-top:16px">
            Se connecter
          </a>
          <p style="color:#94A3B8;font-size:12px;margin-top:24px">
            Si vous n'avez pas créé ce compte, ignorez cet email.
          </p>
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
          <a href="${process.env.FRONTEND_URL || 'https://observatoire-scolaire-national-frontend.vercel.app'}/explorer"
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
          <a href="${process.env.FRONTEND_URL || 'https://observatoire-scolaire-national-frontend.vercel.app'}/explorer"
             style="display:inline-block;background:#E8611A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;margin-top:16px">
            Voir les résultats
          </a>
        </div>
      </div>
    `,
  };
}
