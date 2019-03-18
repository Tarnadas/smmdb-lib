import('../pkg/cemu_smm').then(module => {
  module.run();
  const input = document.createElement('input');
  input.addEventListener('change', async ({ target }) => {
    for (const file of target.files) {
      const buffer = await readFile(file);
      console.log(buffer);
      const deserialized = module.deserialize(new Uint8Array(buffer));
      console.log('DESERIALIZE', deserialized);
      const serialized = module.serialize(deserialized);
      console.log('SERIALIZE', serialized, new Uint8Array(buffer));
      const deserialized2 = module.deserialize(serialized);
      console.log('DESERIALIZE2', deserialized2, JSON.stringify(deserialized) === JSON.stringify(deserialized2));
    }
  });
  input.type = 'file';
  document.body.appendChild(input);
});

async function readFile(file) {
  return new Promise((resolve => {
    const reader = new FileReader();
    reader.addEventListener('loadend', () => {
      resolve(reader.result);
    });
    reader.readAsArrayBuffer(file);
  }));
}
