import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/iniciar-sesion',
          '/registro',
          '/terminos',
          '/recuperar-clave',
          '/tutorial-preview',
          '/icon.png',
          '/icon.svg',
          '/favicon.ico',
          '/og-image.png',
        ],
        disallow: [
          '/admin/',
          '/api/',
          '/game/',
          '/game2v2/',
          '/solitaire/',
        ],
      },
    ],
    sitemap: 'https://pericon.lat/sitemap.xml',
  };
}
