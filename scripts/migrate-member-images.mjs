#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v5 as uuidv5 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const DEFAULT_NAMESPACE = uuidv5.DNS; // '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
const SECRET_SALT =
  process.env.VITE_IMAGE_SECRET_SALT ||
  process.env.NEXT_PUBLIC_IMAGE_SECRET_SALT ||
  process.env.IMAGE_SECRET_SALT ||
  '';

const supabaseUrl = 'https://fopyejijjeoumimsdgiz.supabase.co';
const supabaseKey = 'sb_publishable_LLK3ErUfDW0WLouv0rQORQ_94Ep8UZ-';
const supabase = createClient(supabaseUrl, supabaseKey);

function sanitizeField(value) {
  if (!value) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function parseNameAndSurname(nameString) {
  let firstName = '';
  let surname = '';
  if (nameString) {
    const parts = String(nameString).trim().split(/\s+/);
    if (parts.length === 1) {
      firstName = parts[0];
      surname = '';
    } else {
      firstName = parts[0];
      surname = parts.slice(1).join('_');
    }
  }
  return {
    name: sanitizeField(firstName),
    surname: sanitizeField(surname),
  };
}

// Old scheme: regn_name_surname_salt
function oldUUID(regNo, name, surname, salt = '') {
  const cleanReg = sanitizeField(regNo);
  const parsed = parseNameAndSurname(name);
  const cleanSurname = surname ? sanitizeField(surname) : parsed.surname;
  const cleanSalt = sanitizeField(salt);
  const identity = `${cleanReg}_${parsed.name}_${cleanSurname}_${cleanSalt}`;
  return uuidv5(identity, DEFAULT_NAMESPACE);
}

// New scheme: STRICTLY registrationNumber_salt
function newUUID(regNo, salt = SECRET_SALT) {
  const cleanReg = String(regNo || '').trim();
  const identity = `${cleanReg}_${salt}`;
  return uuidv5(identity, DEFAULT_NAMESPACE);
}

async function migrate() {
  console.log('='.repeat(70));
  console.log(' MIGRATING MEMBER IMAGES TO REGISTRATION_NUMBER_SALT UUIDv5 SCHEME');
  console.log(` Active Salt: "${SECRET_SALT}"`);
  console.log('='.repeat(70));

  const membersDir = path.join(rootDir, 'public', 'members');
  if (!fs.existsSync(membersDir)) {
    fs.mkdirSync(membersDir, { recursive: true });
  }

  // Read existing files in directory
  const existingFiles = fs.readdirSync(membersDir);
  console.log(`Found ${existingFiles.length} existing files in public/members/`);

  // Fetch all id_cards
  const { data: cards, error } = await supabase.from('id_cards').select('*');
  if (error || !cards) {
    console.error('Error fetching cards:', error);
    return;
  }

  console.log(`Fetched ${cards.length} member cards from database`);

  // Also fetch storage files
  const { data: storageFiles } = await supabase.storage.from('id-cards').list('id-photos', { limit: 200 });
  const validStorageFiles = (storageFiles || []).filter(f => f.name && f.name !== '.emptyFolderPlaceholder');
  console.log(`Found ${validStorageFiles.length} files in Supabase storage`);

  let migratedCount = 0;
  const mappingReport = [];

  for (const card of cards) {
    const regNo = card.registrationNumber || card.id || '';
    if (!regNo) continue;

    const targetUuid = newUUID(regNo, SECRET_SALT);
    const targetFile = path.join(membersDir, `${targetUuid}.webp`);

    // Check if target file already exists
    if (fs.existsSync(targetFile)) {
      migratedCount++;
      mappingReport.push({ regNo, name: card.name, uuid: targetUuid, status: 'ALREADY_EXISTS' });
      continue;
    }

    // Try finding existing file via old UUID
    const oldId = oldUUID(regNo, card.name, undefined, process.env.IMAGE_SECRET_SALT || '');
    const oldFile = path.join(membersDir, `${oldId}.webp`);

    if (fs.existsSync(oldFile)) {
      const data = fs.readFileSync(oldFile);
      fs.writeFileSync(targetFile, data);
      migratedCount++;
      mappingReport.push({ regNo, name: card.name, uuid: targetUuid, status: 'COPIED_FROM_OLD_UUID' });
      console.log(`✓ [${migratedCount}] Copied ${card.name} (${regNo}) -> ${targetUuid}.webp`);
      continue;
    }

    // Try finding via Supabase storage
    const cleanReg = sanitizeField(regNo);
    const cleanName = sanitizeField(card.name);

    let matchFile = validStorageFiles.find(f => {
      const cleanF = sanitizeField(f.name);
      return cleanReg && cleanF.includes(cleanReg);
    });

    if (!matchFile && cleanName) {
      matchFile = validStorageFiles.find(f => {
        const cleanF = sanitizeField(f.name);
        return cleanF.includes(cleanName);
      });
    }

    if (matchFile) {
      const { data: blob, error: dlError } = await supabase.storage.from('id-cards').download(`id-photos/${matchFile.name}`);
      if (!dlError && blob) {
        const buffer = Buffer.from(await blob.arrayBuffer());
        fs.writeFileSync(targetFile, buffer);
        migratedCount++;
        mappingReport.push({ regNo, name: card.name, uuid: targetUuid, status: 'DOWNLOADED_FROM_STORAGE' });
        console.log(`✓ [${migratedCount}] Downloaded ${card.name} (${regNo}) -> ${targetUuid}.webp`);
        continue;
      }
    }

    // Try downloading via photoUrl
    if (card.photoUrl) {
      try {
        const res = await fetch(encodeURI(card.photoUrl));
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          fs.writeFileSync(targetFile, buffer);
          migratedCount++;
          mappingReport.push({ regNo, name: card.name, uuid: targetUuid, status: 'DOWNLOADED_FROM_URL' });
          console.log(`✓ [${migratedCount}] Fetched ${card.name} (${regNo}) -> ${targetUuid}.webp`);
          continue;
        }
      } catch (err) {
        console.warn(`Could not fetch photo for ${card.name}:`, err.message);
      }
    }

    mappingReport.push({ regNo, name: card.name, uuid: targetUuid, status: 'MISSING' });
  }

  console.log('\n' + '='.repeat(70));
  console.log(`MIGRATION COMPLETE: ${migratedCount}/${cards.length} members have valid WebP photos!`);
  console.log('='.repeat(70));

  // Verify representative members
  const testCases = [
    '23BCE11158',
    '23BCG10015',
    '24BCG10003',
    '24BCG10051',
  ];

  console.log('\nValidation Test Cases:');
  for (const reg of testCases) {
    const u = newUUID(reg, SECRET_SALT);
    const p = path.join(membersDir, `${u}.webp`);
    const exists = fs.existsSync(p);
    const size = exists ? fs.statSync(p).size : 0;
    console.log(`- ${reg} -> /members/${u}.webp (${exists ? `FOUND, ${size} bytes` : 'MISSING'})`);
  }
}

migrate();
