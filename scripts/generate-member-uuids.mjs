#!/usr/bin/env node
/**
 * Member UUID Generator & Image Matcher CLI
 * 
 * Format: ${registrationNumber}_${SECRET_SALT} -> UUIDv5 -> public/members/[uuid].webp
 * 
 * Usage:
 *   node scripts/generate-member-uuids.mjs
 *   node scripts/generate-member-uuids.mjs --salt="custom_salt"
 *   node scripts/generate-member-uuids.mjs --test="23BCE11158"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v5 as uuidv5 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const DEFAULT_NAMESPACE = uuidv5.DNS; // '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
const DEFAULT_SECRET_SALT =
  process.env.VITE_IMAGE_SECRET_SALT ||
  process.env.NEXT_PUBLIC_IMAGE_SECRET_SALT ||
  process.env.IMAGE_SECRET_SALT ||
  '';

function buildMemberIdentityString(regNo, salt = DEFAULT_SECRET_SALT) {
  const cleanReg = String(regNo || '').trim();
  return `${cleanReg}_${salt}`;
}

function generateMemberUUID(regNo, salt = DEFAULT_SECRET_SALT) {
  const identityString = buildMemberIdentityString(regNo, salt);
  const uuid = uuidv5(identityString, DEFAULT_NAMESPACE);
  return { identityString, uuid };
}

function scanMembersDirectory() {
  const possibleDirs = [
    path.join(rootDir, 'public', 'members'),
  ];

  const filesMap = new Map();

  for (const dir of possibleDirs) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.toLowerCase().endsWith('.webp')) {
          const uuid = file.replace(/\.webp$/i, '').toLowerCase();
          filesMap.set(uuid, {
            filename: file,
            fullPath: path.join(dir, file),
            dir,
          });
        }
      }
    }
  }

  return filesMap;
}

// CLI Execution
function main() {
  console.log('='.repeat(70));
  console.log(' VRGC Member UUID Generator & Image Matcher');
  console.log(' Format: ${registrationNumber}_${SECRET_SALT} -> UUIDv5.webp');
  console.log('='.repeat(70));

  const args = process.argv.slice(2);
  let customSalt = DEFAULT_SECRET_SALT;
  let testRegNo = null;

  for (const arg of args) {
    if (arg.startsWith('--salt=')) {
      customSalt = arg.replace('--salt=', '');
    } else if (arg.startsWith('--test=')) {
      testRegNo = arg.replace('--test=', '');
    }
  }

  console.log(`\nActive Secret Salt: "${customSalt ? '(configured)' : '(empty)'}"`);

  const existingFiles = scanMembersDirectory();
  console.log(`Discovered ${existingFiles.size} WebP member photos in public/members/\n`);

  if (testRegNo) {
    const { identityString, uuid } = generateMemberUUID(testRegNo, customSalt);
    const matched = existingFiles.has(uuid);
    console.log('Test Member Check:');
    console.log(`  Raw String   : ${identityString}`);
    console.log(`  UUID (v5)    : ${uuid}`);
    console.log(`  File Name    : ${uuid}.webp`);
    console.log(`  Matched File : ${matched ? '✓ FOUND' : '✗ NOT FOUND'}\n`);
    return;
  }

  // Sample check with representative council members
  const sampleMembers = [
    { regNo: '23BCE11158', name: 'Shivansh Sharma' },
    { regNo: '23BCG10015', name: 'Lokesh Sharma' },
    { regNo: '24BCG10003', name: 'Parardha Dhar' },
    { regNo: '24BCG10051', name: 'Haardik Pahlajani' },
  ];

  console.log('Sample Demonstrations:');
  sampleMembers.forEach((m) => {
    const { identityString, uuid } = generateMemberUUID(m.regNo, customSalt);
    const matched = existingFiles.has(uuid);
    console.log(`- ${m.name} (${m.regNo})`);
    console.log(`    Identity: "${identityString}"`);
    console.log(`    UUID    : ${uuid}`);
    console.log(`    Web Path: /members/${uuid}.webp [${matched ? 'EXISTS' : 'DEFAULT_LOGO'}]`);
  });

  console.log('\n' + '='.repeat(70));
  console.log('Member UUID generation ready for Studio page integration.');
  console.log('='.repeat(70));
}

// Export for programmatic usage as well
export {
  generateMemberUUID,
  buildMemberIdentityString,
  scanMembersDirectory,
};

if (process.argv[1] && (process.argv[1] === __filename || process.argv[1].endsWith('generate-member-uuids.mjs'))) {
  main();
}
