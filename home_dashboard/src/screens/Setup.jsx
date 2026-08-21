import React, { useState } from 'react';
import { s, SANS, SERIF, ORANGE, ORANGE_HI, TXT, TXT2, TXT3, CARD_BG, CARD_BORDER, PILL_ON } from '../design/tokens.js';
import { ic } from '../design/icons.js';
import { useHa } from '../ha/context.js';

const wrap =
  'min-height:100vh; display:flex; align-items:center; justify-content:center; padding:32px; background:radial-gradient(circle at 20% 0%, #1a130d 0%, #0b0908 60%); font-family:' + SANS + ';';
const card =
  'width:100%; max-width:520px; padding:28px; border-radius:26px; background:' + CARD_BG + '; border:1px solid ' + CARD_BORDER + '; box-shadow:0 40px 90px -30px rgba(0,0,0,0.85);';
const label =
  'display:block; font-family:' + SANS + '; font-size:10.5px; font-weight:500; text-transform:uppercase; letter-spacing:0.09em; color:' + TXT3 + '; margin:18px 0 7px;';
const input =
  'width:100%; padding:13px 14px; border-radius:14px; font-family:' + SANS + '; font-size:13.5px; color:' + TXT + '; background:rgba(255,255,255,0.045); border:1px solid rgba(255,255,255,0.1); outline:none;';
const btn =
  'margin-top:22px; width:100%; padding:14px; border-radius:100px; cursor:pointer; border:1px solid rgba(255,255,255,0.28); font-family:' + SANS + '; font-size:13.5px; font-weight:600; color:#3a1c06; background:' + PILL_ON + '; box-shadow:0 10px 26px -12px rgba(226,121,58,0.7);';
const hint = 'font-family:' + SANS + '; font-size:11px; font-weight:300; line-height:1.6; color:' + TXT3 + '; margin-top:8px;';

export default function Setup() {
  const { setConfig, status, error, config } = useHa();
  const [url, setUrl] = useState(config ? config.url : 'http://192.168.0.');
  const [token, setToken] = useState('');
  const [localErr, setLocalErr] = useState(null);

  function submit(e) {
    e.preventDefault();
    const u = url.trim();
    if (!/^https?:\/\/.+/i.test(u)) {
      setLocalErr('Adresa trebuie să înceapă cu http:// sau https:// (ex. http://192.168.0.10:8123).');
      return;
    }
    if (token.trim().length < 20) {
      setLocalErr('Token-ul pare prea scurt. Copiază Long-Lived Access Token complet din HA.');
      return;
    }
    setLocalErr(null);
    setConfig(u, token);
  }

  const shown = localErr || error;

  return (
    <div style={s(wrap)}>
      <form style={s(card)} onSubmit={submit}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <div
            style={s(
              'width:46px; height:46px; flex-shrink:0; border-radius:15px; display:flex; align-items:center; justify-content:center; color:#2a1608; background:linear-gradient(140deg,' +
                ORANGE_HI +
                ',#D9691C);'
            )}
          >
            {ic('home', { size: 22 })}
          </div>
          <div>
            <div style={s('font-family:' + SERIF + '; font-size:27px; color:#f7f1e9; line-height:1.1;')}>
              Conectare Home Assistant
            </div>
            <div style={s('font-family:' + SANS + '; font-size:11.5px; font-weight:300; color:' + TXT3 + '; margin-top:3px;')}>
              Datele rămân doar în acest browser (localStorage).
            </div>
          </div>
        </div>

        <label style={s(label)} htmlFor="ha-url">Adresa Home Assistant</label>
        <input
          id="ha-url"
          style={s(input)}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://192.168.0.10:8123"
          autoComplete="off"
          spellCheck={false}
        />
        <div style={s(hint)}>Adresa locală, cu port. Fără slash la final.</div>

        <label style={s(label)} htmlFor="ha-token">Long-Lived Access Token</label>
        <textarea
          id="ha-token"
          style={s(input + ' min-height:92px; resize:vertical; font-size:11.5px; line-height:1.5;')}
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="eyJhbGciOi..."
          spellCheck={false}
        />
        <div style={s(hint)}>
          HA → click pe numele tău (stânga jos) → tab-ul <strong style={{ color: TXT2 }}>Securitate</strong> → jos de tot,
          „Long-Lived Access Tokens” → <strong style={{ color: TXT2 }}>Create Token</strong>.
        </div>

        {shown ? (
          <div
            style={s(
              'margin-top:18px; padding:12px 14px; border-radius:14px; font-family:' +
                SANS +
                '; font-size:11.5px; line-height:1.6; color:#e8a08a; background:rgba(226,120,90,0.08); border:1px solid rgba(226,120,90,0.3);'
            )}
          >
            {shown}
          </div>
        ) : null}

        <button type="submit" style={s(btn)}>
          {status === 'connecting' ? 'Se conectează…' : 'Conectează'}
        </button>

        <div style={s(hint + ' margin-top:16px;')}>
          Dacă HA rulează pe <code style={{ color: TXT2 }}>https</code> cu certificat self-signed, deschide o dată adresa
          direct în browser și acceptă certificatul — altfel WebSocket-ul e blocat silenţios.
        </div>
      </form>
    </div>
  );
}
