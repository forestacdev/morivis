// frontend内で node --import tsx src/routes/map/utils/formats/dgn/__fixtures__/generate-extra.ts
import { writeFileSync } from 'node:fs';
import { testCurves } from './builders';
writeFileSync(new URL('./test-curves.dgn', import.meta.url), testCurves());
