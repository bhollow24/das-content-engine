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
    wordmark: '/brand/nyc-wordmark-dark.svg',
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

function SmartAgenda({ event, smart }) {
  const agenda = smart?.[event.id];
  const speakers = agenda?.unplaced || [];
  const [topics, setTopics] = useState(smart?.topics || []);
  const [topicsReady, setTopicsReady] = useState(false);
  const [draggedTopicId, setDraggedTopicId] = useState('');
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: '', description: '' });
  const [editingTopicId, setEditingTopicId] = useState('');
  const [topicDraft, setTopicDraft] = useState({ title: '', description: '' });
  const [selectedSpeakerId, setSelectedSpeakerId] = useState(speakers[0]?.id || '');
  const [selectedTopicId, setSelectedTopicId] = useState(topics[0]?.id || '');
  const [showSuggestion, setShowSuggestion] = useState(false);

  useEffect(() => {
    try {
      const savedTopics = window.localStorage.getItem('das-smart-topics-v1');
      if (savedTopics) {
        const parsed = JSON.parse(savedTopics);
        if (Array.isArray(parsed) && parsed.length) setTopics(parsed);
      }
    } catch {
      // Keep the bundled topic snapshot if browser storage is unavailable or invalid.
    } finally {
      setTopicsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!topicsReady) return;
    try {
      window.localStorage.setItem('das-smart-topics-v1', JSON.stringify(topics));
    } catch {
      // Topic editing remains available for the current session when storage is unavailable.
    }
  }, [topics, topicsReady]);

  const activeSpeakerId = speakers.some((speaker) => speaker.id === selectedSpeakerId)
    ? selectedSpeakerId
    : speakers[0]?.id;
  const activeTopicId = topics.some((topic) => topic.id === selectedTopicId)
    ? selectedTopicId
    : topics[0]?.id;
  const selectedSpeaker = speakers.find((speaker) => speaker.id === activeSpeakerId);
  const selectedTopic = topics.find((topic) => topic.id === activeTopicId);

  function chooseSpeaker(id) {
    setSelectedSpeakerId(id);
    setShowSuggestion(false);
  }

  function chooseTopic(id) {
    setSelectedTopicId(id);
    setShowSuggestion(false);
  }

  function reorderTopic(sourceId, targetId) {
    if (!sourceId || sourceId === targetId) return;
    setTopics((current) => {
      const sourceIndex = current.findIndex((topic) => topic.id === sourceId);
      const targetIndex = current.findIndex((topic) => topic.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function moveTopic(topicId, direction) {
    setTopics((current) => {
      const index = current.findIndex((topic) => topic.id === topicId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addTopic(event) {
    event.preventDefault();
    const title = newTopic.title.trim();
    const description = newTopic.description.trim();
    if (!title || !description) return;
    const topic = {
      id: `custom-${Date.now()}`,
      topic: title,
      debate: description,
      questions: [],
      titleIdeas: [title],
      source: 'custom',
    };
    setTopics((current) => [...current, topic]);
    setSelectedTopicId(topic.id);
    setNewTopic({ title: '', description: '' });
    setShowAddTopic(false);
    setShowSuggestion(false);
  }

  function startEditingTopic(topic) {
    setEditingTopicId(topic.id);
    setTopicDraft({ title: topic.topic, description: topic.debate });
    setShowAddTopic(false);
    setShowSuggestion(false);
  }

  function cancelEditingTopic() {
    setEditingTopicId('');
    setTopicDraft({ title: '', description: '' });
  }

  function saveTopic(event, topicId) {
    event.preventDefault();
    const title = topicDraft.title.trim();
    const description = topicDraft.description.trim();
    if (!title || !description) return;
    setTopics((current) => current.map((topic) => (
      topic.id === topicId
        ? {
            ...topic,
            topic: title,
            debate: description,
            titleIdeas: topic.source === 'custom' ? [title] : topic.titleIdeas,
          }
        : topic
    )));
    cancelEditingTopic();
  }

  if (!agenda) return <p className="table-empty">No Smart Agenda snapshot is available for this event.</p>;

  return (
    <>
      <Stats items={[
        [agenda.inCount, 'speakers marked In'],
        [agenda.placedCount, 'placed on agenda'],
        [speakers.length, 'still unplaced'],
        [topics.length, 'topic angles'],
      ]} />

      <section className="smart-block">
        <div className="smart-block-header">
          <div><p className="eyebrow">Programming gap</p><h3>Unplaced speakers</h3></div>
          <p>{speakers.length} confirmed speakers are not yet matched to an agenda slot.</p>
        </div>
        <div className="speaker-roster">
          {speakers.map((speaker) => (
            <article className="speaker-card" key={speaker.id}>
              <div><h4>{speaker.name}</h4><p>{speaker.title || 'Role not listed'} · {speaker.company}</p></div>
              {speaker.staff && <span className="pill hold">Blockworks</span>}
            </article>
          ))}
        </div>
      </section>

      <section className="smart-block">
        <div className="smart-block-header">
          <div><p className="eyebrow">Editorial bank</p><h3>Hot Topics</h3></div>
          <div className="topic-header-actions">
            <span>Drag to reorder · saved in this browser</span>
            <button className="add-topic-btn" type="button" onClick={() => setShowAddTopic((current) => !current)}>{showAddTopic ? 'Cancel' : '+ Add topic'}</button>
          </div>
        </div>
        {showAddTopic && (
          <form className="add-topic-form" onSubmit={addTopic}>
            <label><span>Topic title</span><input value={newTopic.title} onChange={(inputEvent) => setNewTopic((current) => ({ ...current, title: inputEvent.target.value }))} placeholder="e.g. Institutional DeFi credit" required /></label>
            <label><span>Description</span><textarea value={newTopic.description} onChange={(inputEvent) => setNewTopic((current) => ({ ...current, description: inputEvent.target.value }))} placeholder="What is the tension, question, or market shift?" rows="3" required /></label>
            <button className="suggest-btn" type="submit">Add to Hot Topics</button>
          </form>
        )}
        <div className="topic-list">
          {topics.map((topic, index) => (
            <div
              className={`topic-row ${draggedTopicId === topic.id ? 'dragging' : ''}`}
              draggable={editingTopicId !== topic.id}
              onDragStart={() => setDraggedTopicId(topic.id)}
              onDragOver={(dragEvent) => dragEvent.preventDefault()}
              onDrop={(dragEvent) => { dragEvent.preventDefault(); reorderTopic(draggedTopicId, topic.id); setDraggedTopicId(''); }}
              onDragEnd={() => setDraggedTopicId('')}
              key={topic.id}
            >
              <span className="drag-handle" aria-hidden="true" title="Drag to reorder">⋮⋮</span>
              {editingTopicId === topic.id ? (
                <form className="topic-edit-form" onSubmit={(submitEvent) => saveTopic(submitEvent, topic.id)}>
                  <label><span>Topic title</span><input value={topicDraft.title} onChange={(inputEvent) => setTopicDraft((current) => ({ ...current, title: inputEvent.target.value }))} required autoFocus /></label>
                  <label><span>Description</span><textarea value={topicDraft.description} onChange={(inputEvent) => setTopicDraft((current) => ({ ...current, description: inputEvent.target.value }))} rows="3" required /></label>
                  <span className="topic-edit-actions">
                    <button type="submit">Save</button>
                    <button type="button" onClick={cancelEditingTopic}>Cancel</button>
                  </span>
                </form>
              ) : (
                <details className="topic-card">
                  <summary>
                    <span className="topic-preview"><strong>{topic.topic}</strong><span>{topic.debate}</span></span>
                    <span className="expand-label">Details</span>
                  </summary>
                  <div className="topic-details">
                    {topic.questions?.length ? <><p className="eyebrow">Questions to answer</p><ul>{topic.questions.map((question) => <li key={question}>{question}</li>)}</ul></> : <p className="muted">No discussion questions added yet.</p>}
                    {topic.titleIdeas?.length ? <p className="topic-titles"><strong>Title directions:</strong> {topic.titleIdeas.join(' / ')}</p> : null}
                  </div>
                </details>
              )}
              <span className="topic-row-actions">
                <button className="edit-topic-btn" type="button" onClick={() => startEditingTopic(topic)} disabled={editingTopicId === topic.id}>Edit</button>
                <button type="button" aria-label={`Move ${topic.topic} up`} disabled={index === 0} onClick={() => moveTopic(topic.id, -1)}>↑</button>
                <button type="button" aria-label={`Move ${topic.topic} down`} disabled={index === topics.length - 1} onClick={() => moveTopic(topic.id, 1)}>↓</button>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="smart-block">
        <div className="smart-block-header">
          <div><p className="eyebrow">Pairing tool</p><h3>Build a session</h3></div>
          <p>Pair an unplaced speaker with a live editorial angle to produce a working session brief.</p>
        </div>
        <div className="build-controls">
          <div>
            <span className="eyebrow">Choose a speaker</span>
            <div className="pick-list">
              {speakers.map((speaker) => (
                <button type="button" className={activeSpeakerId === speaker.id ? 'on' : ''} aria-pressed={activeSpeakerId === speaker.id} onClick={() => chooseSpeaker(speaker.id)} key={speaker.id}>
                  {speaker.name}<span>{speaker.company}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="eyebrow">Choose a topic</span>
            <div className="pick-list">
              {topics.map((topic) => (
                <button type="button" className={activeTopicId === topic.id ? 'on' : ''} aria-pressed={activeTopicId === topic.id} onClick={() => chooseTopic(topic.id)} key={topic.id}>
                  {topic.topic}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button className="suggest-btn" type="button" onClick={() => setShowSuggestion(true)} disabled={!selectedSpeaker || !selectedTopic}>Build working brief</button>
        {showSuggestion && selectedSpeaker && selectedTopic && (
          <article className="suggestion-card" aria-live="polite">
            <p className="eyebrow">Working session brief</p>
            <h4>{selectedTopic.titleIdeas[0]}</h4>
            <p><strong>Suggested speaker:</strong> {selectedSpeaker.name}, {selectedSpeaker.title ? `${selectedSpeaker.title}, ` : ''}{selectedSpeaker.company}</p>
            <p><strong>Editorial tension:</strong> {selectedTopic.debate}</p>
            <ul>{selectedTopic.questions.map((question) => <li key={question}>{question}</li>)}</ul>
            {selectedTopic.titleIdeas[1] && <p className="topic-titles"><strong>Alternate title:</strong> {selectedTopic.titleIdeas[1]}</p>}
          </article>
        )}
      </section>
    </>
  );
}

function NycClipLibrary({ nyc }) {
  const [dayFilter, setDayFilter] = useState('Day 1');
  const [stageFilter, setStageFilter] = useState('main');
  const [search, setSearch] = useState('');
  const sessions = nyc?.sessions || [];
  const playlistOnly = nyc?.playlistOnly || [];
  const driveSocial = nyc?.driveSocial || {};
  const rows = useMemo(() => {
    const transcribed = sessions.map((session) => ({
      ...session,
      kind: session.drive_full_video ? 'Drive full' : 'Transcript',
    }));
    const extras = playlistOnly.map((session) => ({
      ...session,
      has_transcript: false,
      mention_count: null,
      drive_full_video: null,
      kind: 'YouTube only',
    }));
    return [...transcribed, ...extras];
  }, [sessions, playlistOnly]);
  const dayFilters = ['Day 1', 'Day 2', 'Day 3', 'All days'];
  const stages = useMemo(() => {
    const dayRows = rows.filter((row) => dayFilter === 'All days' || `Day ${row.day}` === dayFilter);
    return [...new Set(dayRows.map((row) => row.stage || 'main'))]
      .sort((a, b) => (a === 'main' ? -1 : b === 'main' ? 1 : a.localeCompare(b)));
  }, [dayFilter, rows]);

  useEffect(() => {
    if (stageFilter !== 'All stages' && !stages.includes(stageFilter)) {
      setStageFilter(stages.includes('main') ? 'main' : 'All stages');
    }
  }, [stageFilter, stages]);

  const visible = rows.filter((row) => {
    const dayLabel = `Day ${row.day}`;
    const matchesDay = dayFilter === 'All days' || dayFilter === dayLabel;
    const matchesStage = stageFilter === 'All stages' || (row.stage || 'main') === stageFilter;
    const clipHay = (row.social_clips || []).map((clip) => `${clip.lastNameToken || ''} ${clip.driveTitle || ''}`).join(' ');
    const speakerHay = (row.speakers || []).join(' ');
    const haystack = `${row.title} ${speakerHay} ${row.stage || ''} ${row.filename || ''} ${row.track || ''} ${row.kind} ${clipHay}`.toLowerCase();
    return matchesDay && matchesStage && (!search || haystack.includes(search.toLowerCase()));
  });
  const folders = driveSocial.folders || {};
  const stageLabel = (stage) => stage === 'main'
    ? 'Main Stage'
    : stage.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <>
      <Stats items={[
        [sessions.length, 'sessions transcribed'],
        [driveSocial.day1Mapped ?? nyc?.clipsDay1?.mappedSocialCount ?? 44, 'mapped Day 1 clips'],
        [driveSocial.total ?? 89, 'unmapped social clips'],
      ]} />
      <div className="clip-filter-stack">
        <div className="clip-filter-group">
          <span className="clip-filter-label"><strong>1</strong> Filter by day</span>
          <Filters labels={dayFilters} value={dayFilter} onChange={setDayFilter} />
        </div>
        <div className="clip-filter-group">
          <span className="clip-filter-label"><strong>2</strong> Filter by stage</span>
          <div className="filters" aria-label="Filter clips by stage">
            {[...stages, 'All stages'].map((stage) => (
              <button type="button" className={stageFilter === stage ? 'on' : ''} onClick={() => setStageFilter(stage)} key={stage}>
                {stage === 'All stages' ? stage : stageLabel(stage)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="toolbar clip-search-toolbar">
        <label className="search-field">
          <span className="sr-only">Search clip library</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, speaker, stage, filename, or clip" autoComplete="off" />
        </label>
        <span className="result-count">{visible.length} sessions</span>
      </div>
      <div className="table-wrap clip-library-table-wrap">
        <table className="clip-library-table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Speakers</th>
              <th>Day</th>
              <th>Stage</th>
              <th>Filename</th>
              <th>YouTube</th>
              <th>Transcript</th>
              <th className="num">Mentions</th>
              <th>Drive</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.youtube_id || row.filename}>
                <td className="session-cell">
                  <div className="session-title">{row.title}</div>
                  <div className="type">{row.kind}</div>
                  {row.social_clips?.length ? (
                    <div className="nested-clips">
                      <div className="nested-clips-heading">{row.social_clips.length} mapped {row.social_clips.length === 1 ? 'clip' : 'clips'}</div>
                      {row.social_clips.map((clip) => (
                        <a className="nested-clip" key={clip.fileId} href={clip.url} target="_blank" rel="noreferrer">
                          <span className="clip-index">Clip {String(clip.clipIndex).padStart(2, '0')}</span>
                          <span className="clip-name">{clip.driveTitle || `Clip ${clip.clipIndex}`}</span>
                          <span className="clip-open" aria-hidden="true">Open ↗</span>
                        </a>
                      ))}
                    </div>
                  ) : null}
                </td>
                <td>{row.speakers?.length ? row.speakers.join(', ') : '—'}</td>
                <td className="num">{row.day}</td>
                <td>{stageLabel(row.stage || 'main')}</td>
                <td className="filename-cell">{row.filename}</td>
                <td>{row.youtube_url ? <a href={row.youtube_url} target="_blank" rel="noreferrer">Watch</a> : '—'}</td>
                <td>{row.has_transcript && row.youtube_url ? <a className="transcript-link" href={row.youtube_url} target="_blank" rel="noreferrer" title="Open the source video to view its transcript">View transcript ↗</a> : '—'}</td>
                <td className="num">{row.mention_count ?? '—'}</td>
                <td>
                  {row.drive_full_video?.url ? <a href={row.drive_full_video.url} target="_blank" rel="noreferrer">Full video</a> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!visible.length && <p className="table-empty">No sessions match those filters.</p>}
      <div className="social-clip-block">
        <h3>Unmapped social clips</h3>
        <p>Day 1 social clips are mapped. Remaining unmapped clips are Day 2 and Day 3. Drive files have not been renamed.</p>
        <div className="social-folders">
          <a href={folders.day1} target="_blank" rel="noreferrer"><strong>Day 1</strong><span>44 mapped / 0 unmapped</span></a>
          <a href={folders.day2} target="_blank" rel="noreferrer"><strong>Day 2</strong><span>{driveSocial.day2 || 45} clips</span></a>
          <a href={folders.day3} target="_blank" rel="noreferrer"><strong>Day 3</strong><span>{driveSocial.day3 || 44} clips</span></a>
        </div>
      </div>
    </>
  );
}

function ClipLibrary({ event, rows, nyc }) {
  if (event.id === 'nyc') return <NycClipLibrary nyc={nyc} />;
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
          {!past && <code>DAS{event.id === 'asia' ? 'Asia' : 'London'}26_D1_main_market-structure_c01.mp4</code>}
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

export default function Dashboard({ data, nyc, smart }) {
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
  const tool = toolName === 'clips' ? 'clips' : toolName === 'smart' && event?.group === 'upcoming' ? 'smart' : 'analytics';
  const group = GROUPS[route];
  const toolLabel = tool === 'clips' ? 'Clip Library' : tool === 'smart' ? 'Smart Agenda' : 'Content Analytics';

  let eyebrow = 'Events';
  let title = 'DAS Content Engine';
  let subtitle = 'Select an event.';
  if (group) {
    title = group.title;
    subtitle = group.intro;
  } else if (event) {
    eyebrow = GROUPS[event.group].title;
    title = toolLabel;
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
              <button className="choice-card upcoming-card" type="button" onClick={() => navigate('upcoming')}><span className="choice-index">02</span><span className="choice-label">Upcoming Events</span><span className="choice-meta"><span>Content Analytics</span><span>Smart Agenda</span><span>Clip Library</span></span><span className="choice-arrow" aria-hidden="true">→</span></button>
            </div>
            <div className="home-status"><div><strong>94</strong><span>past sessions transcribed</span></div><div><strong>2</strong><span>upcoming events</span></div><div><strong>118</strong><span>entities detected</span></div><div><strong>102</strong><span>NYC videos listed</span></div></div>
          </section>
        )}

        {group && (
          <section className="view on">
            <button className="back-link" type="button" onClick={() => navigate('home')}>← All events</button>
            <div className="section-heading"><p className="eyebrow">Events</p><h2>{group.title}</h2><p className="section-intro">{group.intro}</p></div>
            <div className="event-grid">
              {Object.values(EVENTS).filter((item) => item.group === route).map((item) => (
                <button className="event-card" type="button" onClick={() => navigate(`${item.id}/analytics`)} key={item.id}>
                  <span className="event-state">{item.date} · {item.location}</span><h3>{item.title}</h3><p>{item.description}</p><span className="event-tools"><span>Content Analytics</span>{item.group === 'upcoming' && <span>Smart Agenda</span>}<span>Clip Library</span></span><span className="event-arrow" aria-hidden="true">→</span>
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
              <div><p className="eyebrow">{GROUPS[event.group].title} · {toolLabel}</p><h2>{event.title}</h2><p className="section-intro">{event.date} · {event.location}</p></div>
            </div>
            <nav className={`workspace-nav ${event.group === 'upcoming' ? 'three' : ''}`} aria-label="Event tools"><button type="button" className={tool === 'analytics' ? 'on' : ''} onClick={() => navigate(`${event.id}/analytics`)}>Content Analytics</button>{event.group === 'upcoming' && <button type="button" className={tool === 'smart' ? 'on' : ''} onClick={() => navigate(`${event.id}/smart`)}>Smart Agenda</button>}<button type="button" className={tool === 'clips' ? 'on' : ''} onClick={() => navigate(`${event.id}/clips`)}>Clip Library</button></nav>
            <div className="tool-panel on">
              {tool === 'smart' && event.group === 'upcoming'
                ? <SmartAgenda event={event} smart={smart} />
                : tool === 'analytics'
                  ? (event.group === 'past' ? <PastAnalytics mentions={data.mentions} /> : <UpcomingAnalytics event={event} rows={data[event.id]} />)
                  : <ClipLibrary event={event} rows={data[event.id] || []} nyc={nyc} />}
            </div>
          </section>
        )}
      </main>
      <footer><span>Blockworks · DAS Content Engine</span><span>Authenticated workspace</span></footer>
    </div>
  );
}
