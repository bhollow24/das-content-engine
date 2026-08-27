import { auth, currentUser } from '@clerk/nextjs/server';
import { allowedInvitationEmail, invitationMode } from '../../../lib/invitations/config';
import { buildInvitationPreview, buildReplyPreview, confirmStatus, getInvitationBoard, getThread, sendOrDraft, validateHitRows } from '../../../lib/invitations/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function authorize() {
  const { userId } = await auth();
  if (!userId) return { error: Response.json({ error: 'Sign in required.' }, { status: 401 }) };
  const user = await currentUser();
  const email = user?.emailAddresses?.find((item) => item.id === user.primaryEmailAddressId)?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || '';
  if (!allowedInvitationEmail(email)) return { error: Response.json({ error: 'Invitations access is limited to Bennett and Carolyn.' }, { status: 403 }) };
  return { email };
}

function errorResponse(error) {
  console.error('[invitations]', error);
  return Response.json({ error: error instanceof Error ? error.message : 'Invitation action failed.' }, { status: 500 });
}

export async function GET(request) {
  const access = await authorize();
  if (access.error) return access.error;
  const mode = invitationMode();
  try {
    const url = new URL(request.url);
    const threadId = url.searchParams.get('thread');
    if (threadId) return Response.json(await getThread(threadId, mode.demo));
    const board = await getInvitationBoard(mode);
    return Response.json({ ...board, integration: { demo: mode.demo, missing: mode.missing, hubspot: Boolean(process.env.HUBSPOT_ACCESS_TOKEN), viewer: access.email } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request) {
  const access = await authorize();
  if (access.error) return access.error;
  const mode = invitationMode();
  try {
    const body = await request.json();
    if (body.action === 'preview') {
      const preview = body.input?.kind === 'first' ? buildInvitationPreview(body.input) : buildReplyPreview(body.input);
      return Response.json({ preview });
    }
    if (body.action === 'confirm-status') {
      if (!Array.isArray(body.recordIds) || !body.recordIds.length) return Response.json({ error: 'No Airtable rows selected.' }, { status: 400 });
      if (mode.demo) return Response.json({ demo: true, status: body.status, recordIds: body.recordIds });
      await validateHitRows(body.recordIds);
      await confirmStatus(body.recordIds, body.status);
      return Response.json({ status: body.status, recordIds: body.recordIds });
    }
    if (body.action === 'draft' || body.action === 'send') {
      const input = body.input || {};
      if (!input.to) return Response.json({ error: 'Need email before drafting or sending.' }, { status: 400 });
      if (!body.previewConfirmed) return Response.json({ error: 'Preview the message before drafting or sending.' }, { status: 400 });
      const ids = Array.isArray(body.recordIds) ? body.recordIds.filter(Boolean) : [];
      if (!ids.length) return Response.json({ error: 'No Airtable row selected.' }, { status: 400 });
      const warning = input.event === 'Both' && ids.length < 2 ? 'No matching row exists for the second event. The app did not create one.' : null;
      if (mode.demo) return Response.json({ demo: true, mode: body.action, preview: input.kind === 'first' ? buildInvitationPreview(input) : buildReplyPreview(input), warning });
      await validateHitRows(ids, { firstInvite: input.kind === 'first' });
      const result = await sendOrDraft({ mode: body.action, input, selectedRecords: ids, existingThreadId: body.threadId || null, previousNotes: body.previousNotes || '' });
      return Response.json({ ...result, warning });
    }
    return Response.json({ error: 'Unknown invitation action.' }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
