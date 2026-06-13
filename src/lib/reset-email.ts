export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "Recuperá tu contraseña de Juntada",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
          <h2>Recuperar contraseña</h2>
          <p>Recibimos un pedido para cambiar la contraseña de tu cuenta en Juntada.</p>
          <p><a href="${resetUrl}" style="background:#ff6b35;color:white;padding:12px 16px;border-radius:10px;text-decoration:none;font-weight:700">Cambiar contraseña</a></p>
          <p>Este link vence en 1 hora. Si no lo pediste, podés ignorar este mail.</p>
        </div>
      `,
    }),
  });

  return res.ok;
}
