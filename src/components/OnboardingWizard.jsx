import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ArrowRight, ArrowLeft, CheckCircle2, Home, Users, Calendar, Sparkles } from 'lucide-react';
import CharacterCreator from '@/components/CharacterCreator';

const COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const STEP_COUNT = 3; // steps 1–3 after welcome

// ─── Banner background (matches Home page) ────────────────────────────────
const bannerStyle = {
  background: 'linear-gradient(135deg, #C8F0E0 0%, #A8E6D3 50%, #88DCC8 100%)',
  position: 'relative',
};
const BannerBg = ({ children, full = false }) => (
  <>
    <style>{`
      .ob-banner { background: linear-gradient(135deg,#C8F0E0 0%,#A8E6D3 50%,#88DCC8 100%); position:relative; }
      .ob-banner::before {
        content:''; position:absolute; inset:0;
        background:
          repeating-linear-gradient(45deg,
            rgba(168,230,211,.6) 0px, rgba(168,230,211,.6) 10px,
            rgba(120,200,180,.4) 10px, rgba(120,200,180,.4) 20px,
            rgba(168,230,211,.6) 20px, rgba(168,230,211,.6) 25px,
            rgba(200,240,224,.3) 25px, rgba(200,240,224,.3) 30px),
          radial-gradient(circle,rgba(120,200,180,.4) 2px,transparent 2px);
        background-size: 100% 100%, 15px 15px;
        background-position: 0 0, 7px 7px;
      }
    `}</style>
    <div className={`ob-banner ${full ? 'min-h-screen' : ''}`}>{children}</div>
  </>
);

// ─── Member mini-card ─────────────────────────────────────────────────────
function MemberChip({ member, onRemove }) {
  return (
    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
        style={{ backgroundColor: member.color || '#0d9488' }}
      >
        {member.name?.charAt(0)}
      </div>
      <span className="text-sm font-medium text-slate-700">{member.name}</span>
      <span className="text-xs text-slate-400">{member.role || member.age_range}</span>
      <button type="button" onClick={onRemove} className="ml-1 text-slate-300 hover:text-red-400 transition-colors">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Inline member add form ───────────────────────────────────────────────
function AddMemberForm({ onAdd, onCancel }) {
  const [formData, setFormData] = useState({ name: '', role: '', color: COLORS[0] });

  const set = (f, v) => setFormData(d => ({ ...d, [f]: v }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Name *</Label>
          <Input value={formData.name} onChange={e => set('name', e.target.value)} placeholder="Full name" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Role</Label>
          <Input value={formData.role || ''} onChange={e => set('role', e.target.value)} placeholder="e.g. Parent, Child" className="mt-1" />
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Appearance</p>
        <CharacterCreator
          value={{ gender: formData.gender, age_range: formData.age_range, skin_tone: formData.skin_tone, hair_color: formData.hair_color }}
          onChange={traits => setFormData(d => ({ ...d, ...traits }))}
        />
      </div>

      <div>
        <Label className="text-xs">Color</Label>
        <div className="flex gap-2 mt-1 flex-wrap">
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => set('color', c)}
              className={`w-7 h-7 rounded-full transition-all ${formData.color === c ? 'ring-2 ring-offset-2 ring-teal-500 scale-110' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button size="sm" className="flex-1 bg-teal-600 hover:bg-teal-700" disabled={!formData.name}
          onClick={() => onAdd(formData)}>
          Add Member
        </Button>
      </div>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────
function StepDots({ current, total }) {
  return (
    <div className="flex gap-2 justify-center mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`rounded-full transition-all ${i + 1 === current ? 'w-6 h-2 bg-teal-500' : i + 1 < current ? 'w-2 h-2 bg-teal-300' : 'w-2 h-2 bg-slate-200'}`} />
      ))}
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────
export default function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0); // 0 = welcome
  const [familyName, setFamilyName] = useState('');
  const [members, setMembers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleAddMember = (memberData) => {
    setMembers(prev => [...prev, { ...memberData, _tempId: Date.now() }]);
    setShowAddForm(false);
  };

  const handleRemoveMember = (tempId) => {
    setMembers(prev => prev.filter(m => m._tempId !== tempId));
  };

  const handleFinish = async () => {
    setSaving(true);
    // 1. Create Family
    const family = await base44.entities.Family.create({ name: familyName || 'Our Family' });
    // 2. Update current user with family_id
    await base44.auth.updateMe({ family_id: family.id });
    // 3. Create all members
    for (const m of members) {
      const { _tempId, ...data } = m;
      await base44.entities.FamilyMember.create({ ...data, family_id: family.id });
    }
    queryClient.invalidateQueries({ queryKey: ['familyMembers'] });
    queryClient.invalidateQueries({ queryKey: ['family'] });
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    setSaving(false);
    onComplete();
  };

  const variants = {
    enter: { opacity: 0, x: 40 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -40 },
  };

  // ── Step 0: Welcome ──────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <BannerBg full>
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="max-w-md w-full">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Home className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">Welcome Home.</h1>
            <p className="text-lg text-gray-600 mb-10 leading-relaxed">
              The command center for your family's life, chores, and memories.
            </p>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white text-lg px-10 py-6 rounded-2xl shadow-lg w-full max-w-xs mx-auto"
              onClick={() => setStep(1)}
            >
              Get Started <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </BannerBg>
    );
  }

  // ── Steps 1–3 shell ──────────────────────────────────────────────────────
  return (
    <BannerBg full>
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <button onClick={() => setStep(s => s - 1)} className="text-gray-600 hover:text-gray-900 transition-colors p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <StepDots current={step} total={STEP_COUNT} />
          <div className="w-7" /> {/* spacer */}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 pb-10">
          <AnimatePresence mode="wait">
            <motion.div key={step} variants={variants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.25 }} className="max-w-lg mx-auto pt-4">

              {/* ── Step 1: Name Your Home ──────────────────────────────── */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center mb-3">
                      <Home className="w-6 h-6 text-teal-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Name Your Home</h2>
                    <p className="text-gray-500 mt-1 text-sm">Give your household a name. You can always change it later.</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <Label>Household Name</Label>
                    <Input
                      className="mt-2 text-lg"
                      placeholder="e.g. The Smith Manor"
                      value={familyName}
                      onChange={e => setFamilyName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <Button className="w-full bg-teal-600 hover:bg-teal-700 py-5 text-base rounded-xl"
                    disabled={!familyName.trim()} onClick={() => setStep(2)}>
                    Next <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* ── Step 2: Build Your Family ───────────────────────────── */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center mb-3">
                      <Users className="w-6 h-6 text-teal-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Build Your Family</h2>
                    <p className="text-gray-500 mt-1 text-sm">Add yourself, your partner, and your kids. You can add more later.</p>
                  </div>

                  {members.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {members.map(m => (
                        <MemberChip key={m._tempId} member={m} onRemove={() => handleRemoveMember(m._tempId)} />
                      ))}
                    </div>
                  )}

                  {showAddForm ? (
                    <AddMemberForm onAdd={handleAddMember} onCancel={() => setShowAddForm(false)} />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddForm(true)}
                      className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-teal-300 rounded-2xl py-4 text-teal-600 hover:border-teal-500 hover:bg-teal-50/50 transition-all text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" /> Add a Family Member
                    </button>
                  )}

                  <Button className="w-full bg-teal-600 hover:bg-teal-700 py-5 text-base rounded-xl mt-2"
                    onClick={() => setStep(3)}>
                    {members.length === 0 ? 'Skip for now' : 'Next'} <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* ── Step 3: Connect Your World ──────────────────────────── */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center mb-3">
                      <Calendar className="w-6 h-6 text-teal-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Connect Your World</h2>
                    <p className="text-gray-500 mt-1 text-sm">Link a calendar to see your family's schedule — or skip and do it later in Settings.</p>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => setStep(3)} // placeholder — calendar connect handled in Settings
                      className="w-full flex items-center gap-4 bg-white border border-slate-200 rounded-2xl px-5 py-4 hover:border-teal-300 hover:shadow-sm transition-all group"
                    >
                      <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6 rounded" />
                      <div className="text-left">
                        <p className="font-semibold text-slate-700 text-sm">Google Calendar</p>
                        <p className="text-xs text-slate-400">Connect in Settings → Integrations</p>
                      </div>
                      <ArrowRight className="ml-auto w-4 h-4 text-slate-300 group-hover:text-teal-500 transition-colors" />
                    </button>

                    <button
                      className="w-full flex items-center gap-4 bg-white border border-slate-200 rounded-2xl px-5 py-4 hover:border-teal-300 hover:shadow-sm transition-all group"
                    >
                      <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">O</span>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-slate-700 text-sm">Outlook Calendar</p>
                        <p className="text-xs text-slate-400">Connect in Settings → Integrations</p>
                      </div>
                      <ArrowRight className="ml-auto w-4 h-4 text-slate-300 group-hover:text-teal-500 transition-colors" />
                    </button>
                  </div>

                  <Button
                    className="w-full bg-teal-600 hover:bg-teal-700 py-5 text-base rounded-xl"
                    onClick={handleFinish}
                    disabled={saving}
                  >
                    {saving ? (
                      <><span className="animate-spin mr-2">⟳</span> Setting up...</>
                    ) : (
                      <><Sparkles className="mr-2 w-4 h-4" /> Enter Homey</>
                    )}
                  </Button>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </BannerBg>
  );
}