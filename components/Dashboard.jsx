'use client';

import Image from 'next/image';
import { UserButton } from '@clerk/nextjs';
import { useEffect, useMemo, useState } from 'react';

const EVENTS = {
  nyc: {
    id: 'nyc',
    group: 'past',
    title: 'DAS NYC 2026',
    city: 'nyc',
    date: 'March 2026',
    location: 'New York City',
    description: '94 session transcripts with entity and topic coverage.',
  },
  asia: {
    id: 'asia',
    group: 'upcoming',
    title: 'DAS Asia 2026',
    city: 'asia',
    date: 'October 7, 2026',
    location: 'Marina Bay Sands · Singapore',
    description: '36 agenda rows across the Main Stage and Investor Track.',
    wordmark: '/brand/asia-wordmark-dark.svg',
  },
  london: {
    id: 'london',
    group: 'upcoming',
    title: 'DAS London 2026',
    city: 'london',
    date: 'November 10–11, 2026',
    location: 'Hilton Park Lane · London',
    description: '57 agenda rows across two days.',
    wordmark: '/brand/london-wordmark-dark.svg',
  },
};

const GROUPS = {
  past: { title: 'Past Events', intro: '1 event' },
  upcoming: { title: 'Upcoming Events', intro: '2 events' },
};

const REGULATORS = new Set(['SEC', 'CFTC', 'Federal Reserve', 'OCC', 'U.S. Treasury']);
const STABLECOINS = new Set(['USDC', 'PayPal USD', 'Ripple USD']);

function entityType(entity) {
  if (REGULATORS.has(entity.name)) return 'Regulator';
  if (STABLECOINS.has(entity.name)) return 'Stablecoin';
  if (entity.type === 'Project') return 'Protocol';
  if (entity.type === 'Concept') return 'Topic';
  return entity.type;
}

function countState(rows, key) {
  return rows.filter((row) => row.state === key).length;
}

function Stats({ items }) {
  return (
    <div className="stats">
      {items.map(([number, label]) => (
        <div className="stat" key={label}><strong>{number}</strong><span>{label}</span></div>
      ))}
    </div>
  );
}

function Filters({ labels, value, onChange }) {
  return (
    <div className="filters" aria-label="Analytics filters">
      {labels.map((label) => (
        <button type="button" className={value === label ? 'on' : ''} onClick={() => onChange(label)} key={label}>{label}</button>
      ))}
    </div>
  );
}

function BarChart({ title, rows, metric, valueLabel }) {
  const max = Math.max(...rows.map((row) => row[metric]), 1);

  return (
    <article className="bar-chart">
      <div className="bar-chart-heading">
        <h3>{title}</h3>
        <span>Top {rows.length}</span>
      </div>
      <div className="bar-list">
        {rows.map((row) => (
          <div className="bar-row" key={`${metric}-${row.name}`} aria-label={`${row.name}: ${row[metric]} ${valueLabel}`}>
            <div className="bar-label"><strong>{row.name}</strong><span>{row.displayType}</span></div>
            <div className="bar-track" aria-hidden="true"><span style={{ width: `${Math.max((row[metric] / max) * 100, 2)}%` }} /></div>
            <span className="bar-value">{row[metric]}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function PastAnalytics({ mentions }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const rows = useMemo(() => mentions.map((entity) => ({ ...entity, displayType: entityType(entity) })), [mentions]);
  const typeOrder = ['All', 'Company', 'Protocol', 'Person', 'Topic'];
  const filters = typeOrder.filter((type) => type === 'All' || rows.some((row) => row.displayType === type));
  const chartRows = rows.filter((row) => filter === 'All' || row.displayType === filter);
  const mentionBars = [...chartRows].sort((a, b) => b.n - a.n).slice(0, 8);
  const sessionBars = [...chartRows].sort((a, b) => b.sessions - a.sessions || b.n - a.n).slice(0, 8);
  const visible = rows.filter((row) => {
    const matchesType = filter === 'All' || row.displayType === filter;
    const matchesSearch = !search || `${row.name} ${row.displayType}`.toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <>
      <Stats items={[
        [94, 'sessions transcribed'],
        [rows.length, 'entities detected'],
        [rows.filter((row) => row.displayType === 'Company').length, 'companies'],
        [rows.filter((row) => row.displayType === 'Regulator').length, 'regulators'],
      ]} />
      <div className="analytics-filter-row">
        <span>Filter by type</span>
        <Filters labels={filters} value={filter} onChange={setFilter} />
      </div>
      <div className="analytics-charts">
        <BarChart title="Top mentions" rows={mentionBars} metric="n" valueLabel="mentions" />
        <BarChart title="Session reach" rows={sessionBars} metric="sessions" valueLabel="sessions" />
      </div>
      <div className="call"><strong>Canton</strong> appears 55 times across 10 sessions. <strong>Aave</strong> appears 9 times across 7 sessions. Generic topic counts remain directional until transcript QA is complete.</div>
      <div className="toolbar">
        <label className="search-field">
          <span className="sr-only">Search analytics</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search entities or topics" autoComplete="off" />
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Type</th><th className="num">Mentions</th><th className="num">Sessions</th></tr></thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.name}><td>{row.name}</td><td className="type">{row.displayType}</td><td className="num">{row.n}</td><td className="num">{row.sessions}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {!visible.length && <p className="table-empty">No results match those filters.</p>}
    </>
  );
}

function UpcomingAnalytics({ event, rows }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const filters = ['All', 'Named', 'Open', 'Hold'];
  const visible = rows.filter((row) => {
    const matchesState = filter === 'All' || row.state === filter.toLowerCase();
    const haystack = `${row.day} ${row.time} ${row.track} ${row.title} ${row.state}`.toLowerCase();
    return matchesState && (!search || haystack.includes(search.toLowerCase()));
  });

  return (
    <>
      <Stats items={[
        [rows.length, 'agenda rows'],
        [countState(rows, 'named'), 'named sessions'],
        [countState(rows, 'open'), 'open slots'],
        [countState(rows, 'hold'), 'holds'],
      ]} />
      <div className="call">Read-only agenda snapshot. <strong>{countState(rows, 'open') + countState(rows, 'hold')} rows</strong> still require a final title or programming decision.</div>
      <div className="toolbar">
        <label className="search-field">
          <span className="sr-only">Search agenda</span>
          <input type="search" value={search} onChange={(inputEvent) => setSearch(inputEvent.target.value)} placeholder="Search sessions or tracks" autoComplete="off" />
        </label>
        <Filters labels={filters} value={filter} onChange={setFilter} />
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{event.id === 'london' && <th>Day</th>}<th>Time UTC</th><th>Track</th><th>Session</th><th>State</th><th className="num">Speakers</th></tr></thead>
          <tbody>
            {visible.map((row, index) => (
              <tr key={`${row.day}-${row.time}-${row.track}-${index}`}>
                {event.id === 'london' && <td>{row.day}</td>}
                <td className="num">{row.time}</td><td>{row.track}</td><td>{row.title}</td>
                <td><span className={`pill ${row.state}`}>{row.state}</span></td><td className="num">{row.spots}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!visible.length && <p className="table-empty">No results match those filters.</p>}
    </>
  );
}

function ClipLibrary({ event, rows }) {
  const past = event.group === 'past';
  const stats = past
    ? [[0, 'clips indexed'], [94, 'transcripts ready'], [118, 'entities tagged'], ['Drive', 'connection pending']]
    : [[0, 'clips indexed'], [0, 'session IDs assigned'], [rows.length, 'agenda rows'], ['Locked', 'filename format']];

  return (
    <>
      <Stats items={stats} />
      <div className="clip-overview">
        <article>
          <h3>{past ? 'Data status' : 'Setup status'}</h3>
          <p>{past ? 'Transcript and entity data are ready. Connect the Drive clip folder to add video records.' : 'Assign session IDs and connect the event Drive folder before recordings arrive.'}</p>
          {!past && <code>DAS{event.id === 'asia' ? 'Asia' : 'London'}26_S14_market-structure_c01.mp4</code>}
        </article>
        <article>
          <h3>Readiness</h3>
          <ul className="checklist">
            {past ? (
              <><li><span>Transcript corpus</span><span>Ready</span></li><li><span>Entity tags</span><span>Ready</span></li><li><span>Drive clips</span><span>Not connected</span></li><li><span>Published URLs</span><span>Not connected</span></li></>
            ) : (
              <><li><span>Filename convention</span><span>Ready</span></li><li><span>Session IDs</span><span>Not assigned</span></li><li><span>Drive folder</span><span>Not connected</span></li><li><span>Vendor guide</span><span>Draft</span></li></>
            )}
          </ul>
        </article>
      </div>
      <div className="toolbar clip-toolbar">
        <label className="search-field"><span className="sr-only">Search clip library</span><input type="search" placeholder="Search clips, speakers, companies, or topics" disabled /></label>
        <div className="filters"><button type="button" className="on" disabled>All clips</button><button type="button" disabled>Published</button><button type="button" disabled>Draft</button></div>
      </div>
      <div className="table-wrap clip-table-wrap">
        <table><thead><tr><th>Clip</th><th>Session</th><th>Speaker</th><th>Topics</th><th>Status</th></tr></thead><tbody /></table>
      </div>
      <div className="empty-state"><h3>No clips indexed yet</h3><p>Connect the event Drive folder to populate this library.</p></div>
    </>
  );
}

export default function Dashboard({ data }) {
  const [route, setRoute] = useState('home');

  useEffect(() => {
    const syncRoute = () => setRoute(window.location.hash.slice(1) || 'home');
    syncRoute();
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  function navigate(next) {
    const hash = next === 'home' ? '' : next;
    if (window.location.hash.slice(1) === hash) setRoute(next);
    else window.location.hash = hash;
  }

  const [eventId, toolName] = route.split('/');
  const event = EVENTS[eventId];
  const tool = toolName === 'clips' ? 'clips' : 'analytics';
  const group = GROUPS[route];

  let eyebrow = 'Events';
  let title = 'DAS Content Engine';
  let subtitle = 'Select an event.';
  if (group) {
    title = group.title;
    subtitle = group.intro;
  } else if (event) {
    eyebrow = GROUPS[event.group].title;
    title = tool === 'clips' ? 'Clip Library' : 'Content Analytics';
    subtitle = `${event.title} · ${event.date} · ${event.location}`;
  }

  return (
    <div className="wrap">
      <header className="app-header">
        <div className="topline">
          <button className="brand-home" type="button" onClick={() => navigate('home')} aria-label="Return to the DAS Content Engine home">Blockworks</button>
          <span className="draft">Internal workspace</span>
          <span className="guardrail">Drafts only · no auto-posting</span>
          <div className="user-control" aria-label="Account menu"><UserButton /></div>
        </div>
        <div className="product-lockup" aria-label="DAS Content Engine"><span className="product-mark">DAS</span><span className="product-name">Content Engine</span></div>
        <div className="header-copy"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="sub">{subtitle}</p></div>
      </header>

      <main>
        {route === 'home' && (
          <section className="view on" id="view-home">
            <div className="section-heading"><h2>Events</h2></div>
            <div className="choice-grid">
              <button className="choice-card past-card" type="button" onClick={() => navigate('past')}><span className="choice-index">01</span><span className="choice-label">Past Events</span><span className="choice-meta"><span>Content Analytics</span><span>Clip Library</span></span><span className="choice-arrow" aria-hidden="true">→</span></button>
              <button className="choice-card upcoming-card" type="button" onClick={() => navigate('upcoming')}><span className="choice-index">02</span><span className="choice-label">Upcoming Events</span><span className="choice-meta"><span>Content Analytics</span><span>Clip Library</span></span><span className="choice-arrow" aria-hidden="true">→</span></button>
            </div>
            <div className="home-status"><div><strong>94</strong><span>past sessions transcribed</span></div><div><strong>2</strong><span>upcoming events</span></div><div><strong>118</strong><span>entities detected</span></div><div><strong>0</strong><span>clips indexed</span></div></div>
          </section>
        )}

        {group && (
          <section className="view on">
            <button className="back-link" type="button" onClick={() => navigate('home')}>← All events</button>
            <div className="section-heading"><p className="eyebrow">Events</p><h2>{group.title}</h2><p className="section-intro">{group.intro}</p></div>
            <div className="event-grid">
              {Object.values(EVENTS).filter((item) => item.group === route).map((item) => (
                <button className="event-card" type="button" onClick={() => navigate(`${item.id}/analytics`)} key={item.id}>
                  <span className="event-state">{item.date} · {item.location}</span><h3>{item.title}</h3><p>{item.description}</p><span className="event-tools"><span>Content Analytics</span><span>Clip Library</span></span><span className="event-arrow" aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {event && (
          <section className="view on">
            <button className="back-link" type="button" onClick={() => navigate(event.group)}>← Back to events</button>
            <div className="workspace-heading">
              <div className="workspace-mark-wrap">
                {event.wordmark ? <Image className="workspace-wordmark on" src={event.wordmark} alt={event.title} width={240} height={72} /> : <div className="workspace-text-mark"><span>DAS</span><small>{event.city}</small></div>}
              </div>
              <div><p className="eyebrow">{GROUPS[event.group].title} · {tool === 'clips' ? 'Clip Library' : 'Content Analytics'}</p><h2>{event.title}</h2><p className="section-intro">{event.date} · {event.location}</p></div>
            </div>
            <nav className="workspace-nav" aria-label="Event tools"><button type="button" className={tool === 'analytics' ? 'on' : ''} onClick={() => navigate(`${event.id}/analytics`)}>Content Analytics</button><button type="button" className={tool === 'clips' ? 'on' : ''} onClick={() => navigate(`${event.id}/clips`)}>Clip Library</button></nav>
            <div className="tool-panel on">
              {tool === 'analytics' ? (event.group === 'past' ? <PastAnalytics mentions={data.mentions} /> : <UpcomingAnalytics event={event} rows={data[event.id]} />) : <ClipLibrary event={event} rows={data[event.id] || []} />}
            </div>
          </section>
        )}
      </main>
      <footer><span>Blockworks · DAS Content Engine</span><span>Authenticated workspace</span></footer>
    </div>
  );
}
