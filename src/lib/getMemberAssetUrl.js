/**
 * getMemberAssetUrl(member)
 *
 * Constructs the filename for a member's transparent PNG avatar based on their traits.
 * Naming convention: [Type]_[Gender]_[Age]_[Skin]_[Hair].png
 * e.g., Adult_Female_30s_S1_H1.png
 *
 * Falls back to a placeholder if traits are missing.
 */

const ASSET_BASE_URL = '/assets/members/';

export function getMemberAssetUrl(member) {
  const gender = member.gender || 'Unknown';
  const ageRange = member.age_range || '18+';
  const skin = member.skin_tone || 'S1';
  const hair = member.hair_color || 'H1';

  // Map age_range to type
  const type = ageRange === 'Under 13' ? 'Child'
    : ageRange === '13-17' ? 'Teen'
    : 'Adult';

  const filename = `${type}_${gender}_${ageRange.replace(/[^a-zA-Z0-9]/g, '')}_${skin}_${hair}.png`;
  return `${ASSET_BASE_URL}${filename}`;
}

/**
 * Returns true if the member is considered an "adult" (for layout positioning)
 */
export function isAdultMember(member) {
  return !member.age_range || member.age_range === '18+' || member.age_range === '13-17';
}