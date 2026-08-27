import { AIRTABLE, DEFAULT_CC, EVENTS, HUBSPOT_BCC, STATUSES } from './config';
import { demoInvitations, demoThreads } from './demo';

function text(value) {
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(', ');
  if (value && typeof value === 'object') return value.name || value.email || JSON.stringify(value);
  return value == null ? '' : String(value);
}

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function field(record, id) {
  return record?.fields?.[id];
}

function escapeHtml(value = '') {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);
}

function stripHtml(value = '') {
  return value.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function safeHeader(value = '') {
  return String(value).replace(/[\r\n]+/g, ' ').trim();
}

function decodeBase64(value = '') {
  try { return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'); } catch { return ''; }
}

function header(headers, name) {
  return headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase())?.value || '';
}

function parseTracking(notes = '') {
  const line = notes.split('\n').reverse().find((value) => value.startsWith('[DAS_INVITE]')) || '';
  const value = (key) => line.match(new RegExp(`${key}=([^;]+)`))?.[1]?.trim() || null;
  return { threadId: value('thread'), lastBennettAt: value('last_bennett'), lastReplyAt: value('last_reply') };
}

function trackingStamp({ threadId, event, sentAt, lastBennettAt, lastReplyAt }) {
  const values = [`thread=${threadId}`, `event=${event}`, `sent=${sentAt}`, `last_bennett=${lastBennettAt}`];
  if (lastReplyAt) values.push(`last_reply=${lastReplyAt}`);
  return `[DAS_INVITE] ${values.join('; ')}`;
}

async function airtableRequest(tableId, { method = 'GET', path = '', body, params } = {}) {
  const url = new URL(`https://api.airtable.com/v0/${AIRTABLE.baseId}/${tableId}${path}`);
  url.searchParams.set('returnFieldsByFieldId', 'true');
  for (const [key, value] of Object.entries(params || {})) url.searchParams.append(key, value);
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Airtable ${response.status}: ${await response.text()}`);
  return response.json();
}

async function listAirtable(tableId) {
  let offset;
  const records = [];
  do {
    const result = await airtableRequest(tableId, { params: offset ? { offset } : undefined });
    records.push(...(result.records || []));
    offset = result.offset;
  } while (offset);
  return records;
}

async function hubSpotEmail(name, company) {
  if (!process.env.HUBSPOT_ACCESS_TOKEN || !name) return null;
  const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: name, limit: 10, properties: ['email', 'firstname', 'lastname', 'company', 'jobtitle'] }),
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const results = (await response.json()).results || [];
  const companyNeedle = company.toLowerCase();
  const match = results.find((item) => !companyNeedle || (item.properties?.company || '').toLowerCase().includes(companyNeedle)) || results[0];
  return match?.properties?.email ? { email: match.properties.email, source: 'HubSpot' } : null;
}

let googleTokenCache = null;

async function gmailAccessToken() {
  if (googleTokenCache?.expiresAt > Date.now() + 60000) return googleTokenCache.token;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, refresh_token: process.env.GOOGLE_REFRESH_TOKEN, grant_type: 'refresh_token' }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Google OAuth ${response.status}`);
  const value = await response.json();
  googleTokenCache = { token: value.access_token, expiresAt: Date.now() + ((value.expires_in || 3600) * 1000) };
  return value.access_token;
}

async function gmailRequest(path, { method = 'GET', body } = {}) {
  const token = await gmailAccessToken();
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Gmail ${response.status}: ${await response.text()}`);
  return response.json();
}

async function gmailSignature() {
  try {
    const result = await gmailRequest(`settings/sendAs/${encodeURIComponent(process.env.GMAIL_FROM || 'bennett@blockworks.co')}`);
    return result.signature || '';
  } catch { return ''; }
}

function messageBody(payload) {
  if (payload.body?.data) return decodeBase64(payload.body.data);
  for (const part of payload.parts || []) {
    if (part.mimeType === 'text/plain' && part.body?.data) return decodeBase64(part.body.data);
  }
  for (const part of payload.parts || []) {
    if (part.mimeType === 'text/html' && part.body?.data) return stripHtml(decodeBase64(part.body.data));
  }
  return '';
}

export function classifyReply(body = '') {
  const source = body.toLowerCase();
  if (/out of office|automatic reply|away from the office/.test(source)) return { label: 'Out of office', proposedStatus: null, summary: 'Automatic out-of-office reply; no status change.' };
  if (/undeliverable|delivery status notification|address not found|mailbox.*full/.test(source)) return { label: 'Bounce', proposedStatus: null, summary: 'Delivery issue detected; a new email is needed.' };
  if (/not interested|won't be able|cannot participate|can't participate|have to decline/.test(source)) return { label: 'No', proposedStatus: 'No', summary: 'Declined the invitation.' };
  if (/someone else|colleague|alternate|instead/.test(source) && /speak|speaker|participate/.test(source)) return { label: 'Alternate offered', proposedStatus: 'Unlikely but Revisit', summary: 'Declined or redirected, with another spokesperson in play.' };
  if (/need to check|check internally|circle back|come back to you|approval/.test(source)) return { label: 'Thinking', proposedStatus: 'Thinking', summary: 'Interested but needs internal confirmation.' };
  if (/handler|assistant|on behalf|coordinate|scheduling/.test(source)) return { label: 'In touch', proposedStatus: 'In Touch', summary: 'A handler is engaged in the invitation.' };
  if (/yes|happy to|would love to|count me in|confirm/.test(source)) return { label: 'Yes', proposedStatus: 'In', summary: 'Positive confirmation detected.' };
  if (/interested|looks promising|schedule.*tbd|timing/.test(source)) return { label: 'Soft yes', proposedStatus: 'Soft In', summary: 'Positive signal, with timing or details still open.' };
  return { label: 'Needs review', proposedStatus: null, summary: 'Reply needs a human read before changing status.' };
}

export async function getInvitationBoard({ demo = false } = {}) {
  if (demo) return { records: demoInvitations, counts: Object.fromEntries(STATUSES.map((status) => [status, demoInvitations.filter((row) => row.status === status).length])) };
  const [hits, inventory, sponsors] = await Promise.all([
    listAirtable(AIRTABLE.tables.hitList),
    listAirtable(AIRTABLE.tables.inventory),
    listAirtable(AIRTABLE.tables.sponsors).catch(() => []),
  ]);
  const people = new Map(inventory.map((record) => [record.id, record]));
  const sponsorNames = new Set(sponsors.flatMap((record) => Object.values(record.fields || {}).map(text)).join(' | ').toLowerCase().split(' | '));
  const baseRows = hits.filter((record) => {
    const event = text(field(record, AIRTABLE.fields.event));
    const group = text(field(record, AIRTABLE.fields.group)).toUpperCase();
    return ['Asia', 'London'].includes(event) && group !== 'STAFF';
  });
  const keys = new Map();
  for (const record of baseRows) {
    const key = `${text(field(record, AIRTABLE.fields.speaker)).toLowerCase()}::${text(field(record, AIRTABLE.fields.company)).toLowerCase()}`;
    if (!keys.has(key)) keys.set(key, []);
    keys.get(key).push(record);
  }
  const records = await Promise.all(baseRows.map(async (record) => {
    const personId = first(field(record, AIRTABLE.fields.person));
    const person = people.get(personId);
    const name = text(field(record, AIRTABLE.fields.speaker)) || text(field(person, AIRTABLE.fields.fullName));
    const company = text(field(record, AIRTABLE.fields.company));
    const inventoryEmail = text(field(person, AIRTABLE.fields.email));
    const enriched = inventoryEmail ? { email: inventoryEmail, source: 'Airtable' } : await hubSpotEmail(name, company);
    const pocEmails = AIRTABLE.fields.pocEmails.map((id) => text(field(person, id))).filter(Boolean);
    const notes = text(field(record, AIRTABLE.fields.notes));
    const tracking = parseTracking(notes);
    const key = `${name.toLowerCase()}::${company.toLowerCase()}`;
    const counterpart = (keys.get(key) || []).find((item) => item.id !== record.id);
    return {
      id: record.id,
      counterpartId: counterpart?.id || null,
      name,
      title: text(field(record, AIRTABLE.fields.jobTitle)),
      company,
      status: text(field(record, AIRTABLE.fields.status)) || 'Wait',
      event: text(field(record, AIRTABLE.fields.event)),
      email: enriched?.email || '',
      emailSource: enriched?.source || null,
      poc: pocEmails[0] ? { name: text(field(person, AIRTABLE.fields.pocName)) || 'Point of contact', email: pocEmails[0], alternates: pocEmails.slice(1) } : null,
      linkedIn: text(field(person, AIRTABLE.fields.linkedIn)),
      x: text(field(person, AIRTABLE.fields.x)),
      notes,
      sessions: field(record, AIRTABLE.fields.sessions) || [],
      sponsor: sponsorNames.has(company.toLowerCase()),
      ...tracking,
    };
  }));
  const hydrated = await hydrateThreadSummaries(records);
  return { records: hydrated, counts: Object.fromEntries(STATUSES.map((status) => [status, hydrated.filter((row) => row.status === status).length])) };
}

async function hydrateThreadSummaries(records) {
  const output = [...records];
  const tracked = output.map((record, index) => ({ record, index })).filter(({ record }) => record.threadId);
  for (let start = 0; start < tracked.length; start += 8) {
    const chunk = tracked.slice(start, start + 8);
    const results = await Promise.all(chunk.map(async ({ record, index }) => {
      try {
        const thread = await gmailRequest(`threads/${record.threadId}?format=metadata&metadataHeaders=From&metadataHeaders=Date`);
        let lastBennettAt = record.lastBennettAt;
        let lastReplyAt = record.lastReplyAt;
        let latestInbound = null;
        for (const message of thread.messages || []) {
          const from = header(message.payload?.headers, 'From').toLowerCase();
          const rawDate = header(message.payload?.headers, 'Date');
          const at = rawDate ? new Date(rawDate).toISOString() : null;
          if (!at) continue;
          if (from.includes((process.env.GMAIL_FROM || 'bennett@blockworks.co').toLowerCase())) {
            if (!lastBennettAt || at > lastBennettAt) lastBennettAt = at;
          } else if (!lastReplyAt || at > lastReplyAt) {
            lastReplyAt = at;
            latestInbound = message.snippet || '';
          }
        }
        const classification = latestInbound ? classifyReply(latestInbound) : null;
        return { index, patch: { lastBennettAt, lastReplyAt, proposedStatus: classification?.proposedStatus || null, classification: classification?.summary || null } };
      } catch { return null; }
    }));
    for (const result of results.filter(Boolean)) output[result.index] = { ...output[result.index], ...result.patch };
  }
  return output;
}

export async function validateHitRows(ids, { firstInvite = false } = {}) {
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 2) throw new Error('Expected one or two existing Hit List rows.');
  const records = await Promise.all(ids.map((id) => airtableRequest(AIRTABLE.tables.hitList, { path: `/${id}` })));
  for (const record of records) {
    const event = text(field(record, AIRTABLE.fields.event));
    const group = text(field(record, AIRTABLE.fields.group)).toUpperCase();
    const status = text(field(record, AIRTABLE.fields.status));
    if (!['Asia', 'London'].includes(event)) throw new Error('Only Asia and London rows are allowed in v1.');
    if (group === 'STAFF') throw new Error('STAFF rows cannot receive invitations.');
    if (firstInvite && status === 'In') throw new Error('This speaker is already In. v1 blocks another invitation.');
  }
  return records;
}

export function buildInvitationPreview(input) {
  const firstName = (input.recipientName || input.name || '').split(/\s+/)[0] || 'there';
  const selected = input.event === 'Both' ? ['Asia', 'London'] : [input.event];
  const principal = input.name;
  const direct = input.recipientType !== 'poc';
  let subject = 'Speaking Invitation - Blockworks DAS 2026';
  let lines = [`${firstName},`, ''];
  if (input.style === 'long') {
    const event = EVENTS[selected[0]];
    subject = `Speaking Invitation – Crypto's premier institutional event in ${selected[0] === 'Asia' ? 'Asia' : 'the UK'}`;
    lines.push(`I'd like to invite you to speak at Blockworks' Digital Asset Summit, crypto's premier institutional event, taking place in ${event.venue} on ${event.date}.`, '');
    if (input.whyThem) lines.push(input.whyThem, '');
    if (input.sessionIdea) lines.push(`One direction we would be interested in exploring is ${input.sessionIdea}.`, '');
    lines.push('The audience includes institutional allocators, asset managers, CIOs, family offices, regulators, and senior crypto executives.', '', 'Happy to answer any questions.', '', 'Thanks,', 'Bennett');
  } else if (!direct) {
    lines.push('Hope you are well!', '', "I'm reaching back out to flag Blockworks' next two DAS events in H2.", '');
    if (selected.includes('Asia')) lines.push('DAS Asia - Oct 7th at Marina Bay Sands Singapore');
    if (selected.includes('London')) lines.push('DAS London - Nov 10-11th at Hilton Park Lane in London');
    lines.push('', `Would love to have ${principal.split(/\s+/)[0]} speak if either works.`, '', 'Let us know!', '', 'Thanks,', 'Bennett');
  } else {
    lines.push('Hope you are well!', '', `We're gearing up for ${selected.length === 2 ? 'our next two DAS events' : EVENTS[selected[0]].label} and would love to have you speak if you're available${selected.length === 2 ? ' at either' : ''}:`, '');
    if (selected.includes('Asia')) lines.push('   - DAS Asia: October 7th in Singapore alongside TOKEN2049');
    if (selected.includes('London')) lines.push('   - DAS London: November 10th - 11th at Hilton Park Lane');
    if (input.sessionIdea) lines.push('', `One possible direction: ${input.sessionIdea}.`);
    if (input.whyThem) lines.push('', input.whyThem);
    if (input.hotel) lines.push('', 'Also, glad to add you to our hotel room block at either location at no cost as a thank you to your support of our mission.');
    if (input.token2049 && selected.includes('Asia') && !lines.some((line) => line.includes('TOKEN2049'))) lines.push('', 'DAS Asia takes place during TOKEN2049 week.');
    lines.push('', 'Let us know!', '', 'Thanks,', 'Bennett');
  }
  return { subject, body: lines.join('\n'), to: input.to, cc: input.cc ?? DEFAULT_CC, bcc: HUBSPOT_BCC };
}

export function buildReplyPreview(input) {
  const firstName = (input.recipientName || input.name || '').split(/\s+/)[0] || 'there';
  const event = EVENTS[input.event] || EVENTS.London;
  const firm = input.company || 'your firm';
  const bodies = {
    bump_short: `${firstName},\n\nHope you are well! Wanted to bump the above invite!\n\nThanks,\nBennett`,
    bump_dates: `${firstName},\n\nHope you are well. Let me know if ${input.event === 'Asia' ? 'October 7th' : 'November 10th or 11th'} works with your schedule. We would love to have you speak at ${event.label}.\n\nThanks,\nBennett`,
    yes: `${firstName},\n\nSounds great, thank you! We'll follow up with next steps.\n\nThanks,\nBennett`,
    soft_in: `${firstName},\n\nSounds great. I'll keep an ear out.\n\nThanks,\nBennett`,
    alternate: `${firstName},\n\nNo problem, thank you for letting me know! Would there be another spokesperson from ${firm} that would be able to attend and speak?\n\nThanks,\nBennett`,
    custom: input.customBody || '',
  };
  return { subject: input.subject || `Re: Speaking Invitation - Blockworks DAS 2026`, body: bodies[input.replyType] || bodies.custom, to: input.to, cc: input.cc || '', bcc: HUBSPOT_BCC };
}

function encodeMessage({ to, cc, bcc, subject, body, signature, replyHeaders }) {
  const htmlBody = `${escapeHtml(body).replace(/\n/g, '<br>')}${signature ? `<br><br>${signature}` : ''}`;
  const lines = [`From: Bennett Holloway <${safeHeader(process.env.GMAIL_FROM || 'bennett@blockworks.co')}>`, `To: ${safeHeader(to)}`];
  if (cc) lines.push(`Cc: ${safeHeader(cc)}`);
  lines.push(`Bcc: ${safeHeader(bcc)}`, `Subject: ${safeHeader(subject)}`, 'MIME-Version: 1.0', 'Content-Type: text/html; charset=UTF-8');
  if (replyHeaders?.messageId) lines.push(`In-Reply-To: ${safeHeader(replyHeaders.messageId)}`, `References: ${safeHeader(replyHeaders.references || replyHeaders.messageId)}`);
  lines.push('', htmlBody);
  return Buffer.from(lines.join('\r\n')).toString('base64url');
}

async function patchHitList(ids, status, notes) {
  const records = ids.map((id) => ({ id, fields: { ...(status ? { [AIRTABLE.fields.status]: status } : {}), ...(notes !== undefined ? { [AIRTABLE.fields.notes]: notes } : {}) } }));
  return airtableRequest(AIRTABLE.tables.hitList, { method: 'PATCH', body: { records, typecast: false } });
}

export async function sendOrDraft({ mode, input, selectedRecords, existingThreadId, previousNotes = '' }) {
  const preview = input.kind === 'first' ? buildInvitationPreview(input) : buildReplyPreview(input);
  let replyHeaders;
  if (existingThreadId) {
    const thread = await gmailRequest(`threads/${existingThreadId}?format=metadata&metadataHeaders=Message-ID&metadataHeaders=References`);
    const latest = thread.messages?.at(-1);
    replyHeaders = { messageId: header(latest?.payload?.headers, 'Message-ID'), references: header(latest?.payload?.headers, 'References') };
  }
  const signature = input.kind === 'first' ? await gmailSignature() : '';
  const raw = encodeMessage({ ...preview, signature, replyHeaders });
  const payload = { message: { raw, ...(existingThreadId ? { threadId: existingThreadId } : {}) } };
  const result = mode === 'draft' ? await gmailRequest('drafts', { method: 'POST', body: payload }) : await gmailRequest('messages/send', { method: 'POST', body: payload.message });
  const threadId = result.message?.threadId || result.threadId || existingThreadId;
  if (mode === 'send') {
    const now = new Date().toISOString();
    const isBump = input.kind !== 'first' && input.replyType?.startsWith('bump');
    const noteLines = [previousNotes].filter(Boolean);
    if (isBump) noteLines.push(`Bumped ${now.slice(0, 10)}`);
    noteLines.push(trackingStamp({ threadId, event: input.event, sentAt: now, lastBennettAt: now }));
    await patchHitList(selectedRecords, input.kind === 'first' ? 'Invited' : null, noteLines.join('\n'));
  }
  return { mode, threadId, preview };
}

export async function getThread(threadId, demo = false) {
  if (!threadId) return { messages: [], classification: null };
  if (demo) {
    const messages = demoThreads[threadId] || [];
    const inbound = [...messages].reverse().find((message) => message.direction === 'inbound');
    return { messages, classification: inbound ? classifyReply(inbound.body) : null, replyTo: null, subject: 'Re: Speaking Invitation - Blockworks DAS 2026' };
  }
  const result = await gmailRequest(`threads/${threadId}?format=full`);
  const messages = (result.messages || []).map((message) => {
    const from = header(message.payload?.headers, 'From');
    const to = header(message.payload?.headers, 'To');
    const subject = header(message.payload?.headers, 'Subject');
    const date = header(message.payload?.headers, 'Date');
    return { id: message.id, from, to, subject, direction: from.toLowerCase().includes((process.env.GMAIL_FROM || 'bennett@blockworks.co').toLowerCase()) ? 'outbound' : 'inbound', at: date ? new Date(date).toISOString() : null, body: messageBody(message.payload) };
  });
  const inbound = [...messages].reverse().find((message) => message.direction === 'inbound');
  const firstMessage = messages[0];
  const address = (inbound?.from || firstMessage?.to || '').match(/<([^>]+)>/)?.[1] || (inbound?.from || firstMessage?.to || '').split(',')[0].trim();
  return { messages, classification: inbound ? classifyReply(inbound.body) : null, replyTo: address, subject: firstMessage?.subject ? `Re: ${firstMessage.subject.replace(/^Re:\s*/i, '')}` : 'Re: Speaking Invitation - Blockworks DAS 2026' };
}

export async function confirmStatus(ids, status) {
  if (!STATUSES.includes(status)) throw new Error('Invalid status');
  return patchHitList(ids, status);
}
