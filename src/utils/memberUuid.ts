import { v5 as uuidv5 } from 'uuid';

/**
 * Standard RFC 4122 DNS Namespace UUID
 */
export const DNS_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * Retrieves the secret salt from environment variables without any hardcoded fallback.
 * Checks VITE_IMAGE_SECRET_SALT, NEXT_PUBLIC_IMAGE_SECRET_SALT, and IMAGE_SECRET_SALT.
 */
export function getImageSecretSalt(): string {
  const salt =
    process.env.VITE_IMAGE_SECRET_SALT ||
    process.env.NEXT_PUBLIC_IMAGE_SECRET_SALT ||
    process.env.IMAGE_SECRET_SALT;

  if (!salt) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(
        'VITE_IMAGE_SECRET_SALT / NEXT_PUBLIC_IMAGE_SECRET_SALT is not configured. Please set it in your environment variables.'
      );
    } else {
      // Throw to avoid generating empty UUIDs which cause 404s.
      throw new Error('Missing image secret salt environment variable. Set VITE_IMAGE_SECRET_SALT or NEXT_PUBLIC_IMAGE_SECRET_SALT.');
    }
    return '';
  }

  return salt;
}

export interface MemberData {
  registrationNumber?: string;
  id?: string;
  [key: string]: any;
}

/**
 * Generates a deterministic UUIDv5 according to RFC 4122 using DNS namespace.
 * Identity format is strictly: ${registrationNumber}_${SECRET_SALT}
 */
export function generateMemberUUID(
  memberOrRegNo: MemberData | string,
  saltArg?: string
): string {
  let regNo = '';

  if (typeof memberOrRegNo === 'object' && memberOrRegNo !== null) {
    regNo = memberOrRegNo.registrationNumber || memberOrRegNo.id || '';
  } else if (typeof memberOrRegNo === 'string') {
    regNo = memberOrRegNo;
  }

  const cleanReg = String(regNo || '').trim();
  const salt = saltArg !== undefined ? saltArg : getImageSecretSalt();

  if (!cleanReg || !salt) {
    return '';
  }

  const identityString = `${cleanReg}_${salt}`;
  const uuid = uuidv5(identityString, uuidv5.DNS);
  // Diagnostic logging (salt redacted)
  console.log({
    registrationNumber: cleanReg,
    identityString: `${cleanReg}_[REDACTED]`,
    generatedUUID: uuid,
    imageUrl: `/members/${uuid}.webp`
  });
  return uuid;
}


/**
 * Resolves the member's photo URL from public/members/ using the deterministic UUIDv5.
 * Returns /members/${uuid}.webp or /vrgc_logo.jpg fallback.
 */
export function getMemberPhotoUrl(
  member: MemberData | string,
  salt?: string
): string {
  const uuid = generateMemberUUID(member, salt);
  if (!uuid) return '/vrgc_logo.jpg';
  return `/members/${uuid}.webp`;
}
