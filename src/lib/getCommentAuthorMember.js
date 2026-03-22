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
  if (!Array.isArray(familyMembers)) {
    familyMembers = [];
  }

  // If this is the current user, use their member record directly
  if (commenterEmail && commenterEmail === currentUserEmail && currentUserMember) {
    return currentUserMember;
  }

  // Strategy 1: Exact email match (case-insensitive)
  if (commenterEmail) {
    const normalizedEmail = commenterEmail.toLowerCase().trim();
    const emailMatch = familyMembers.find(
      m => m.email && m.email.toLowerCase().trim() === normalizedEmail
    );
    if (emailMatch) return emailMatch;
  }

  // Strategy 2: Exact name match (case-insensitive)
  if (commenterName) {
    const normalizedName = commenterName.toLowerCase().trim();
    const nameMatch = familyMembers.find(
      m => m.name && m.name.toLowerCase().trim() === normalizedName
    );
    if (nameMatch) return nameMatch;
  }

  // Strategy 3: First name match in stored name
  if (commenterName) {
    const firstName = commenterName.split(' ')[0].toLowerCase().trim();
    if (firstName) {
      const firstNameMatch = familyMembers.find(m =>
        m.name && m.name.toLowerCase().includes(firstName)
      );
      if (firstNameMatch) return firstNameMatch;
    }
  }

  // Strategy 4: Extract first name from email local part and match
  if (commenterEmail) {
    const emailLocalPart = commenterEmail.split('@')[0].toLowerCase().trim();
    if (emailLocalPart) {
      const emailNameMatch = familyMembers.find(m =>
        m.name && m.name.toLowerCase().includes(emailLocalPart)
      );
      if (emailNameMatch) return emailNameMatch;
    }
  }

  // No match found
  return null;
}