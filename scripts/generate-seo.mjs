// Generates src/data/sources.json from src/index.html and updates JSON-LD in src/index.html
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'src/index.html');
const dataPath = path.join(root, 'src/data/sources.json');

const html = await readFile(htmlPath, 'utf8');
const records = [...html.matchAll(/<article\b[^>]*class="source"[\s\S]*?<\/article>/g)].map(m => m[0]);

const sources = records.map((article, index) => {
  const category = article.match(/data-category="([^"]+)"/)?.[1] || '';
  const region = article.match(/data-region="([^"]+)"/)?.[1] || '';
  const country = article.match(/data-country="([^"]+)"/)?.[1] || '';
  const name = article.match(/<h3><a[^>]*>([^<]+)/)?.[1]?.trim() || '';
  const url = article.match(/<h3><a\s+href="([^"]+)"/)?.[1] || '';
  const purpose = article.match(/<p class="source-purpose">([^<]+)<\/p>/)?.[1] || '';
  const access = article.match(/<span class="sr-only">Access <\/span>([^<]+)<\/span>/)?.[1] || '';
  const reviewDate = article.match(/<time datetime="([^"]+)">/)?.[1] || '';
  return {
    position: index + 1,
    name,
    url,
    category,
    region,
    country,
    description: purpose,
    access,
    reviewDate
  };
});

await writeFile(dataPath, JSON.stringify({version: 1, total: sources.length, sources}, null, 2) + '\n');
console.log(`Generated ${dataPath} with ${sources.length} sources.`);

export function buildJsonLd(sourceList) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://ivan-esteban23.github.io/the-reference-edit/#website",
        "url": "https://ivan-esteban23.github.io/the-reference-edit/",
        "name": "The Reference Edit",
        "description": "An editorial directory for visual research, fashion references, and moodboarding. Collect with intention and develop your visual point of view.",
        "inLanguage": ["en", "es", "ja", "ko", "zh-Hans", "zh-Hant"]
      },
      {
        "@type": "CollectionPage",
        "@id": "https://ivan-esteban23.github.io/the-reference-edit/#collection",
        "url": "https://ivan-esteban23.github.io/the-reference-edit/",
        "name": "The Reference Edit — Curated Research Sources",
        "isPartOf": {
          "@id": "https://ivan-esteban23.github.io/the-reference-edit/#website"
        },
        "description": "A curated directory of 58 visual research sources for fashion, design, and contemporary culture.",
        "mainEntity": {
          "@type": "ItemList",
          "name": "Curated Research Sources",
          "numberOfItems": sourceList.length,
          "itemListElement": sourceList.map(s => ({
            "@type": "ListItem",
            "position": s.position,
            "item": {
              "@type": "CreativeWork",
              "name": s.name,
              "url": s.url,
              "description": s.description
            }
          }))
        }
      }
    ]
  };
}

const jsonLd = buildJsonLd(sources);
const jsonLdTag = `<script type="application/ld+json">\n${JSON.stringify(jsonLd)}\n</script>`;

let updatedHtml = html;
if (updatedHtml.includes('<script type="application/ld+json">')) {
  updatedHtml = updatedHtml.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, jsonLdTag);
} else {
  updatedHtml = updatedHtml.replace('</head>', `${jsonLdTag}</head>`);
}

await writeFile(htmlPath, updatedHtml);
console.log("Updated JSON-LD in src/index.html");
