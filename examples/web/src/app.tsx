import React, { FC, useState } from 'react';
import ReactJson from 'react-json-view';

import { Button, Display, Image, Page, Spacer, Text } from '@geist-ui/react';

import icon from './images/icon.png';
import { parseFile } from './smmdb';
import { SMMDB } from '.';

export const App: FC = () => {
  const [courses, setCourses] = useState<typeof SMMDB.Course2[] | null>(null);
  const [loading, setLoading] = useState(false);
  let upload: HTMLInputElement | null = null;

  const handleSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const file = event.target.files[0];
    if (!file) return;
    console.log(file);
    setLoading(true);
    try {
      const courses = await parseFile(file);
      setCourses(courses);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <>
      <Page>
        <Display
          shadow
          caption="A showcase of SMMDB library, compiled to WebAssembly. Everything runs locally in your browser."
        >
          <Image src={icon}></Image>
        </Display>
        <Text>
          Please select a container file which includes Super Mario Maker 2
          levels to analyze.
        </Text>
        <Button
          onClick={() => {
            if (upload) {
              upload.click();
            }
          }}
          loading={loading}
        >
          Select
        </Button>
        <input
          id="myInput"
          type="file"
          accept=".zip,.tar"
          ref={ref => (upload = ref)}
          style={{ display: 'none' }}
          onChange={handleSelect}
        />
        <Spacer y={2} />
        {courses && <ReactJson src={courses} collapsed={2} />}
      </Page>
    </>
  );
};
