'use client';

import { useEffect, useMemo, useState } from 'react';

const STATUSES = ['Wait', 'Target', 'Invited', 'In Touch', 'Thinking', 'Soft In', 'In', 'Unlikely but Revisit', 'No', 'Cancelled'];
const REPLY_ACTIONS = [
  ['bump_short', 'Bump (short)'],
  ['bump_dates', 'Bump (dates again)'],
  ['yes', 'Reply: yes / thanks'],
  ['soft_in', 'Reply: soft-in / keep warm'],
  ['alternate', 'Reply: decline + alternate'],
  ['custom', 'Reply: custom'],
];

function age(value) {
  if (!value) return 'no thread';
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
  return days === 0 ? 'today' : `${days}d ago`;
}

function initials(name = '') {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function recipientFor(record, type) {
  if (type === 'poc') return { to: record.poc?.email || '', recipientName: record.poc?.name || 'there' };
  return { to: record.email || '', recipientName: record.name };
}

function RequestState({ loading, error, children }) {
  if (loading) return <div className="inv-state">Loading the invitation queue…</div>;
  if (error) return <div className="inv-state inv-error"><strong>Could not load Invitations</strong><span>{error}</span></div>;
  return children;
}

export default function InvitationsCommandCenter() {
  const [records, setRecords] = useState([]);
  const [integration, setIntegration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventFilter, setEventFilter] = useState('Asia');
  const [search, setSearch] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [thread, setThread] = useState({ messages: [], classification: null });
  const [threadLoading, setThreadLoading] = useState(false);
  const [compose, setCompose] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');

  async function loadBoard(silent = false) {
    if (!silent) setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/invitations', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Invitation queue unavailable.');
      setRecords(result.records || []);
      setIntegration(result.integration);
    } catch (caught) {
      setError(caught.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadBoard();
    const poll = window.setInterval(() => loadBoard(true), 10 * 60 * 1000);
    return () => window.clearInterval(poll);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const selected = records.find((record) => record.id === selectedId) || null;

  useEffect(() => {
    if (!selected) return;
    const kind = selected.threadId ? 'reply' : 'first';
    const recipientType = selected.email ? 'direct' : 'poc';
    const recipient = recipientFor(selected, recipientType);
    setCompose({
      kind,
      event: selected.event,
      style: 'short',
      recipientType,
      ...recipient,
      name: selected.name,
      company: selected.company,
      hotel: false,
      token2049: selected.event === 'Asia',
      sessionIdea: '',
      whyThem: `${selected.title ? `Given your work as ${selected.title}` : 'Given your work'} at ${selected.company}, your perspective would be a strong fit for the institutional audience.`,
      cc: kind === 'first' ? 'events@blockworks.com' : '',
      replyType: kind === 'reply' ? 'bump_short' : null,
      customBody: '',
    });
    setPreview(null);
    setNotice('');
    if (selected.threadId) {
      const loadThread = (silent = false) => {
        if (!silent) setThreadLoading(true);
        return fetch(`/api/invitations?thread=${encodeURIComponent(selected.threadId)}`, { cache: 'no-store' })
        .then(async (response) => {
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Thread unavailable.');
          setThread(result);
          if (result.replyTo || result.subject) setCompose((current) => ({ ...current, ...(result.replyTo ? { to: result.replyTo } : {}), ...(result.subject ? { subject: result.subject } : {}) }));
        })
        .catch((caught) => setNotice(caught.message))
        .finally(() => { if (!silent) setThreadLoading(false); });
      };
      loadThread();
      const poll = window.setInterval(() => loadThread(true), 10 * 60 * 1000);
      return () => window.clearInterval(poll);
    } else setThread({ messages: [], classification: null });
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => records.filter((record) => {
    const matchesEvent = eventFilter === 'Both' || record.event === eventFilter;
    const matchesSearch = !search || `${record.name} ${record.title} ${record.company}`.toLowerCase().includes(search.toLowerCase());
    const matchesCancelled = showCancelled || record.status !== 'Cancelled';
    return matchesEvent && matchesSearch && matchesCancelled;
  }), [records, eventFilter, search, showCancelled]);

  const counts = useMemo(() => Object.fromEntries(STATUSES.map((status) => [status, visible.filter((record) => record.status === status).length])), [visible]);

  function updateCompose(patch) {
    setCompose((current) => ({ ...current, ...patch }));
    setPreview(null);
  }

  function pickRecipient(type) {
    updateCompose({ recipientType: type, ...recipientFor(selected, type) });
  }

  async function requestPreview() {
    setBusy('preview');
    setNotice('');
    try {
      const response = await fetch('/api/invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'preview', input: compose }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Preview failed.');
      setPreview(result.preview);
    } catch (caught) { setNotice(caught.message); }
    finally { setBusy(''); }
  }

  async function perform(mode) {
    if (!preview) return;
    if (mode === 'send' && !window.confirm(`Send this email now to ${preview.to}?`)) return;
    setBusy(mode);
    setNotice('');
    const recordIds = [selected.id];
    if (compose.event === 'Both' && selected.counterpartId) recordIds.push(selected.counterpartId);
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, input: compose, recordIds, threadId: selected.threadId, previousNotes: selected.notes, previewConfirmed: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `${mode} failed.`);
      const base = result.demo ? `Testing mode: ${mode === 'draft' ? 'draft simulated' : 'send simulated'}; no email or Airtable record changed.` : mode === 'draft' ? 'Draft created in Bennett’s Gmail.' : 'Email sent and Airtable refreshed.';
      setNotice([base, result.warning].filter(Boolean).join(' '));
      if (!result.demo && mode === 'send') await loadBoard();
      if (result.demo && mode === 'send' && compose.kind === 'first') setRecords((current) => current.map((record) => recordIds.includes(record.id) ? { ...record, status: 'Invited' } : record));
    } catch (caught) { setNotice(caught.message); }
    finally { setBusy(''); }
  }

  async function applyProposedStatus() {
    const proposal = thread.classification?.proposedStatus || selected.proposedStatus;
    if (!proposal) return;
    const recordIds = [selected.id];
    if (compose.event === 'Both' && selected.counterpartId) recordIds.push(selected.counterpartId);
    setBusy('status');
    try {
      const response = await fetch('/api/invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'confirm-status', recordIds, status: proposal }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Status update failed.');
      setRecords((current) => current.map((record) => recordIds.includes(record.id) ? { ...record, status: proposal } : record));
      setNotice(result.demo ? `Testing mode: proposed ${proposal} move confirmed locally.` : `Airtable status changed to ${proposal}.`);
    } catch (caught) { setNotice(caught.message); }
    finally { setBusy(''); }
  }

  const proposal = thread.classification || (selected?.proposedStatus ? { proposedStatus: selected.proposedStatus, summary: selected.classification } : null);
  const sendBlocked = !compose?.to || selected?.status === 'In';

  return (
    <section className="invitations-shell">
      <div className="inv-topbar">
        <div><p className="inv-kicker">Global workspace</p><h2>Invitations Command Center</h2></div>
        <div className="inv-live"><span className={integration?.demo ? 'demo' : 'connected'} />{integration?.demo ? 'Testing mode' : 'Live integrations'}</div>
      </div>
      {integration?.demo && <div className="inv-banner"><strong>Safe testing mode.</strong> The interface is fully testable, but Gmail and Airtable writes are simulated until preview credentials are added.</div>}
      <div className="inv-layout">
        <aside className="inv-sidebar">
          <div className="inv-field"><span>Event</span><div className="inv-segment">{['Asia', 'London', 'Both'].map((value) => <button key={value} type="button" className={eventFilter === value ? 'on' : ''} onClick={() => setEventFilter(value)}>{value}</button>)}</div></div>
          <label className="inv-field"><span>Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Name, firm, title" /></label>
          <label className="inv-check"><input type="checkbox" checked={showCancelled} onChange={(event) => setShowCancelled(event.target.checked)} /> Show Cancelled</label>
          <div className="inv-summary"><span>Visible speakers</span><strong>{visible.length}</strong><small>Group: SPEAKERS</small></div>
          <div className="inv-rules"><strong>Send policy</strong><p>Preview required. Send requires a second confirmation. In and No moves always require confirmation.</p></div>
        </aside>
        <RequestState loading={loading} error={error}>
          <div className="inv-board" aria-label="Speaker invitation kanban">
            {STATUSES.filter((status) => showCancelled || status !== 'Cancelled').map((status) => (
              <section className="inv-column" key={status}>
                <header><span>{status}</span><strong>{counts[status] || 0}</strong></header>
                <div className="inv-card-list">
                  {visible.filter((record) => record.status === status).map((record) => (
                    <button type="button" className={`inv-card${record.id === selectedId ? ' selected' : ''}`} onClick={() => setSelectedId(record.id)} key={record.id}>
                      <div className="inv-card-head"><span className={`event-dot ${record.event.toLowerCase()}`} /><small>{record.event}</small>{record.sponsor && <em>Sponsor</em>}</div>
                      <strong>{record.name}</strong><span>{record.title || 'Title unavailable'}</span><span>{record.company || 'Company unavailable'}</span>
                      <div className="inv-card-foot"><small>{age(record.lastBennettAt)}</small><small>{record.email ? 'Email' : record.poc ? 'POC' : 'Need email'}</small></div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </RequestState>
      </div>
      {selected && compose && (
        <aside className="inv-rail" aria-label={`${selected.name} invitation details`}>
          <button className="inv-close" type="button" onClick={() => setSelectedId(null)} aria-label="Close details">Close</button>
          <div className="inv-person"><span className="inv-avatar">{initials(selected.name)}</span><div><p>{selected.event} · {selected.status}</p><h3>{selected.name}</h3><span>{selected.title} · {selected.company}</span></div></div>
          <div className="inv-links">{selected.linkedIn && <a href={selected.linkedIn} target="_blank" rel="noreferrer">LinkedIn</a>}{selected.x && <a href={selected.x} target="_blank" rel="noreferrer">X profile</a>}<span>{selected.sponsor ? 'Sponsor seat' : 'No sponsor match'}</span></div>
          {proposal?.proposedStatus && <div className="inv-proposal"><span>Proposed move</span><strong>{selected.status} → {proposal.proposedStatus}</strong><p>{proposal.summary}</p><button type="button" onClick={applyProposedStatus} disabled={busy === 'status'}>{busy === 'status' ? 'Applying…' : 'Confirm status change'}</button></div>}
          <section className="inv-thread"><div className="inv-section-title"><span>Gmail thread</span><small>{threadLoading ? 'Loading…' : selected.threadId ? age(selected.lastBennettAt) : 'No thread'}</small></div>{thread.messages.length ? thread.messages.map((message) => <article className={message.direction} key={message.id}><div><strong>{message.from}</strong><time>{age(message.at)}</time></div><p>{message.body}</p></article>) : <p className="inv-empty-thread">No linked thread yet. A first invitation will start one.</p>}</section>
          <section className="inv-compose">
            <div className="inv-section-title"><span>{compose.kind === 'first' ? 'First invitation' : 'Thread action'}</span><small>{compose.style === 'short' ? 'Short' : 'Info-rich'}</small></div>
            <div className="inv-bubbles"><label><span>Event</span><select value={compose.event} onChange={(event) => updateCompose({ event: event.target.value, token2049: event.target.value !== 'London' })}><option>Asia</option><option>London</option><option>Both</option></select></label><label><span>Style</span><select value={compose.style} onChange={(event) => updateCompose({ style: event.target.value })}><option value="short">Short / casual</option><option value="long">Longer / info-rich</option></select></label></div>
            {compose.kind === 'first' ? <>
              <div className="inv-recipient"><span>Recipient</span><button type="button" className={compose.recipientType === 'direct' ? 'on' : ''} disabled={!selected.email} onClick={() => pickRecipient('direct')}>Speaker direct</button><button type="button" className={compose.recipientType === 'poc' ? 'on' : ''} disabled={!selected.poc?.email} onClick={() => pickRecipient('poc')}>Point of contact</button></div>
              <label className="inv-input"><span>CC</span><input value={compose.cc} onChange={(event) => updateCompose({ cc: event.target.value })} /></label>
              <div className="inv-toggles"><label><input type="checkbox" checked={compose.hotel} onChange={(event) => updateCompose({ hotel: event.target.checked })} /> Mention hotel room block</label><label><input type="checkbox" checked={compose.token2049} disabled={compose.event === 'London'} onChange={(event) => updateCompose({ token2049: event.target.checked })} /> Mention TOKEN2049 adjacency</label></div>
              <label className="inv-input"><span>Session idea <small>optional</small></span><input value={compose.sessionIdea} onChange={(event) => updateCompose({ sessionIdea: event.target.value })} placeholder="No slot or title is confirmed" /></label>
              <label className="inv-input"><span>Why them</span><textarea rows="3" value={compose.whyThem} onChange={(event) => updateCompose({ whyThem: event.target.value })} /></label>
            </> : <>
              <div className="inv-replies">{REPLY_ACTIONS.map(([value, label]) => <button type="button" className={compose.replyType === value ? 'on' : ''} onClick={() => updateCompose({ replyType: value })} key={value}>{label}</button>)}</div>
              {compose.replyType === 'custom' && <label className="inv-input"><span>Custom reply</span><textarea rows="5" value={compose.customBody} onChange={(event) => updateCompose({ customBody: event.target.value })} /></label>}
            </>}
            {!compose.to && <div className="inv-warning">Need email. Neither the selected recipient nor HubSpot enrichment returned an address.</div>}
            {selected.status === 'In' && <div className="inv-warning">This speaker is already In. v1 blocks another invitation.</div>}
            <button className="inv-preview-button" type="button" onClick={requestPreview} disabled={sendBlocked || busy === 'preview'}>{busy === 'preview' ? 'Building preview…' : 'Preview email'}</button>
            {preview && <div className="inv-preview"><div><span>To</span><strong>{preview.to}</strong></div><div><span>Subject</span><strong>{preview.subject}</strong></div><pre>{preview.body}</pre><small>BCC to HubSpot is applied automatically.</small></div>}
            <div className="inv-actions"><button type="button" onClick={() => perform('draft')} disabled={!preview || Boolean(busy)}>{busy === 'draft' ? 'Saving…' : 'Create Gmail draft'}</button><button type="button" className="send" onClick={() => perform('send')} disabled={!preview || Boolean(busy)}>{busy === 'send' ? 'Sending…' : 'Send now'}</button></div>
            {notice && <div className="inv-notice" role="status">{notice}</div>}
          </section>
        </aside>
      )}
    </section>
  );
}
