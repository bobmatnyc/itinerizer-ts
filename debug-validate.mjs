import { readFile } from 'node:fs/promises';
import { itinerarySchema } from './dist/index.js';

const files = [
  'data/itineraries/641e7b29-2432-49e8-9866-e4db400494ba.json',
  'data/itineraries/64c52d2f-c549-4718-bcc4-d262cd5fe108.json',
  'data/itineraries/670ef2d3-dd7f-4b08-9242-7f15d02e098d.json'
];

for (const file of files) {
  try {
    const data = await readFile(file, 'utf-8');
    const parsed = JSON.parse(data, (key, value) => {
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)) {
        return new Date(value);
      }
      return value;
    });
    const result = itinerarySchema.safeParse(parsed);
    if (!result.success) {
      console.log(`\n${file}:`);
      console.log(JSON.stringify(result.error.errors.slice(0,5), null, 2));
    } else {
      console.log(`${file}: OK`);
    }
  } catch (e) {
    console.log(`${file}: ${e.message}`);
  }
}
