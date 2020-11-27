import { SMMDB } from '.';

export async function parseFile(file: File): Promise<typeof SMMDB.Course2[]> {
  const buffer = await readFile(file);
  console.log('Processing file...');
  const courses = SMMDB.Course2.fromBytes(new Uint8Array(buffer));
  return courses;
}

async function readFile(file: File): Promise<ArrayBuffer> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.addEventListener('loadend', () => {
      resolve(reader.result as ArrayBuffer);
    });
    reader.readAsArrayBuffer(file);
  });
}
