# IN1010 Interactive

Interaktiv øvingsside for IN1010 midtveisoppgaver med:
- Original PDF-visning (rendret til bilder for eksakt layout)
- Per-oppgave `Vis fasit`
- Interaktive paneler (`Sjekk svar`, `Nullstill`, kodefelt)

## Kilder
PDF-ene leses fra:
`/Users/jacob/Downloads/IN1010-midtveis`

## Kom i gang
```bash
npm install
npm run prepare:data
npm run dev
```

## Scripts
- `npm run assets:verify`: verifiserer SHA-256 checksums for PDF-kilder
- `npm run assets:render`: rendrer alle PDF-sider til `public/assets/exams`
- `npm run manifests:generate`: genererer `src/data/exams/*.json`
- `npm run manifests:fit-rects`: finner og finjusterer drag/drop-koordinater fra fasitsider
- `npm run manifests:validate`: sjekker manifests og at sidebilder finnes
- `npm run prepare:data`: kjører alle stegene over
- `npm run lint`
- `npm run test`

## Struktur
- `scripts/pdf/`: checksum/render/manifest-pipeline
- `public/assets/exams/`: rendrerte sider
- `src/data/exams/`: manifestdata for alle eksamener/opppgaver
- `src/components/exam/`: visning og interaktivitet
- `src/app/eksamen/...`: ruter

## Merknad
Noen oppgaver er satt opp med full auto-sjekk i interaktivt panel. For øvrige oppgaver brukes offisiell fasitside som sannhetskilde via `Vis fasit`.
