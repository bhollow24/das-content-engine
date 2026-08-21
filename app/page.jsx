import { auth } from '@clerk/nextjs/server';
import Dashboard from '../components/Dashboard';
import data from '../lib/data.json';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  await auth.protect();
  return <Dashboard data={data} />;
}
