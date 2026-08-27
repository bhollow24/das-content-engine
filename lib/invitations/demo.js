export const demoInvitations = [
  { id: 'rec_demo_1', counterpartId: 'rec_demo_2', name: 'Maya Miller', title: 'Chief of Staff', company: 'FalconX', status: 'Target', event: 'Asia', email: 'maya@example.com', emailSource: 'Airtable', poc: null, linkedIn: 'https://www.linkedin.com', x: '', notes: 'Strong institutional market-structure perspective.', sessions: ['Institutional market structure'], sponsor: false, lastBennettAt: null, lastReplyAt: null, threadId: null },
  { id: 'rec_demo_2', counterpartId: 'rec_demo_1', name: 'Maya Miller', title: 'Chief of Staff', company: 'FalconX', status: 'Target', event: 'London', email: 'maya@example.com', emailSource: 'Airtable', poc: null, linkedIn: 'https://www.linkedin.com', x: '', notes: 'Strong institutional market-structure perspective.', sessions: ['Institutional market structure'], sponsor: false, lastBennettAt: null, lastReplyAt: null, threadId: null },
  { id: 'rec_demo_3', name: 'Jackie Smith', title: 'Head of Digital Assets', company: 'Visa', status: 'Invited', event: 'Asia', email: 'jackie@example.com', emailSource: 'HubSpot', poc: { name: 'Events team', email: 'events-contact@example.com' }, linkedIn: 'https://www.linkedin.com', x: '', notes: '[DAS_INVITE] thread=demo-thread-1; event=Asia; sent=2026-08-20T15:00:00.000Z; last_bennett=2026-08-20T15:00:00.000Z', sessions: ['Payments at internet scale'], sponsor: true, lastBennettAt: '2026-08-20T15:00:00.000Z', lastReplyAt: null, threadId: 'demo-thread-1' },
  { id: 'rec_demo_4', name: 'Simon Taylor', title: 'Head of Strategy', company: 'GFTN', status: 'In Touch', event: 'London', email: 'simon@example.com', emailSource: 'Airtable', poc: null, linkedIn: 'https://www.linkedin.com', x: 'https://x.com', notes: '[DAS_INVITE] thread=demo-thread-2; event=London; sent=2026-08-18T15:00:00.000Z; last_bennett=2026-08-24T15:00:00.000Z; last_reply=2026-08-25T09:30:00.000Z', sessions: ['Banking and tokenization'], sponsor: false, lastBennettAt: '2026-08-24T15:00:00.000Z', lastReplyAt: '2026-08-25T09:30:00.000Z', threadId: 'demo-thread-2', proposedStatus: 'Thinking', classification: 'Needs internal approval and asked for a week.' },
  { id: 'rec_demo_5', name: 'Andrea Wong', title: 'Global Head of Communications', company: 'DBS', status: 'Thinking', event: 'Asia', email: '', emailSource: null, poc: { name: 'GEM team', email: 'gem@example.com' }, linkedIn: 'https://www.linkedin.com', x: '', notes: 'Direct email unavailable; POC route is ready.', sessions: [], sponsor: false, lastBennettAt: null, lastReplyAt: null, threadId: null },
  { id: 'rec_demo_6', name: 'Alex Morgan', title: 'Managing Director, Digital Assets', company: 'BNY', status: 'Soft In', event: 'London', email: 'alex@example.com', emailSource: 'Airtable', poc: null, linkedIn: 'https://www.linkedin.com', x: '', notes: '[DAS_INVITE] thread=demo-thread-3; event=London; sent=2026-08-12T15:00:00.000Z; last_bennett=2026-08-12T15:00:00.000Z; last_reply=2026-08-19T11:00:00.000Z', sessions: ['Institutional custody'], sponsor: true, lastBennettAt: '2026-08-12T15:00:00.000Z', lastReplyAt: '2026-08-19T11:00:00.000Z', threadId: 'demo-thread-3', proposedStatus: 'Soft In', classification: 'Positive reply; timing and session remain open.' },
];

export const demoThreads = {
  'demo-thread-1': [
    { id: 'm1', from: 'Bennett Holloway', direction: 'outbound', at: '2026-08-20T15:00:00.000Z', body: 'I would love to invite you to join us at DAS Asia 2026.' },
  ],
  'demo-thread-2': [
    { id: 'm2', from: 'Bennett Holloway', direction: 'outbound', at: '2026-08-24T15:00:00.000Z', body: 'Wanted to bump this invitation for DAS London.' },
    { id: 'm3', from: 'Simon Taylor', direction: 'inbound', at: '2026-08-25T09:30:00.000Z', body: 'Interested, but I need to check internally. Can I come back to you next week?' },
  ],
  'demo-thread-3': [
    { id: 'm4', from: 'Alex Morgan', direction: 'inbound', at: '2026-08-19T11:00:00.000Z', body: 'This looks promising. Please send over the session direction and timing.' },
  ],
};
