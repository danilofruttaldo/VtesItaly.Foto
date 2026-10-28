/** Share links for a page, built at build time: they work without JavaScript.
 * Same networks as the share buttons on vtesitaly.com. */
export interface ShareLink {
  network: 'fb' | 'x' | 'wa' | 'tg';
  name: string;
  href: string;
}

export function shareLinks(url: string, title: string): ShareLink[] {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return [
    { network: 'fb', name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { network: 'x', name: 'X', href: `https://x.com/intent/tweet?url=${u}&text=${t}` },
    {
      network: 'wa',
      name: 'WhatsApp',
      href: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} ${url}`)}`,
    },
    { network: 'tg', name: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}` },
  ];
}
