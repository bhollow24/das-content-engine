'use client';

import { useState } from 'react';

export function countState(rows, key) {
  return rows.filter((row) => row.state === key).length;
}

export function Stats({ items }) {
  return (
    <div className="stats">
      {items.map(([number, label]) => (
        <div className="stat" key={label}><strong>{number}</strong><span>{label}</span></div>
      ))}
    </div>
  );
}

export function Filters({ labels, value, onChange }) {
  return (
    <div className="filters" aria-label="Analytics filters">
      {labels.map((label) => (
        <button type="button" className={value === label ? 'on' : ''} onClick={() => onChange(label)} key={label}>{label}</button>
      ))}
    </div>
  );
}

export function UpcomingAnalytics({ event, rows }) {
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

function parseMinutes(title) {
  const match = String(title || '').match(/(\d+)\s*min/i) || String(title || '').match(/Open\s*-\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

export default function SmartAgenda({ event, rows, pack, topics }) {
  const unplaced = pack?.unplaced || [];
  const [speakerQuery, setSpeakerQuery] = useState('');
  const [picked, setPicked] = useState([]);
  const [length, setLength] = useState(30);
  const [format, setFormat] = useState('Panel');
  const [suggestion, setSuggestion] = useState(null);

  const visibleSpeakers = unplaced.filter((person) => {
    const hay = `${person.name} ${person.company} ${person.title}`.toLowerCase();
    return !speakerQuery || hay.includes(speakerQuery.toLowerCase());
  });

  function toggleSpeaker(id) {
    setPicked((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 5) return current;
      return [...current, id];
    });
    setSuggestion(null);
  }

  const selected = unplaced.filter((person) => picked.includes(person.id));

  function generateSuggestion() {
    if (selected.length < 2 || selected.length > 5) return;
    const formatRules = { Fireside: 2, Interview: 2, 'Keynote + discussant': 2, Panel: [3, 4, 5] };
    const rule = formatRules[format];
    const ok = Array.isArray(rule) ? rule.includes(selected.length) : selected.length === rule;
    const companies = selected.map((person) => person.company).filter(Boolean);
    const names = selected.map((person) => person.name);
    const last = names.map((name) => name.trim().split(/\s+/).slice(-1)[0]);
    const titleA = companies.length >= 2 ? `${companies[0]} vs ${companies[1]}: Who Sets the Terms` : `${names[0]} and the Institutional Question`;
    const titleB = last.length >= 2 ? `${last[0]} and ${last[1]} on What Still Does Not Work` : 'A Session Built from Unplaced Confirmed Speakers';
    const openRows = rows.filter((row) => {
      const minutes = parseMinutes(row.title);
      const isOpenish = row.state === 'open' || row.status === 'Open' || String(row.title).toLowerCase().startsWith('open');
      return isOpenish && (minutes == null || minutes === length);
    });
    const fill = openRows[0];
    const placement = fill
      ? `Fill existing open row: ${fill.day} · ${fill.track} · ${fill.time} UTC · "${fill.title}" (${fill.state}).`
      : `No matching ${length}-minute open row. Suggest a new ${length}-minute ${format.toLowerCase()} slot on ${event.id === 'london' ? 'Day 1 or Day 2' : 'Day 1'}, Main Stage or Investor Track.`;
    setSuggestion({ format, length, speakers: selected, titles: [titleA, titleB], placement, formatNote: ok ? null : `${format} is usually ${Array.isArray(rule) ? rule[0] + '-' + rule[rule.length - 1] : rule} people. This is still a suggestion.` });
  }

  return (
    <>
      <section className="smart-block">
        <div className="section-heading">
          <p className="eyebrow">01</p>
          <h3>Full agenda</h3>
          <p className="section-intro">Same Airtable snapshot as Content Analytics. Read-only. Placement ideas below use these open rows.</p>
        </div>
        <UpcomingAnalytics event={event} rows={rows} />
      </section>
      <section className="smart-block">
        <div className="section-heading">
          <p className="eyebrow">02</p>
          <h3>Unplaced confirmed speakers</h3>
          <p className="section-intro">Status In for this event and not named on any agenda speaker slot. Soft In is excluded. Blockworks staff are flagged and still listed. They are often hosts.</p>
        </div>
        <Stats items={[[pack?.inCount ?? 0, 'confirmed In'], [pack?.placedCount ?? 0, 'already placed'], [unplaced.length, 'unplaced'], [unplaced.filter((person) => person.staff).length, 'staff in unplaced']]} />
        <div className="toolbar">
          <label className="search-field">
            <span className="sr-only">Search unplaced speakers</span>
            <input type="search" value={speakerQuery} onChange={(eventInput) => setSpeakerQuery(eventInput.target.value)} placeholder="Search names, companies, titles" autoComplete="off" />
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Company</th><th>Title</th><th>Flag</th></tr></thead>
            <tbody>
              {visibleSpeakers.map((person) => (
                <tr key={person.id}>
                  <td>{person.name}</td>
                  <td>{person.company || '-'}</td>
                  <td>{person.title || '-'}</td>
                  <td>{person.staff ? <span className="pill named">Staff</span> : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!visibleSpeakers.length && <p className="table-empty">No unplaced speakers match that search.</p>}
      </section>
      <section className="smart-block">
        <div className="section-heading">
          <p className="eyebrow">03</p>
          <h3>Topics, questions, debates</h3>
          <p className="section-intro">Seed list for editorial sessions. Bennett can add more via chat. This is not an X live pull.</p>
        </div>
        <div className="topic-grid">
          {(topics || []).map((item) => (
            <article className="topic-card" key={item.id}>
              <p className="eyebrow">{item.source}</p>
              <h4>{item.topic}</h4>
              <p className="topic-debate">{item.debate}</p>
              <ul>{item.questions.map((question) => <li key={question}>{question}</li>)}</ul>
              <p className="topic-titles">{item.titleIdeas.join(' / ')}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="smart-block">
        <div className="section-heading">
          <p className="eyebrow">04</p>
          <h3>Build a session</h3>
          <p className="section-intro">Client-side only. Pick 2-5 unplaced speakers. Output is a suggestion card. Nothing is written to Airtable.</p>
        </div>
        <div className="build-controls">
          <div>
            <span className="eyebrow">Length</span>
            <div className="filters">{[20, 30, 45].map((mins) => (
              <button type="button" key={mins} className={length === mins ? 'on' : ''} onClick={() => { setLength(mins); setSuggestion(null); }}>{mins} min</button>
            ))}</div>
          </div>
          <div>
            <span className="eyebrow">Format</span>
            <div className="filters">{['Fireside', 'Panel', 'Interview', 'Keynote + discussant'].map((label) => (
              <button type="button" key={label} className={format === label ? 'on' : ''} onClick={() => { setFormat(label); setSuggestion(null); }}>{label}</button>
            ))}</div>
          </div>
        </div>
        <div className="pick-list">
          {unplaced.map((person) => {
            const on = picked.includes(person.id);
            return (
              <button type="button" key={person.id} className={on ? 'on' : ''} onClick={() => toggleSpeaker(person.id)}>
                {person.name}<span>{person.company}{person.staff ? ' / staff' : ''}</span>
              </button>
            );
          })}
        </div>
        <p className="muted">{selected.length} selected. Fireside / Interview / Keynote + discussant need 2. Panel needs 3-5.</p>
        <button type="button" className="suggest-btn" disabled={selected.length < 2 || selected.length > 5} onClick={generateSuggestion}>Suggestion only</button>
        {suggestion && (
          <article className="suggestion-card">
            <p className="eyebrow">Suggestion only / not written to Airtable</p>
            <h4>{suggestion.titles[0]}</h4>
            <p>Alt title: {suggestion.titles[1]}</p>
            <p>{suggestion.format} / {suggestion.length} minutes</p>
            <p>{suggestion.speakers.map((person) => `${person.name} (${person.company})`).join(' / ')}</p>
            <p>{suggestion.placement}</p>
            {suggestion.formatNote && <p className="muted">{suggestion.formatNote}</p>}
          </article>
        )}
      </section>
    </>
  );
}
