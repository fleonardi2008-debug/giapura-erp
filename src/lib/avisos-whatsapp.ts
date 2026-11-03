/**
 * Aviso por WhatsApp al dueño (vía CallMeBot, gratis). Hace falta cargar en Vercel dos variables:
 *  - CALLMEBOT_PHONE: el número con código de país y sin signos, ej: 5491112345678
 *  - CALLMEBOT_APIKEY: la clave que CallMeBot manda al activar el número
 * Si faltan, no se manda nada (el pedido se guarda igual). Nunca tira error: un aviso que falla no puede romper un pedido.
 */
export async function avisarPorWhatsapp(texto: string): Promise<void> {
  const phone = process.env.CALLMEBOT_PHONE?.replace(/\D/g, "");
  const apikey = process.env.CALLMEBOT_APIKEY?.trim();
  if (!phone || !apikey) return;
  try {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&apikey=${encodeURIComponent(apikey)}&text=${encodeURIComponent(texto)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) console.error("CallMeBot respondió", res.status, await res.text().catch(() => ""));
  } catch (error) {
    console.error("No se pudo mandar el aviso por WhatsApp", error);
  }
}
