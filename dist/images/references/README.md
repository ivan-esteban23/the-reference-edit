# Editorial image references

This folder contains source-based visual references for The Reference Edit.

## Structure

- `tokyo-street/` — Tokyo street-style references, especially Harajuku and Shibuya.
- `seoul-fashion-week/` — Seoul Fashion Week street-style and venue references.
- `paris-office/` — Paris everyday and office-wear references.

## File naming

Use lowercase, hyphenated names:

```text
tokyo-street-01.jpg
tokyo-street-02.jpg
seoul-fashion-week-01.jpg
paris-office-01.jpg
```

## Required metadata

Every image must have a matching entry in `dist/data/references.json` with:

- Unique `id`
- `source` name
- `sourceUrl` to the original page or profile
- `city` and `context`
- `date` in ISO format, when known
- `caption` describing the reference
- `image` path
- `license` or usage status
- `tags` for filtering

## Image guidance

- Prefer portrait 4:5 images for reference cards.
- Use JPEG or WebP for photographs.
- Keep filenames stable; do not reuse an ID for different imagery.
- Only include images you have permission to display, or clearly label generated placeholder imagery as such.
