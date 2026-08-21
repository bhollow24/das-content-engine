import { auth } from '@clerk/nextjs/server';
import Dashboard from '../components/Dashboard';
import data from '../lib/data.json';
import d1 from '../lib/nyc-sessions-d1.json';
import d2 from '../lib/nyc-sessions-d2.json';
import d3 from '../lib/nyc-sessions-d3.json';
import meta from '../lib/nyc-sessions-meta.json';

export const dynamic = 'force-dynamic';

const nyc = {
  ...meta,
  sessions: [...d1.sessions, ...d2.sessions, ...d3.sessions],
};

export default async function HomePage() {
  await auth.protect();
  return <Dashboard data={data} nyc={nyc} />;
}
