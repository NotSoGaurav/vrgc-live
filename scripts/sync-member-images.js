const fs = require('fs');
const path = require('path');
const { v5: uuidv5 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fopyejijjeoumimsdgiz.supabase.co';
const supabaseKey = 'sb_publishable_LLK3ErUfDW0WLouv0rQORQ_94Ep8UZ-';
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_SECRET_SALT =
  process.env.VITE_IMAGE_SECRET_SALT ||
  process.env.NEXT_PUBLIC_IMAGE_SECRET_SALT ||
  process.env.IMAGE_SECRET_SALT ||
  '';

const DEFAULT_NAMESPACE = uuidv5.DNS; // '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

function sanitizeField(value) {
  if (!value) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function generateMemberUUID(regNo, salt = DEFAULT_SECRET_SALT) {
  const cleanReg = String(regNo || '').trim();
  const identityString = `${cleanReg}_${salt}`;
  return { identityString, uuid: uuidv5(identityString, DEFAULT_NAMESPACE) };
}

async function syncAndGenerateMemberImages() {
  const targetDir = path.join(process.cwd(), 'public', 'members');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const { data: cards, error } = await supabase.from('id_cards').select('*');
  if (error || !cards) {
    console.error('Error fetching cards:', error);
    return;
  }

  const { data: storageFiles } = await supabase.storage.from('id-cards').list('id-photos', { limit: 200 });
  const validFiles = (storageFiles || []).filter(f => f.name && f.name !== '.emptyFolderPlaceholder');

  let downloadedCount = 0;

  for (const card of cards) {
    const regNo = card.registrationNumber || card.id || '';
    if (!regNo) continue;
    const { identityString, uuid } = generateMemberUUID(regNo, DEFAULT_SECRET_SALT);
    const destPath = path.join(targetDir, `${uuid}.webp`);

    const cleanReg = sanitizeField(regNo);
    const cleanName = sanitizeField(card.name);

    let matchFile = validFiles.find(f => {
      const cleanF = sanitizeField(f.name);
      return cleanReg && cleanF.includes(cleanReg);
    });

    if (!matchFile && cleanName) {
      matchFile = validFiles.find(f => {
        const cleanF = sanitizeField(f.name);
        return cleanF.includes(cleanName);
      });
    }

    if (matchFile) {
      const { data: blob, error: dlError } = await supabase.storage.from('id-cards').download(`id-photos/${matchFile.name}`);
      if (!dlError && blob) {
        const buffer = Buffer.from(await blob.arrayBuffer());
        fs.writeFileSync(destPath, buffer);
        downloadedCount++;
        console.log(`✓ [${downloadedCount}] Saved ${card.name} (${regNo}) -> public/members/${uuid}.webp`);
        continue;
      }
    }

    if (card.photoUrl) {
      try {
        const res = await fetch(encodeURI(card.photoUrl));
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          fs.writeFileSync(destPath, buffer);
          downloadedCount++;
          console.log(`✓ [${downloadedCount}] Saved via photoUrl: ${card.name} -> public/members/${uuid}.webp`);
        }
      } catch (err) {
        console.warn(`Could not fetch photo for ${card.name}:`, err.message);
      }
    }
  }

  console.log(`\nDONE! Total synced member photos in public/members/: ${downloadedCount}/${cards.length}`);
}

syncAndGenerateMemberImages();
