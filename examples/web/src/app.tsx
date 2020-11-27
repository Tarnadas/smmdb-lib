import React, { FC, useState } from 'react';
import ReactJson from 'react-json-view';

import { Button, Card, Page, Spacer, Text } from '@geist-ui/react';

import { parseFile } from './smmdb';
import { SMMDB } from '.';
import { Header } from './header';

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

  const getImageFromBinary = (data: number[]) => {
    const blob = new Blob([new Uint8Array(data)], { type: 'image/jpeg' });
    return URL.createObjectURL(blob);
  };

  return (
    <>
      <Page>
        <Header />
        <Text>
          Please select a container file which includes Super Mario Maker 2
          levels to analyze.
        </Text>
        <Button
          type="success-light"
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
        {courses &&
          courses.map((course: any) => (
            <Card key={course.course.header.creation_id} hoverable shadow>
              <Text h3>{course.course.header.title}</Text>
              {course.thumb && (
                <img
                  style={{ maxWidth: '640px', maxHeight: '360px' }}
                  src={getImageFromBinary(course.thumb.jpeg)}
                />
              )}
              <ReactJson src={course.course} collapsed={1} />
            </Card>
          ))}
      </Page>
    </>
  );
};
