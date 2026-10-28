/**
 * Dev gallery for Coco: every mood in every colour, size checks, the static
 * markup and the app icons. Open /dev/mascot.html on the Vite dev server.
 * Optional query: ?only=playground|grid|sizes|static|icons to show one section.
 */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  MASCOT_COLORS,
  MASCOT_MOODS,
  Mascot,
  mascotSvgMarkup,
  type MascotColor,
  type MascotMood,
} from '../src/components/Mascot';

const only = new URLSearchParams(location.search).get('only');
const show = (section: string) => !only || only === section;

const svgUrl = (markup: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;

function Playground() {
  const [mood, setMood] = useState<MascotMood>('idle');
  const [color, setColor] = useState<MascotColor>('pink');
  const [reactKey, setReactKey] = useState(0);
  const [clicks, setClicks] = useState(0);
  return (
    <div className="card playground" data-testid="playground">
      <div className="stage">
        <Mascot mood={mood} color={color} size={240} reactKey={reactKey} onClick={() => setClicks((c) => c + 1)} />
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        <div className="row">
          {MASCOT_MOODS.map((m) => (
            <button key={m} aria-pressed={m === mood} onClick={() => setMood(m)}>
              {m}
            </button>
          ))}
        </div>
        <div className="row">
          {MASCOT_COLORS.map((c) => (
            <button key={c} aria-pressed={c === color} onClick={() => setColor(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="row">
          <button className="primary" data-testid="react" onClick={() => setReactKey((k) => k + 1)}>
            Replay reaction
          </button>
          <span style={{ color: 'var(--muted)' }}>Click Coco to squish · clicks: {clicks}</span>
        </div>
      </div>
    </div>
  );
}

function Grid() {
  const [keys, setKeys] = useState<Record<string, number>>({});
  const bump = (m: MascotMood) => setKeys((k) => ({ ...k, [m]: (k[m] ?? 0) + 1 }));
  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="primary" data-testid="replay-all" onClick={() => MASCOT_MOODS.forEach(bump)}>
          Replay all
        </button>
      </div>
      <div className="grid" data-testid="grid">
        <div />
        {MASCOT_COLORS.map((c) => (
          <div key={c} className="head">
            {c}
          </div>
        ))}
        {MASCOT_MOODS.map((m) => (
          <Row key={m} mood={m} reactKey={keys[m] ?? 0} onReplay={() => bump(m)} />
        ))}
      </div>
    </>
  );
}

function Row({ mood, reactKey, onReplay }: { mood: MascotMood; reactKey: number; onReplay: () => void }) {
  return (
    <>
      <div className="mood">
        {mood}
        <button onClick={onReplay} data-testid={`replay-${mood}`}>
          Replay
        </button>
      </div>
      {MASCOT_COLORS.map((c) => (
        <div key={c} className="cell">
          <Mascot mood={mood} color={c} size={120} reactKey={reactKey} title={`Coco (${mood}, ${c})`} />
        </div>
      ))}
    </>
  );
}

function Sizes() {
  return (
    <div style={{ display: 'grid', gap: 8 }} data-testid="sizes">
      {[48, 240].map((size) => (
        <div key={size} className="sizes">
          {MASCOT_MOODS.map((m) => (
            <figure key={m}>
              <Mascot mood={m} size={size} />
              <figcaption>
                {m} · {size}px
              </figcaption>
            </figure>
          ))}
        </div>
      ))}
    </div>
  );
}

function Statics() {
  return (
    <div style={{ display: 'grid', gap: 8 }} data-testid="static">
      <div className="statics">
        {MASCOT_MOODS.map((m) => (
          <figure key={m}>
            <img src={svgUrl(mascotSvgMarkup({ mood: m }))} width={110} height={110} alt={m} />
            <figcaption>{m}</figcaption>
          </figure>
        ))}
      </div>
      <div className="statics">
        {MASCOT_COLORS.map((c) => (
          <figure key={c}>
            <img src={svgUrl(mascotSvgMarkup({ color: c, mood: 'happy' }))} width={110} height={110} alt={c} />
            <figcaption>{c}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function Icons() {
  const files: [string, number, boolean?][] = [
    ['icon.svg', 128],
    ['icon-512.png', 128],
    ['icon-192.png', 96],
    ['apple-touch-icon.png', 90],
    ['icon-maskable-512.png', 128],
    ['icon-maskable-512.png', 128, true],
  ];
  return (
    <div className="icons card" data-testid="icons">
      {files.map(([file, size, masked], i) => (
        <figure key={i}>
          <img
            className={masked ? 'mask' : undefined}
            src={`/icons/${file}?v=${Date.now()}`}
            width={size}
            height={size}
            alt={file}
          />
          <figcaption>{masked ? `${file} (circle mask)` : file}</figcaption>
        </figure>
      ))}
      <figure>
        <img src={`/icons/icon-192.png?v=${Date.now()}`} width={48} height={48} alt="48px" />
        <figcaption>48px</figcaption>
      </figure>
      <figure className="dark" style={{ padding: 8, borderRadius: 12 }}>
        <img src={`/icons/icon-192.png?v=${Date.now()}`} width={64} height={64} alt="on dark" />
        <figcaption style={{ color: '#ccc' }}>on dark</figcaption>
      </figure>
    </div>
  );
}

function App() {
  return (
    <main>
      <h1>Coco</h1>
      <p className="lead">Bonbon&apos;s macaron mascot — moods, colours, sizes and icons.</p>
      {show('playground') && (
        <>
          <h2>Playground</h2>
          <Playground />
        </>
      )}
      {show('grid') && (
        <>
          <h2>Every mood × every colour</h2>
          <Grid />
        </>
      )}
      {show('sizes') && (
        <>
          <h2>Readability: 48px and 240px</h2>
          <Sizes />
        </>
      )}
      {show('static') && (
        <>
          <h2>Static markup (mascotSvgMarkup)</h2>
          <Statics />
        </>
      )}
      {show('icons') && (
        <>
          <h2>App icons</h2>
          <Icons />
        </>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
