/**
 * getMemberAssetUrl(member)
 *
 * Constructs the filename for a member's transparent PNG avatar based on their traits.
 * Naming convention: {gender}-{age_range}-{skin_tone}-{hair_color}-{eye_color}-{facial_hair}.png
 * e.g., male-adult-S1-H1-E2-F0.png
 */

const ASSET_BASE_URL = '/assets/members/';

export function getMemberAssetUrl(member) {
  const gender = member.gender === 'Male' ? 'male' : member.gender === 'Female' ? 'female' : '';
  const skin = member.skin_tone || 'S1';
  const hair = member.hair_color || 'H1';
  const eye = member.eye_color || 'E2';
  const facialHair = member.facial_hair || 'F0';

  let ageRangeCode;
  if (member.age_range === 'Baby') {
    ageRangeCode = 'baby';
  } else if (member.age_range === 'Under 13') {
    ageRangeCode = 'kid';
  } else if (member.age_range === '13-17') {
    ageRangeCode = 'teen';
  } else {
    ageRangeCode = 'adult';
  }

  const filename = `${gender}-${ageRangeCode}-${skin}-${hair}-${eye}-${facialHair}.png`;
  return `${ASSET_BASE_URL}${filename}`;
}

/**
 * Returns true if the member is considered an "adult" (for layout positioning)
 */
export function isAdultMember(member) {
  return !member.age_range || member.age_range === '18+' || member.age_range === '13-17';
}