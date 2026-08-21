import React, { useMemo, useState } from 'react';
import { s, SANS, SERIF, ORANGE, TXT, TXT2, TXT3, CARD_BG, CARD_BORDER, PILL_ON, glassCard } from '../design/tokens.js';
import { ic } from '../design/icons.js';
import { useHa } from '../ha/context.js';
import { SLOTS, GROUPS } from '../ha/slots.js';
import { SUGGESTED_MAP, UNMAPPED_REASONS, applySuggested, AUDIT_DATE } from '../ha/suggestedMap.js';

const inputStyle =
  'width:100%; padding:9px 11px; border-radius:11px; font-family:' + SANS + '; font-size:12px; color:' + TXT + '; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); outline:none;';

function friendly(states, id) {
  const st = states[id];
  if (!st) return id;
  const n = st.attributes && st.attributes.friendly_name;
  return n ? n + ' — ' + id : id;
}

export default function Mapping({ onClose }) {
  const { states, entityMap, setEntityMap, resetConfig, config } = useHa();
  const [filter, setFilter] = useState('');
  const [showAllDomains, setShowAllDomains] = useState(false);
  const [onlyUnmapped, setOnlyUnmapped] = useState(false);

  const allIds = useMemo(() => Object.keys(states).sort(), [states]);

  const byDomain = useMemo(() => {
    const m = {};
    allIds.forEach((id) => {
      const d = id.split('.')[0];
      (m[d] = m[d] || []).push(id);
    });
    return m;
  }, [allIds]);

  const mappedCount = SLOTS.filter((sl) => entityMap[sl.key]).length;

  function setSlot(key, value) {
    const next = Object.assign({}, entityMap);
    if (!value) delete next[key];
    else next[key] = value;
    setEntityMap(next);
  }

  function applyAudit() {
    const res = applySuggested(entityMap, states);
    setEntityMap(res.map);
    const lines = [
      `Mapare aplicată din auditul din ${AUDIT_DATE}.`,
      '',
      `${res.added} sloturi completate` +
        (res.skipped ? `, ${res.skipped} lăsate aşa cum le aveai` : '') +
        '.'
    ];
    if (res.missing.length) {
      lines.push('', `Atenţie — ${res.missing.length} entităţi din propunere nu apar în HA acum:`, ...res.missing);
    }
    window.alert(lines.join('\n'));
  }

  function exportJson() {
    const text = JSON.stringify(entityMap, null, 2);
    navigator.clipboard
      .writeText(text)
      .then(() => window.alert('Maparea a fost copiată în clipboard ca JSON.'))
      .catch(() => window.prompt('Copiază maparea:', text));
  }

  function importJson() {
    const text = window.prompt('Lipeşte JSON-ul cu maparea:');
    if (!text) return;
    try {
      const obj = JSON.parse(text);
      if (obj && typeof obj === 'object') setEntityMap(obj);
    } catch (e) {
      window.alert('JSON invalid.');
    }
  }

  const q = filter.trim().toLowerCase();

  return (
    <div
      style={s(
        'position:fixed; inset:0; z-index:90; overflow-y:auto; padding:26px; background:#0b0908; font-family:' + SANS + ';'
      )}
    >
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={s('font-family:' + SERIF + '; font-size:34px; color:#f7f1e9; line-height:1.1;')}>Mapare entităţi</div>
            <div style={s('font-family:' + SANS + '; font-size:12px; font-weight:300; color:' + TXT3 + '; margin-top:6px; max-width:620px; line-height:1.6;')}>
              Fiecare rând este un loc din dashboard. Alege entitatea reală din Home Assistant.
              Sloturile nemapate rămân vizibile în interfaţă, marcate <span style={{ color: ORANGE, fontWeight: 500 }}>VERIFY</span>.
              {' '}Mapate: <strong style={{ color: TXT2 }}>{mappedCount}</strong> din {SLOTS.length}. Conectat la {config ? config.url : '—'}.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button style={s(pillBtn(true))} onClick={applyAudit} type="button">
              Aplică maparea din audit ({Object.keys(SUGGESTED_MAP).length})
            </button>
            <button style={s(pillBtn(false))} onClick={exportJson} type="button">Export JSON</button>
            <button style={s(pillBtn(false))} onClick={importJson} type="button">Import JSON</button>
            <button
              style={s(pillBtn(false) + ' color:#e8a08a; border-color:rgba(226,120,90,0.35);')}
              onClick={() => {
                if (window.confirm('Ştergi adresa şi token-ul salvate în acest browser?')) resetConfig();
              }}
              type="button"
            >
              Deconectează
            </button>
            <button style={s(pillBtn(false))} onClick={onClose} type="button">Înapoi la dashboard</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 20, flexWrap: 'wrap' }}>
          <input
            style={s(inputStyle + ' max-width:320px;')}
            placeholder="Caută un slot (ex. clorinator, EAP, TV)…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <label style={s(checkLabel)}>
            <input type="checkbox" checked={showAllDomains} onChange={(e) => setShowAllDomains(e.target.checked)} />
            arată toate domeniile în sugestii
          </label>
          <label style={s(checkLabel)}>
            <input type="checkbox" checked={onlyUnmapped} onChange={(e) => setOnlyUnmapped(e.target.checked)} />
            doar sloturile nemapate
          </label>
          <span style={s('font-family:' + SANS + '; font-size:11px; color:' + TXT3 + ';')}>
            {allIds.length} entităţi disponibile în HA
          </span>
        </div>

        {GROUPS.map((g) => {
          const rows = SLOTS.filter((sl) => sl.group === g.key)
            .filter((sl) => (onlyUnmapped ? !entityMap[sl.key] : true))
            .filter((sl) => (q ? (sl.label + ' ' + sl.key).toLowerCase().indexOf(q) >= 0 : true));
          if (!rows.length) return null;
          return (
            <div key={g.key} style={s(glassCard() + ' margin-top:16px;')}>
              <div style={s('font-family:' + SANS + '; font-size:14.5px; font-weight:500; color:' + TXT + '; margin-bottom:4px;')}>
                {g.label}
              </div>
              <div style={s('font-family:' + SANS + '; font-size:11px; font-weight:300; color:' + TXT3 + '; margin-bottom:14px;')}>
                {rows.filter((r) => entityMap[r.key]).length} / {rows.length} mapate
              </div>
              {rows.map((sl) => {
                const listId = 'dl-' + sl.key.replace(/[^a-z0-9]/gi, '-');
                const candidates = showAllDomains
                  ? allIds
                  : sl.domains.reduce((acc, d) => acc.concat(byDomain[d] || []), []);
                const value = entityMap[sl.key] || '';
                const st = value ? states[value] : null;
                const bad = value && !st;
                return (
                  <div key={sl.key} style={s(rowStyle(!!value))}>
                    <div style={{ minWidth: 0 }}>
                      <div style={s('font-family:' + SANS + '; font-size:12.5px; font-weight:500; color:' + TXT + ';')}>
                        {sl.label}
                      </div>
                      <div style={s('font-family:' + SANS + '; font-size:10px; font-weight:300; color:' + TXT3 + '; margin-top:2px;')}>
                        {sl.key} · {sl.domains.join(' / ')}
                        {sl.note ? ' · ' + sl.note : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, minWidth: 0 }}>
                      <div style={{ minWidth: 0 }}>
                        <input
                          style={s(inputStyle + ' width:340px; max-width:44vw;' + (bad ? ' border-color:rgba(226,120,90,0.5);' : ''))}
                          list={listId}
                          value={value}
                          placeholder="— nemapat (VERIFY) —"
                          onChange={(e) => setSlot(sl.key, e.target.value.trim())}
                          spellCheck={false}
                        />
                        <datalist id={listId}>
                          {candidates.slice(0, 400).map((id) => (
                            <option key={id} value={id} label={friendly(states, id)} />
                          ))}
                        </datalist>
                        <div
                          style={s(
                            'font-family:' + SANS + '; font-size:10px; font-weight:300; margin-top:4px; color:' +
                              (bad ? '#e8a08a' : TXT3) + ';'
                          )}
                        >
                          {!value
                            ? UNMAPPED_REASONS[sl.key] || 'nemapat'
                            : bad
                              ? 'entitatea nu există în HA'
                              : (st.attributes.friendly_name || value) + ' · stare: ' + st.state +
                                (st.attributes.unit_of_measurement ? ' ' + st.attributes.unit_of_measurement : '')}
                        </div>
                      </div>
                      <button
                        type="button"
                        title="Şterge maparea"
                        style={s(
                          'width:30px; height:30px; flex-shrink:0; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#a1968b; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.09);'
                        )}
                        onClick={() => setSlot(sl.key, '')}
                      >
                        {ic('close', { size: 13 })}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

function pillBtn(primary) {
  return (
    'padding:9px 16px; border-radius:100px; cursor:pointer; font-family:' + SANS +
    '; font-size:12px; font-weight:500; color:' + (primary ? '#3a1c06' : '#d8ccbe') +
    '; background:' + (primary ? PILL_ON : 'rgba(255,255,255,0.045)') +
    '; border:1px solid ' + (primary ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.085)') + ';'
  );
}

const checkLabel =
  'display:flex; align-items:center; gap:7px; font-family:' + SANS + '; font-size:11.5px; font-weight:300; color:' + TXT2 + '; cursor:pointer;';

function rowStyle(mapped) {
  return (
    'display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; padding:11px 13px; border-radius:14px; margin-bottom:8px; background:' +
    (mapped ? 'rgba(240,138,44,0.06)' : 'rgba(255,255,255,0.03)') +
    '; border:1px solid ' +
    (mapped ? 'rgba(240,138,44,0.2)' : 'rgba(255,255,255,0.06)') +
    ';'
  );
}
