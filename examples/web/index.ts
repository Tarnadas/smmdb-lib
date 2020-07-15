import('../../pkg/smmdb').then(module => {
  const { Course, Course2, run } = module;
  run();
  const input = document.createElement('input');
  input.addEventListener('change', async event => {
    const target = event.target as HTMLInputElement;
    for (const file of target.files) {
      const buffer = await readFile(file);
      console.log(buffer);
      let courses = Course2.from_packed_js(new Uint8Array(buffer));
      console.log(courses);
      // const course = Course.from_proto(new Uint8Array(buffer));
      // console.log('TO JS', course.into_js());
      // console.log('TO PROTO', course.into_proto(), new Uint8Array(buffer));
      // console.log('TEST', JSON.stringify(Course.from_proto(course.into_proto()).into_js()) === JSON.stringify(course.into_js()));
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
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.addEventListener('loadend', () => {
      resolve(reader.result as ArrayBuffer);
    });
    reader.readAsArrayBuffer(file);
  });
}
