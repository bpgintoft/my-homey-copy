import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Shield, Bot, Calendar, FileText, ChevronDown, ChevronRight, CheckCircle2, XCircle, ExternalLink, Lock, Eye, Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function CollapsibleSection({ icon: Icon, title, badge, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="border border-gray-200 shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center">
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {badge}
          {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      {open && <CardContent className="pt-0 px-5 pb-5">{children}</CardContent>}
    </Card>
  );
}

function FactRow({ icon: Icon, iconColor, label, value, yes }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {value && <p className="text-xs text-gray-500 mt-0.5">{value}</p>}
      </div>
      {yes !== undefined && (
        yes
          ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
      )}
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();

  const isChild = user?.role === 'child' || user?.age_range === 'under_13' || user?.age_range === '13_17';

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">App preferences, privacy, and compliance information</p>
        </div>

        {/* Account Info */}
        {user && (
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#0AACFF] flex items-center justify-center text-white font-bold text-lg">
                  {user.full_name?.charAt(0) || user.email?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{user.full_name || 'Family Member'}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <Badge className={
                  user.role === 'admin' ? 'bg-gray-900 text-white' :
                  user.role === 'adult' ? 'bg-blue-100 text-blue-700' :
                  user.role === 'child' ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-600'
                }>
                  {user.role || 'user'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Privacy & AI Section */}
        <CollapsibleSection
          icon={Brain}
          title="Privacy & AI"
          badge={<Badge className="bg-green-100 text-green-700 text-xs">Compliant</Badge>}
          defaultOpen={true}
        >
          <div className="space-y-5 pt-1">

            {/* AI Usage */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">How AI is Used in My Homey</h4>
              <div className="rounded-xl border border-gray-100 bg-white divide-y divide-gray-100">
                <FactRow icon={Bot} iconColor="text-purple-500" label="Meal ideas & recipe suggestions" value="AI generates meal recommendations based on preferences you store in the app." yes={true} />
                <FactRow icon={Bot} iconColor="text-purple-500" label="Maintenance tips & how-to guidance" value="AI provides appliance-specific advice. No appliance serial numbers are sent." yes={true} />
                <FactRow icon={Bot} iconColor="text-purple-500" label="Kids activity suggestions" value="Age-appropriate activity ideas generated on demand." yes={true} />
                <FactRow icon={Bot} iconColor="text-purple-500" label="Document transcription" value="AI extracts text from historical home documents you upload." yes={true} />
              </div>
            </div>

            {/* PII Protections */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Your Data is Protected</h4>
              <div className="rounded-xl border border-gray-100 bg-white divide-y divide-gray-100">
                <FactRow icon={Shield} iconColor="text-green-500" label="PII is never sent to AI models" value="SSNs, passport numbers, insurance IDs, and all Documents & IDs fields are excluded from every AI call." yes={true} />
                <FactRow icon={Shield} iconColor="text-green-500" label="No model training on your data" value="AI queries are ephemeral. Base44's data processing agreements prohibit use of app data for training." yes={true} />
                <FactRow icon={Shield} iconColor="text-green-500" label="No behavioral profiling or advertising" value="My Homey contains no advertising SDKs and performs no user profiling." yes={true} />
                <FactRow icon={Lock} iconColor="text-blue-500" label="Documents & IDs stored in private encrypted storage" value="Scanned files are uploaded to Base44's private bucket and accessed only via time-limited signed URLs." yes={true} />
              </div>
            </div>

            {/* AI Provider */}
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">AI Provider</p>
              <p className="text-sm text-gray-700">
                AI features are powered by <strong>Base44's integrated LLM service</strong>. Base44's data processing agreements prohibit use of app data for third-party model training.
              </p>
            </div>

          </div>
        </CollapsibleSection>

        {/* Data & Storage */}
        <CollapsibleSection icon={FileText} title="Data & Storage">
          <div className="rounded-xl border border-gray-100 bg-white divide-y divide-gray-100">
            <FactRow icon={FileText} iconColor="text-blue-500" label="Family profiles, meals, maintenance records" value="Stored securely in Base44's cloud database. Not shared with third parties." />
            <FactRow icon={Lock} iconColor="text-gray-600" label="Documents & IDs (scans)" value="Stored in Base44 private encrypted storage. Never publicly accessible." />
            <FactRow icon={Eye} iconColor="text-gray-500" label="Local storage (session only)" value="Your Documents PIN session and layout preferences are stored locally on your device only. No PII in local storage." />
          </div>
        </CollapsibleSection>

        {/* Calendar & Permissions */}
        <CollapsibleSection icon={Calendar} title="Calendar & Permissions">
          <div className="space-y-3">
            <div className="rounded-xl border border-gray-100 bg-white divide-y divide-gray-100">
              <FactRow icon={Calendar} iconColor="text-blue-500" label="Google Calendar (optional)" value="Used only to sync maintenance tasks and chores you explicitly choose to add. Granted via Google OAuth consent screen." yes={true} />
              <FactRow icon={Shield} iconColor="text-green-500" label="Calendar access is user-initiated" value="My Homey never reads your calendar silently. You connect Google Calendar via the explicit OAuth flow." yes={true} />
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Third-Party Services</p>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <span>Base44 (platform & database)</span>
                  <a href="https://base44.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 flex items-center gap-1 text-xs hover:underline">
                    Privacy Policy <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span>Google Calendar (optional sync)</span>
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 flex items-center gap-1 text-xs hover:underline">
                    Privacy Policy <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span>Google Maps (address autocomplete)</span>
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 flex items-center gap-1 text-xs hover:underline">
                    Privacy Policy <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* iOS 26 / Child Safety */}
        {(user?.role === 'admin' || user?.role === 'adult') && (
          <CollapsibleSection
            icon={Shield}
            title="Child Safety & Age Compliance"
            badge={<Badge className="bg-blue-100 text-blue-700 text-xs">iOS 26 Ready</Badge>}
          >
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-100 bg-white divide-y divide-gray-100">
                <FactRow icon={Shield} iconColor="text-blue-500" label="Age-aware roles" value="Users tagged as 'child' role are automatically restricted from Decisions, Documents & IDs, and financial sections." yes={true} />
                <FactRow icon={Shield} iconColor="text-blue-500" label="iOS 26 Declared Age Range hook" value="The User entity tracks age_range and parental_consent_status fields, ready for the iOS 26 Age Assurance API." yes={true} />
                <FactRow icon={Bot} iconColor="text-green-500" label="No AI for child users" value="AI-generated content features are not triggered for users tagged with child roles." yes={true} />
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Note for App Store Submission</p>
                <p className="text-sm text-amber-800">
                  When submitting to the App Store, declare that the app is designed for families. Set the age rating to 4+ with family sharing enabled. The native iOS parental consent prompt will be triggered by the platform for users under 13.
                </p>
              </div>
            </div>
          </CollapsibleSection>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">My Homey · Privacy documentation last updated March 2026</p>
      </div>
    </div>
  );
}