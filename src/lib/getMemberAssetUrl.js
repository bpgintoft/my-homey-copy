/**
 * Asset URL utility for the Family Portrait Compositor.
 *
 * Naming convention: [Type]_[Gender]_[Age]_[Skin]_[Hair].png
 * Example: Adult_Female_30s_S1_H1.png
 *
 * Falls back to a placeholder silhouette if traits are missing.
 */

const BASE_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/members/';

const AGE_RANGE_MAP = {
  'Under 13': 'Child',
  '13-17': 'Teen',
  '18+': 'Adult',
};

/**
 * Returns the asset URL for a FamilyMember based on their traits.
 * @param {object} member - FamilyMember entity record
 * @returns {string} URL to the transparent PNG asset
 */
export function getMemberAssetUrl(member) {
  const type = AGE_RANGE_MAP[member.age_range] || 'Adult';
  const gender = member.gender || 'Unknown';
  const ageBracket = member.age_bracket || 'Adult';
  const skin = member.skin_tone || 'S1';
  const hair = member.hair_color || 'H1';

  const filename = `${type}_${gender}_${ageBracket}_${skin}_${hair}.png`;
  return `${BASE_URL}${filename}`;
}

/**
 * Returns a simple placeholder silhouette color based on member role.
 */
export function getMemberPlaceholderColor(member) {
  const colors = {
    Parent: '#8B6FE8',
    Child: '#4ABFDE',
    Guest: '#A0AEC0',
  };
  return colors[member.role] || '#A0AEC0';
}