export const EVENTS = {
  Asia: {
    label: 'DAS Asia 2026',
    date: 'October 7, 2026',
    venue: 'Marina Bay Sands, Singapore',
    context: 'during TOKEN2049 week',
  },
  London: {
    label: 'DAS London 2026',
    date: 'November 10–11, 2026',
    venue: 'Hilton Park Lane, London',
    context: '',
  },
};

export const STATUSES = [
  'Wait',
  'Target',
  'Invited',
  'In Touch',
  'Thinking',
  'Soft In',
  'In',
  'Unlikely but Revisit',
  'No',
  'Cancelled',
];

export const AIRTABLE = {
  baseId: 'appOpxmwYetaGl9mt',
  tables: {
    hitList: 'tbls0VIPjfeEK6roO',
    inventory: 'tblzjaAizecEF436y',
    companies: 'tblwfEYTzsMFxBaMh',
    agenda: 'tblmhKLTUZxYaOLs0',
    sponsors: 'tblppqbEGvm9JqIp6',
  },
  fields: {
    speaker: 'fld13oEeooh4MG4sA',
    person: 'fldqf6uzvFlTczJDQ',
    company: 'fldKb3QfF1mx0Cx1r',
    jobTitle: 'fldxpBQFau0MXZoZJ',
    status: 'fldLO0W5KhQ3K6JTX',
    event: 'fldYILSTD06ALLKDW',
    notes: 'fldDmWdaruZdmGWIJ',
    sessions: 'fldOcP14cQukgTnmU',
    group: 'fldjgq1GvRvlB9ubk',
    fullName: 'fldfeZknWLQXPNgTg',
    email: 'fldU713qHrzPjYO1v',
    pocName: 'fldXgw6YXBTe6o5rF',
    pocEmails: ['fldbKQMJzyVEfFQlw', 'fld6D2CN5MKuPZIku', 'fldtUfsvr3k2tB81r'],
    x: 'fldsKbtJDDSiCPVLU',
    linkedIn: 'fldFjYefxxZzaHTKv',
  },
};

export const HUBSPOT_BCC = '4605099@bcc.hubspot.com';
export const DEFAULT_CC = 'events@blockworks.com';

export function invitationMode() {
  const required = ['AIRTABLE_ACCESS_TOKEN', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'];
  const missing = required.filter((key) => !process.env[key]);
  return { demo: missing.length > 0, missing };
}

export function allowedInvitationEmail(email = '') {
  const configured = process.env.INVITATIONS_ALLOWED_EMAILS || 'bennett@blockworks.co,carolyn.wyatt@blockworks.co';
  const allowed = configured.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
