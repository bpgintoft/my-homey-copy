/**
 * Robust member lookup for comments/discussions.
 * Tries multiple matching strategies to find the family member.
 * 
 * @param {string} commenterEmail - Email stored in the comment
 * @param {string} commenterName - Name stored in the comment
 * @param {string} currentUserEmail - Current user's email (for optimization)
 * @param {object} currentUserMember - Current user's member record (if available)
 * @param {array} familyMembers - List of all family members
 * @returns {object|null} Family member object or null if not found
 */
export function getCommentAuthorMember(
  commenterEmail,
  commenterName,
  currentUserEmail,
  currentUserMember,
  familyMembers = []
) {
  // If this is the current user, use their member record directly
  if (commenterEmail === currentUserEmail && currentUserMember) {
    return currentUserMember;
  }

  // Strategy 1: Exact email match (case-insensitive)
  if (commenterEmail) {
    const emailMatch = familyMembers.find(
      m => m.email?.toLowerCase() === commenterEmail.toLowerCase()
    );
    if (emailMatch) return emailMatch;
  }

  // Strategy 2: Exact name match
  if (commenterName) {
    const nameMatch = familyMembers.find(
      m => m.name?.toLowerCase() === commenterName.toLowerCase()
    );
    if (nameMatch) return nameMatch;
  }

  // Strategy 3: Partial name match (first word or email local part in name)
  if (commenterName) {
    const firstName = commenterName.split(' ')[0].toLowerCase();
    const partialMatch = familyMembers.find(m =>
      m.name?.toLowerCase().includes(firstName)
    );
    if (partialMatch) return partialMatch;
  }

  // No match found
  return null;
}