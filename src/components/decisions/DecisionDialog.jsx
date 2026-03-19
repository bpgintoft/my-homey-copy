import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Send, Pencil, X, Check, ImagePlus } from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';

const BRYAN_EMAIL = 'bpgintoft@gmail.com';
const KATE_EMAIL = 'kateeliz11@gmail.com';

const AVATARS = {
  [BRYAN_EMAIL]: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/b093cc037_Bryan.png',
  [KATE_EMAIL]: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6990e4185e2b18f4d04a1ac8/d14194fd4_Kate.png',
};

const voteEmoji = { yes: '✅ Yes', no: '❌ No', maybe: '🤔 Maybe' };

const REACTION_OPTIONS = ['👍', '👎', '❤️', '😂', '😮', '❗', '❓'];

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function useReactionPicker(onReact) {
  const timerRef = useRef(null);
  const [pickerIndex, setPickerIndex] = useState(null);
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 });

  const startPress = (i, e) => {
    const touch = e.touches?.[0];
    const x = touch ? touch.clientX : e.clientX;
    const y = touch ? touch.clientY : e.clientY;
    timerRef.current = setTimeout(() => {
      setPickerPos({ x, y });
      setPickerIndex(i);
    }, 500);
  };

  const cancelPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const selectReaction = (emoji) => {
    onReact(pickerIndex, emoji);
    setPickerIndex(null);
  };

  const closePicker = () => setPickerIndex(null);

  return { startPress, cancelPress, pickerIndex, pickerPos, selectReaction, closePicker };
}

function renderTextWithLinks(text, isMe) {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (URL_REGEX.test(part)) {
      URL_REGEX.lastIndex = 0;
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline block truncate text-sm ${isMe ? 'text-indigo-600' : 'text-indigo-200'}`}
        >
          {part}
        </a>
      );
    }
    return part ? <span key={i} className="whitespace-pre-wrap">{part}</span> : null;
  });
}

import { createPortal } from 'react-dom';

function ReactionPicker({ pos, onSelect, onClose }) {
  useEffect(() => {
    const handler = () => onClose();
    document.addEventListener('touchstart', handler);
    document.addEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed z-[9999] flex gap-1 p-2 rounded-2xl shadow-xl"
      style={{
        background: 'rgba(45, 27, 105, 0.97)',
        border: '1px solid rgba(200,170,255,0.4)',
        left: Math.min(pos.x - 140, window.innerWidth - 300),
        top: pos.y - 60,
        whiteSpace: 'nowrap',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {REACTION_OPTIONS.map(emoji => (
        <button
          key={emoji}
          onMouseDown={(e) => { e.stopPropagation(); onSelect(emoji); }}
          onTouchEnd={(e) => { e.stopPropagation(); onSelect(emoji); }}
          className="text-2xl hover:scale-125 transition-transform active:scale-110 px-1"
        >
          {emoji}
        </button>
      ))}
    </div>,
    document.body
  );
}

export default function DecisionDialog({ decision, currentUserEmail, onSave, onDelete, onClose }) {
  const isBryan = currentUserEmail === BRYAN_EMAIL;
  const isKate = currentUserEmail === KATE_EMAIL;
  const myName = isBryan ? 'Bryan' : 'Kate';

  const [myVote, setMyVote] = useState(
    isBryan ? (decision.bryan_vote || '') : (decision.kate_vote || '')
  );
  const [status, setStatus] = useState(decision.status || 'pending');
  const [newComment, setNewComment] = useState('');
  const [pendingImages, setPendingImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [localComments, setLocalComments] = useState(decision.comments || []);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const commentsEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleReactionSelect = (commentIndex, emoji) => {
    setLocalComments(prev => prev.map((c, i) => {
      if (i !== commentIndex) return c;
      const reactions = { ...(c.reactions || {}) };
      const users = reactions[emoji] ? [...reactions[emoji]] : [];
      if (users.includes(currentUserEmail)) {
        const filtered = users.filter(u => u !== currentUserEmail);
        if (filtered.length === 0) delete reactions[emoji];
        else reactions[emoji] = filtered;
      } else {
        reactions[emoji] = [...users, currentUserEmail];
      }
      return { ...c, reactions };
    }));
  };

  const { startPress, cancelPress, pickerIndex, pickerPos, selectReaction, closePicker } = useReactionPicker(handleReactionSelect);

  const uploadImage = async (file) => {
    setUploadingImage(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPendingImages(prev => [...prev, file_url]);
    setUploadingImage(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) uploadImage(file);
    e.target.value = '';
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) uploadImage(file);
        return;
      }
    }
  };

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localComments.length]);



  const handleSave = () => {
    const bryantVote = isBryan ? myVote : decision.bryan_vote;
    const kateVote = isKate ? myVote : decision.kate_vote;

    let finalStatus = status;
    if (bryantVote === 'yes' && kateVote === 'yes' && status === 'pending') {
      finalStatus = 'needs_action';
    }

    let isArchived = decision.is_archived;
    if (finalStatus === 'completed') {
      isArchived = true;
      finalStatus = 'completed';
    }

    const otherEmail = isBryan ? KATE_EMAIL : BRYAN_EMAIL;
    const currentUnread = decision.unread_by || [];
    const newUnread = currentUnread.includes(otherEmail) ? currentUnread : [...currentUnread, otherEmail];

    const updates = { status: finalStatus, is_archived: isArchived, last_updated_by_email: currentUserEmail, unread_by: newUnread };
    if (isBryan) updates.bryan_vote = myVote;
    else if (isKate) updates.kate_vote = myVote;

    let updatedComments = [...localComments];
    if (newComment.trim() || pendingImages.length > 0) {
      const newEntry = {
        commenter_email: currentUserEmail,
        commenter_name: myName,
        text: newComment.trim(),
        images: [...pendingImages],
        timestamp: new Date().toISOString(),
      };
      updatedComments = [...updatedComments, newEntry];
    }
    updates.comments = updatedComments;
    setNewComment('');
    setPendingImages([]);
    onSave(decision.id, updates);
  };

  const handleEditSave = (i) => {
    if (!editingText.trim()) return;
    const updated = localComments.map((c, idx) =>
      idx === i ? { ...c, text: editingText.trim() } : c
    );
    setLocalComments(updated);
    setEditingIndex(null);
    setEditingText('');
  };

  const handleDeleteComment = (i) => {
    setLocalComments(localComments.filter((_, idx) => idx !== i));
  };

  return (
    <>
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden p-0 border-0 rounded-3xl" style={{background: 'linear-gradient(160deg, #2d1b69 0%, #4a3fb5 60%, #5B4FCF 100%)'}}>
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base leading-snug text-white pr-6">{decision.title}</DialogTitle>
          {decision.description && (
            <p className="text-sm text-indigo-200 mt-0.5">{decision.description}</p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 px-5 pb-2">
          {/* Votes row */}
          <div className="flex gap-3">
            <div className="flex-1 rounded-2xl p-3 flex flex-row items-center gap-3" style={{background: 'rgba(180,140,255,0.25)', border: '1px solid rgba(200,170,255,0.3)'}}>
              <img src={AVATARS[BRYAN_EMAIL]} alt="Bryan" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
              <p className="text-sm font-medium text-white">{decision.bryan_vote ? voteEmoji[decision.bryan_vote] : '—'}</p>
            </div>
            <div className="flex-1 rounded-2xl p-3 flex flex-row items-center gap-3" style={{background: 'rgba(180,140,255,0.25)', border: '1px solid rgba(200,170,255,0.3)'}}>
              <img src={AVATARS[KATE_EMAIL]} alt="Kate" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
              <p className="text-sm font-medium text-white">{decision.kate_vote ? voteEmoji[decision.kate_vote] : '—'}</p>
            </div>
          </div>

          {/* My vote */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">Your Vote</p>
            <div className="flex gap-2">
              {['yes', 'no', 'maybe'].map(v => (
                <button
                  key={v}
                  onClick={() => setMyVote(v)}
                  className={`flex-1 py-2 rounded-full text-sm font-medium transition-all border ${
                   myVote === v
                     ? 'text-[#3d2a8a] border-transparent shadow-lg scale-105'
                     : 'text-white/70 border-white/20 hover:border-white/40 hover:text-white'
                  }`}
                  style={myVote === v ? {background: 'rgba(200,170,255,0.9)'} : {background: 'rgba(180,140,255,0.15)'}}
                >
                  {voteEmoji[v]}
                </button>
              ))}
            </div>
          </div>

          {/* Comments chat log */}
          {localComments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">Discussion</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {localComments.map((c, i) => {
                  const isMe = c.commenter_email === currentUserEmail;
                  const isEditing = editingIndex === i;
                  const reactions = c.reactions || {};
                  const reactionEntries = Object.entries(reactions).filter(([, users]) => users.length > 0);

                  return (
                    <div key={i} className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <img
                        src={AVATARS[c.commenter_email] || ''}
                        alt={c.commenter_name}
                        className="w-6 h-6 rounded-full object-cover flex-shrink-0 mb-5"
                      />
                      <div className={`flex flex-col max-w-[80%] min-w-0 overflow-hidden ${isMe ? 'items-end' : 'items-start'}`}>
                        <div
                          className="rounded-2xl px-3 py-2 w-full overflow-visible relative select-none"
                          style={isMe ? {background: 'rgba(220,200,255,0.9)', color: '#3d2a8a', WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none'} : {background: 'rgba(180,140,255,0.3)', color: 'white', border: '1px solid rgba(200,170,255,0.3)', WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none'}}
                          onMouseDown={(e) => !isEditing && startPress(i, e)}
                          onMouseUp={cancelPress}
                          onMouseLeave={cancelPress}
                          onTouchStart={(e) => !isEditing && startPress(i, e)}
                          onTouchEnd={cancelPress}
                          onTouchCancel={cancelPress}
                          onContextMenu={(e) => e.preventDefault()}
                        >

                          <p className={`text-xs font-semibold mb-0.5 ${isMe ? 'text-indigo-400' : 'text-indigo-200'}`}>{c.commenter_name}</p>
                          {isEditing ? (
                            <div className="space-y-1">
                              <Textarea
                                value={editingText}
                                onChange={e => setEditingText(e.target.value)}
                                rows={2}
                                className="text-sm text-gray-900 bg-white border-0"
                                style={{ fontSize: '16px' }}
                              />
                              <div className="flex gap-1 justify-end">
                                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-gray-500" onClick={() => { setEditingIndex(null); setEditingText(''); }}>
                                  <X className="w-3 h-3" />
                                </Button>
                                <Button size="sm" className="h-6 px-2 text-xs bg-[#5B4FCF] text-white" onClick={() => handleEditSave(i)}>
                                  <Check className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {c.text && <div className="text-sm leading-snug break-words w-full">{renderTextWithLinks(c.text, isMe)}</div>}
                              {c.images && c.images.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {c.images.map((url, idx) => (
                                    <img key={idx} src={url} alt="attachment" className="rounded-xl max-w-[180px] max-h-[180px] object-cover cursor-pointer" onClick={() => setLightboxUrl(url)} />
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {reactionEntries.length > 0 && (
                          <div className={`flex flex-wrap gap-1 mt-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {reactionEntries.map(([emoji, users]) => (
                              <button
                                key={emoji}
                                onMouseDown={(e) => { e.preventDefault(); handleReactionSelect(i, emoji); }}
                                onTouchEnd={(e) => { e.stopPropagation(); handleReactionSelect(i, emoji); }}
                                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all ${
                                  users.includes(currentUserEmail)
                                    ? 'bg-indigo-400/60 text-white'
                                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                                }`}
                              >
                                <span>{emoji}</span>
                                {users.length > 1 && <span className="ml-0.5">{users.length}</span>}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-0.5 px-1">
                          <p className="text-xs text-indigo-300">
                            {c.timestamp ? format(new Date(c.timestamp), 'MMM d, h:mm a') : ''}
                          </p>
                          {isMe && !isEditing && (
                            <>
                              <button onClick={() => { setEditingIndex(i); setEditingText(c.text); }} className="text-xs text-indigo-300 hover:text-white">Edit</button>
                              <button onClick={() => handleDeleteComment(i)} className="text-xs text-indigo-300 hover:text-red-300">Delete</button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={commentsEndRef} />
              </div>
            </div>
          )}

          {/* New comment input */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">{localComments.length > 0 ? 'Add a comment' : 'Comment (optional)'}</p>
            <div className="rounded-2xl overflow-hidden" style={{background: 'rgba(180,140,255,0.2)', border: '1px solid rgba(200,170,255,0.25)'}}>
              <Textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onPaste={handlePaste}
                placeholder="Add context, conditions, thoughts... (paste images directly)"
                rows={2}
                className="border-0 text-white placeholder:text-indigo-300 bg-transparent rounded-none resize-none"
                style={{ fontSize: '16px' }}
              />
              {pendingImages.length > 0 && (
                <div className="flex flex-wrap gap-2 px-3 pb-2">
                  {pendingImages.map((url, idx) => (
                    <div key={idx} className="relative">
                      <img src={url} alt="pending" className="rounded-lg w-16 h-16 object-cover" />
                      <button
                        onClick={() => setPendingImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center"
                      >
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center px-3 pb-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="flex items-center gap-1.5 text-xs text-indigo-300 hover:text-white transition-colors"
                >
                  <ImagePlus className="w-4 h-4" />
                  {uploadingImage ? 'Uploading...' : 'Add photo'}
                </button>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">Status</p>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="border-0 text-white rounded-2xl" style={{background: 'rgba(180,140,255,0.2)', border: '1px solid rgba(200,170,255,0.25)'}}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="needs_action">Needs Action</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2 pb-4">
            <button onClick={handleSave} disabled={uploadingImage} className="flex-1 flex items-center justify-center gap-1.5 bg-white text-[#5B4FCF] font-semibold py-2.5 rounded-full hover:bg-indigo-50 transition-colors disabled:opacity-60">
              <Send className="w-4 h-4" />
              Save
            </button>
            <button onClick={onClose} className="px-4 py-2.5 rounded-full text-white font-medium transition-colors text-sm" style={{background: 'rgba(180,140,255,0.25)', border: '1px solid rgba(200,170,255,0.3)'}}>Cancel</button>
            {decision.proposer_email === currentUserEmail && (
              <button onClick={() => onDelete(decision.id)} className="p-2.5 rounded-full bg-red-400/30 text-red-200 hover:bg-red-400/50 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {lightboxUrl && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
        onClick={() => setLightboxUrl(null)}
      >
        <img src={lightboxUrl} alt="full size" className="max-w-full max-h-full rounded-2xl object-contain" />
        <button className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2" onClick={() => setLightboxUrl(null)}>
          <X className="w-5 h-5" />
        </button>
      </div>
    )}

    {pickerIndex !== null && (
      <ReactionPicker
        pos={pickerPos}
        onSelect={selectReaction}
        onClose={closePicker}
      />
    )}
    </>
  );
}