import { auth } from '@clerk/nextjs/server';
import Dashboard from '../components/Dashboard';
import data from '../lib/data.json';
import d1 from '../lib/nyc-sessions-d1.json';
import d2 from '../lib/nyc-sessions-d2.json';
import d3 from '../lib/nyc-sessions-d3.json';
import meta from '../lib/nyc-sessions-meta.json';
import clipsD1 from '../lib/nyc-clips-d1.json';

export const dynamic = 'force-dynamic';

function attachSocialClips(sessions, clips) {
  const byTitle = new Map();
  for (const clip of clips) {
    const key = clip.sessionTitle;
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push(clip);
  }
  return sessions.map((session) => {
    const social = byTitle.get(session.title);
    return social?.length ? { ...session, social_clips: social } : session;
  });
}

const nyc = {
  ...meta,
  sessions: attachSocialClips([...d1.sessions, ...d2.sessions, ...d3.sessions], clipsD1.clips),
  clipsDay1: clipsD1,
};

export default async function HomePage() {
  await auth.protect();
  return <Dashboard data={data} nyc={nyc} />;
}
