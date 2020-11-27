import React, { FC } from 'react';

import { Grid } from '@geist-ui/react';

export const Badge: FC<{
  data: string;
  xs?: number;
  sm?: number;
  md?: number;
}> = ({ data, xs, sm, md }) => {
  return (
    <Grid xs={xs || 12} sm={sm || 8} md={md || 4}>
      <object data={data} type="image/svg+xml" />
    </Grid>
  );
};
