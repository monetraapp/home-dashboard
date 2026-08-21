import React, { useState } from 'react';
import { useHa } from './ha/context.js';
import Setup from './screens/Setup.jsx';
import Mapping from './screens/Mapping.jsx';
import Dashboard from './view/Dashboard.jsx';
import { s, SANS, TXT2, TXT3 } from './design/tokens.js';

export default function App() {
  const { config, status, resetConfig } = useHa();
  const [mappingOpen, setMappingOpen] = useState(false);

  if (!config || status === 'unconfigured' || status === 'auth-error') return <Setup />;

  if (status === 'connecting') {
    return (
      <div
        style={s(
          'min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; background:#0b0908; font-family:' +
            SANS + '; font-size:13px; color:' + TXT2 + ';'
        )}
      >
        <div>Se conectează la {config.url}…</div>
        <div style={s('font-size:11px; font-weight:300; color:' + TXT3 + '; max-width:420px; text-align:center; line-height:1.6;')}>
          Dacă rămâne aici mai mult de câteva secunde, adresa e greşită sau HA nu e accesibil din reţeaua curentă.
        </div>
        <div
          style={s(
            'margin-top:4px; padding:8px 16px; border-radius:100px; cursor:pointer; font-size:12px; font-weight:500; color:#d8ccbe; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);'
          )}
          onClick={() => {
            if (window.confirm('Ştergi adresa şi token-ul salvate şi revii la ecranul de configurare?')) resetConfig();
          }}
        >
          Schimbă adresa sau token-ul
        </div>
      </div>
    );
  }

  return (
    <>
      <Dashboard onOpenMapping={() => setMappingOpen(true)} />
      {mappingOpen ? <Mapping onClose={() => setMappingOpen(false)} /> : null}
    </>
  );
}
