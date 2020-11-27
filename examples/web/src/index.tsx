import React from 'react';
import ReactDOM from 'react-dom';

import { CssBaseline, GeistProvider } from '@geist-ui/react';

import { App } from './app';

export let SMMDB: typeof import('../../../pkg/smmdb');

(async () => {
  SMMDB = await import('../../../pkg/smmdb');
  SMMDB.setupPanicHook();

  ReactDOM.render(
    <GeistProvider>
      <CssBaseline />
      <App />
    </GeistProvider>,
    document.getElementById('root')
  );
})();
