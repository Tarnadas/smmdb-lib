import('../../../pkg/smmdb').then(module => {
  const { Course2, setupPanicHook } = module;

  setupPanicHook();

  const input = document.createElement('input');
  input.addEventListener('change', async event => {
    const target = event.target as HTMLInputElement;
    for (const file of (target.files as unknown) as File[]) {
      const buffer = await readFile(file);
      console.log('Processing file...');
      const courses = Course2.fromBytes(new Uint8Array(buffer));
      console.log(courses);
    }
  });
  input.type = 'file';
  document.body.appendChild(input);
});

async function readFile(file: File): Promise<ArrayBuffer> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.addEventListener('loadend', () => {
      resolve(reader.result as ArrayBuffer);
    });
    reader.readAsArrayBuffer(file);
  });
}
