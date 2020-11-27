import React, { FC } from 'react';

import { Display, Grid, Image, Text } from '@geist-ui/react';

import icon from './images/icon.png';
import { Badge } from './badge';

export const Header: FC = () => {
  const baseUrl = 'https://img.shields.io';
  const starsUrl = `${baseUrl}/github/stars/tarnadas/smmdb-lib?style=for-the-badge&logo=github&link=https://github.com/Tarnadas/smmdb-lib&link=https://github.com/Tarnadas/smmdb-lib/stargazers`;
  const cratesUrl = `${baseUrl}/crates/v/smmdb?style=for-the-badge&logo=rust&link=https://crates.io/crates/smmdb`;
  const npmUrl = `${baseUrl}/npm/v/smmdb?style=for-the-badge&logo=npm&link=https://www.npmjs.com/package/smmdb`;
  const discordUrl = `${baseUrl}/discord/168893527357521920?logo=discord&color=7289da&style=for-the-badge&link=https://discord.gg/SPZsgSe`;
  const twitterUrl = `${baseUrl}/twitter/follow/marior_dev?logo=twitter&label=follow&color=00acee&style=for-the-badge&link=https://twitter.com/marior_dev`;

  return (
    <>
      <Grid.Container gap={3} justify="space-between">
        <Badge data={starsUrl} />
        <Badge data={cratesUrl} />
        <Badge data={npmUrl} />
        <Badge data={discordUrl} />
        <Badge data={twitterUrl} />
      </Grid.Container>
      <Display
        shadow
        caption="A showcase of SMMDB library, compiled to WebAssembly. Everything runs locally in your browser."
      >
        <div style={{ margin: '0 4rem' }}>
          <Image src={icon}></Image>
          <Text h2>SMMDB library</Text>
        </div>
      </Display>
    </>
  );
};
