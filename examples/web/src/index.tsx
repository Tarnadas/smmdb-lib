import React from 'react';
import ReactDOM from 'react-dom';

import { CssBaseline, GeistProvider } from '@geist-ui/react';

import { App } from './app';

export let SMMDB: typeof import('../../../pkg/smmdb');

(async () => {
  await new Promise(resolve => {
    function checkWindow() {
      setTimeout(() => {
        console.log((window as any).SMMDB);
        if ((window as any).SMMDB != null) {
          SMMDB = (window as any).SMMDB;
          resolve();
        } else {
          checkWindow();
        }
      }, 100);
    }
  });
  console.log('SMMDB', SMMDB);
  SMMDB.setupPanicHook();

  ReactDOM.render(
    <GeistProvider>
      <CssBaseline />
      <App />
    </GeistProvider>,
    document.getElementById('root')
  );
})();
