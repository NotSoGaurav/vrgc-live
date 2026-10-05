import fs from 'fs';
import path from 'path';
import { defaultCouncilMembers } from '../src/services/membersService';
import { generateMemberUUID } from '../src/utils/memberUuid';

const membersDir = path.resolve(__dirname, '../public/members');
let missing: string[] = [];

for (const member of defaultCouncilMembers) {
  const uuid = generateMemberUUID(member.id);
  if (!uuid) {
    console.warn(`Could not generate UUID for member ${member.id}`);
    continue;
  }
  const filePath = path.join(membersDir, `${uuid}.webp`);
  if (!fs.existsSync(filePath)) {
    missing.push(`${member.id} -> ${uuid}.webp`);
  }
}

if (missing.length === 0) {
  console.log('All default council member images are present.');
} else {
  console.error('Missing images for the following members:');
  for (const m of missing) {
    console.error(m);
  }
  process.exit(1);
}
