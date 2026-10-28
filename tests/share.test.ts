import { describe, expect, it } from 'vitest';
import { shareLinks } from '../src/utils/share';

describe('shareLinks', () => {
  const links = shareLinks('https://foto.vtesitaly.com/vambeer-iii-2026/', 'Vambeer III & co');
  const href = (n: string) => links.find((l) => l.network === n)?.href;

  it('covers the networks of vtesitaly.com', () => {
    expect(links.map((l) => l.network)).toEqual(['fb', 'x', 'wa', 'tg']);
  });

  it('encodes url and title', () => {
    expect(href('fb')).toBe(
      'https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Ffoto.vtesitaly.com%2Fvambeer-iii-2026%2F',
    );
    expect(href('x')).toContain('&text=Vambeer%20III%20%26%20co');
    expect(href('tg')).toContain('url=https%3A%2F%2Ffoto.vtesitaly.com%2Fvambeer-iii-2026%2F&text=');
  });

  it('puts title and url in the WhatsApp text', () => {
    expect(href('wa')).toBe(
      'https://api.whatsapp.com/send?text=Vambeer%20III%20%26%20co%20https%3A%2F%2Ffoto.vtesitaly.com%2Fvambeer-iii-2026%2F',
    );
  });
});
