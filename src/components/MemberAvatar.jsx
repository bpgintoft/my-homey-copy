import React from 'react';

/**
 * Displays a family member's avatar with priority:
 * 1. generated_avatar_url (AI cartoon)
 * 2. original_headshot_url (uploaded photo)
 * 3. Colored initial circle (legacy)
 * 4. Generic gray placeholder
 *
 * Shows a gold pulse animation when pending_avatar_generation is true.
 */
export default function MemberAvatar({ member, size = 'md', className = '' }) {
  const sizeClasses = {
    xs:  'w-8 h-8 text-xs',
    sm:  'w-10 h-10 text-sm',
    md:  'w-16 h-16 text-xl',
    lg:  'w-20 h-20 text-2xl',
    xl:  'w-24 h-24 text-3xl',
  };
  const base = `rounded-full object-cover flex-shrink-0 ${sizeClasses[size] || sizeClasses.md} ${className}`;

  const isPending = member?.pending_avatar_generation && !member?.generated_avatar_url;
  const avatarUrl = member?.generated_avatar_url || member?.original_headshot_url || member?.photo_url;

  // Pending state: show headshot (or initials) with a gold pulse ring + label
  if (isPending) {
    return (
      <div className="relative flex-shrink-0 inline-flex">
        {/* Pulsing gold ring */}
        <span
          className={`absolute inset-0 rounded-full animate-ping opacity-60`}
          style={{ backgroundColor: '#C5A059' }}
        />
        {avatarUrl ? (
          <img src={avatarUrl} alt={member?.name || 'Member'} className={base} />
        ) : (
          <div
            className={`${base} flex items-center justify-center text-white font-bold relative z-10`}
            style={{ backgroundColor: member?.color || '#C5A059' }}
          >
            {member?.name?.charAt(0) || '?'}
          </div>
        )}
        {/* "Generating" label — only on md+ */}
        {(size === 'md' || size === 'lg' || size === 'xl') && (
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-amber-600">
            Generating…
          </span>
        )}
      </div>
    );
  }

  if (avatarUrl) {
    return <img src={avatarUrl} alt={member?.name || 'Member'} className={`${base} object-cover`} />;
  }

  if (member?.color || member?.name) {
    return (
      <div
        className={`${base} flex items-center justify-center text-white font-bold`}
        style={{ backgroundColor: member?.color || '#9ca3af' }}
      >
        {member?.name?.charAt(0) || '?'}
      </div>
    );
  }

  // Generic gray placeholder
  return (
    <div className={`${base} flex items-center justify-center bg-gray-200`}>
      <svg viewBox="0 0 40 40" className="w-1/2 h-1/2 text-gray-400" fill="currentColor">
        <circle cx="20" cy="14" r="7" />
        <ellipse cx="20" cy="32" rx="12" ry="8" />
      </svg>
    </div>
  );
}