import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Send, Pencil, X, Check, ImagePlus } from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { getCommentAuthorMember } from '@/lib/getCommentAuthorMember';

const voteEmoji = { yes: '✅ Yes', no: '❌ No', maybe: '🤔 Maybe' };

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

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
    // Regular text — split by newline to preserve line breaks, render inline so it wraps
    return part ? <span key={i} className="whitespace-pre-wrap">{part}</span> : null;
  });
}

export default function DecisionDialog({ decision, currentUserEmail, familyMembers = [], onSave, onDelete, onClose }) {
  // Find current user's member record by email
  const myMember = familyMembers.find(m => m.email === currentUserEmail);
  const myName = myMember?.name || currentUserEmail;
  // Vote fields are stored by member name (lowercase) e.g. bryan_vote, kate_vote
  const myVoteKey = `${myName.toLowerCase()}_vote`;
  const otherMembers = familyMembers.filter(m => m.email !== currentUserEmail);

  const [myVote, setMyVote] = useState(decision[myVoteKey] || '');
  const [status, setStatus] = useState(decision.status || 'pending');
  const [newComment, setNewComment] = useState('');
  const [pendingImages, setPendingImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [localComments, setLocalComments] = useState(decision.comments || []);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [commentCollapsed, setCommentCollapsed] = useState(false);
  const [focusChat, setFocusChat] = useState(false);
  const commentsEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const commentDragStartY = useRef(null);
  const discussionTapStart = useRef(null);

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
    // Build all current votes: update mine, keep others as-is
    const allVotes = {};
    familyMembers.forEach(m => {
      const key = `${m.name.toLowerCase()}_vote`;
      allVotes[key] = m.email === currentUserEmail ? myVote : (decision[key] || '');
    });

    // Auto-update status: if all adults voted yes, move to needs_action
    const allVotedYes = familyMembers.length > 0 && familyMembers.every(m => allVotes[`${m.name.toLowerCase()}_vote`] === 'yes');
    let finalStatus = status;
    if (allVotedYes && status === 'pending') {
      finalStatus = 'needs_action';
    }

    // Auto-archive: if status is completed, archive it
    let isArchived = decision.is_archived;
    if (finalStatus === 'completed') {
      isArchived = true;
    }

    // Mark all other members as having unread changes
    const otherEmails = otherMembers.map(m => m.email).filter(Boolean);
    const currentUnread = decision.unread_by || [];
    const newUnread = [...new Set([...currentUnread, ...otherEmails])];

    const updates = { ...allVotes, status: finalStatus, is_archived: isArchived, last_updated_by_email: currentUserEmail, unread_by: newUnread };

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

        {/* Header — hidden in focus mode */}
        {!focusChat && (
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="text-base leading-snug text-white pr-6">{decision.title}</DialogTitle>
            {decision.description && (
              <p className="text-sm text-indigo-200 mt-0.5">{decision.description}</p>
            )}
          </DialogHeader>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 px-5 pb-2">

          {/* Votes + My vote — hidden in focus mode */}
          {!focusChat && (
            <>
              <div className="flex gap-3">
                {familyMembers.map(m => {
                  const voteKey = `${m.name.toLowerCase()}_vote`;
                  const vote = decision[voteKey];
                  return (
                    <div key={m.id} className="flex-1 rounded-2xl p-3 flex flex-row items-center gap-3" style={{background: 'rgba(180,140,255,0.25)', border: '1px solid rgba(200,170,255,0.3)'}}>
                      {m.photo_url
                        ? <img src={m.photo_url} alt={m.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                        : <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-bold flex-shrink-0">{m.name[0]}</div>
                      }
                      <div>
                        <p className="text-xs text-indigo-200">{m.name}</p>
                        <p className="text-sm font-medium text-white">{vote ? voteEmoji[vote] : '—'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
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
            </>
          )}

          {/* Comments chat log */}
          {localComments.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between select-none cursor-pointer" onClick={() => setFocusChat(f => !f)}>
                <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">Discussion</p>
                <span className="text-indigo-300 text-xs">{focusChat ? '↕ collapse' : '⤢ expand'}</span>
              </div>
              {/* In collapsed mode, tapping the bubble area expands to focus mode.
                  In focus mode, NO click handler — so text selection handles work freely. */}
              <div
                className={`space-y-2 overflow-y-auto transition-all ${focusChat ? 'max-h-[65vh]' : 'max-h-48 cursor-pointer'}`}
                onClick={!focusChat ? () => setFocusChat(true) : undefined}
              >
                {localComments.map((c, i) => {
                  const isMe = c.commenter_email === currentUserEmail;
                  const isEditing = editingIndex === i;
                  return (
                    <div key={i} className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {(() => {
                         const commenterMember = getCommentAuthorMember(
                           c.commenter_email,
                           c.commenter_name,
                           currentUserEmail,
                           myMember,
                           familyMembers
                         );
                         return commenterMember?.photo_url
                           ? <img src={commenterMember.photo_url} alt={commenterMember.name} className="w-6 h-6 rounded-full object-cover flex-shrink-0 mb-5" />
                           : <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mb-5">{commenterMember?.name?.[0] || c.commenter_name?.[0] || '?'}</div>;
                       })()}
                      <div className={`flex flex-col max-w-[80%] min-w-0 overflow-hidden ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className="rounded-2xl px-3 py-2 w-full overflow-hidden" style={isMe ? {background: 'rgba(220,200,255,0.9)', color: '#3d2a8a'} : {background: 'rgba(180,140,255,0.3)', color: 'white', border: '1px solid rgba(200,170,255,0.3)'}}>
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
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onTouchStart={e => { commentDragStartY.current = e.touches[0].clientY; }}
              onTouchEnd={e => {
                if (commentDragStartY.current !== null) {
                  const delta = e.changedTouches[0].clientY - commentDragStartY.current;
                  if (delta > 30) setCommentCollapsed(true);
                  else if (delta < -30) setCommentCollapsed(false);
                  commentDragStartY.current = null;
                }
              }}
              onClick={() => setCommentCollapsed(c => !c)}
            >
              <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">
                {localComments.length > 0 ? 'Add a comment' : 'Comment (optional)'}
              </p>
              <span className="text-indigo-300 text-xs">{commentCollapsed ? '▲ expand' : '▼ minimize'}</span>
            </div>
            {!commentCollapsed && (
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
            )}
          </div>

          {/* Status + Save — hidden in focus mode */}
          {!focusChat && (
            <>
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Lightbox */}
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
    </>
  );
}