import('../pkg/cemu_smm').then(module => {
  const { Course, run } = module;
  run();
  const input = document.createElement('input');
  input.addEventListener('change', async (event) => {
    const target = event.target as HTMLInputElement;
    for (const file of target.files) {
      const buffer = await readFile(file);
      console.log(buffer);
      const course = Course.from_proto(new Uint8Array(buffer));
      console.log('TO JS', course.to_js());
      console.log('TO PROTO', course.to_proto(), new Uint8Array(buffer));
      console.log('TEST', JSON.stringify(Course.from_proto(course.to_proto()).to_js()) === JSON.stringify(course.to_js()));
      // const serialized = module.serialize(deserialized);
      // console.log('SERIALIZE', serialized, new Uint8Array(buffer));
      // const deserialized2 = module.deserialize(serialized);
      // console.log('DESERIALIZE2', deserialized2, JSON.stringify(deserialized) === JSON.stringify(deserialized2));
    }
  });
  input.type = 'file';
  document.body.appendChild(input);
});

async function readFile(file): Promise<ArrayBuffer> {
  return new Promise((resolve => {
    const reader = new FileReader();
    reader.addEventListener('loadend', () => {
      resolve(reader.result as ArrayBuffer);
    });
    reader.readAsArrayBuffer(file);
  }));
}
