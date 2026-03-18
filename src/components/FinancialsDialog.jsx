import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Building2, Check, ChevronDown, ChevronRight, Pencil, X } from 'lucide-react';

const CATEGORIES = [
  { key: 'checking_savings', label: 'Checking & Savings', keywords: ['checking', 'savings', 'money market', 'cd', 'certificate'] },
  { key: 'retirement', label: 'Retirement', keywords: ['401k', 'ira', 'roth', '403b', 'pension', 'retirement', 'sep'] },
  { key: 'brokerage', label: 'Brokerages', keywords: ['brokerage', 'investment', 'stock', 'etf', 'taxable', 'trading'] },
  { key: 'college', label: 'College / Education', keywords: ['529', 'education', 'college', 'coverdell'] },
  { key: 'crypto', label: 'Cryptocurrency', keywords: ['crypto', 'bitcoin', 'ethereum', 'coinbase', 'wallet', 'defi'] },
  { key: 'other', label: 'Other', keywords: [] },
];

function categorize(accountType) {
  const lower = (accountType || '').toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.key === 'other') continue;
    if (cat.keywords.some(k => lower.includes(k))) return cat.key;
  }
  return 'other';
}

export default function FinancialsDialog({ open, onClose, memberId, memberName, color = 'blue' }) {
  const queryClient = useQueryClient();
  const [bankName, setBankName] = useState('');
  const [accountType, setAccountType] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [editValues, setEditValues] = useState({ bank_name: '', account_type: '' });

  // Reset form when dialog opens
  useEffect(() => {
    if (open && memberId) {
      setSelectedMemberIds([memberId]);
      setBankName('');
      setAccountType('');
    }
  }, [open, memberId]);

  const toggleCategory = (key) => {
    setCollapsedCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Fetch all family members for multi-select
  const { data: familyMembers = [] } = useQuery({
    queryKey: ['familyMembers'],
    queryFn: () => base44.entities.FamilyMember.list(),
    enabled: open,
  });

  // Fetch accounts where this member is included
  const { data: allAccounts = [] } = useQuery({
    queryKey: ['financialAccounts', memberId],
    queryFn: () => base44.entities.FinancialAccount.list(),
    enabled: open && !!memberId,
  });

  // Filter to accounts that include this member (support both old and new schema)
  const accounts = allAccounts.filter(a =>
    (a.family_member_ids && a.family_member_ids.includes(memberId)) ||
    (a.family_member_id === memberId)
  );

  // Group accounts by category
  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat.key] = accounts.filter(a => categorize(a.account_type) === cat.key);
    return acc;
  }, {});

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FinancialAccount.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financialAccounts', memberId] });
      setBankName('');
      setAccountType('');
      setSelectedMemberIds(memberId ? [memberId] : []);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FinancialAccount.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financialAccounts', memberId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FinancialAccount.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financialAccounts', memberId] });
      setEditingAccountId(null);
    },
  });

  const startEdit = (account) => {
    setEditingAccountId(account.id);
    setEditValues({ bank_name: account.bank_name, account_type: account.account_type });
  };

  const saveEdit = (id) => {
    if (!editValues.bank_name.trim() || !editValues.account_type.trim()) return;
    updateMutation.mutate({ id, data: { bank_name: editValues.bank_name.trim(), account_type: editValues.account_type.trim() } });
  };

  const toggleMember = (id) => {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleAdd = () => {
    if (!bankName.trim() || !accountType.trim() || selectedMemberIds.length === 0) return;
    const names = familyMembers
      .filter(m => selectedMemberIds.includes(m.id))
      .map(m => m.name);
    createMutation.mutate({
      family_member_ids: selectedMemberIds,
      family_member_names: names,
      bank_name: bankName.trim(),
      account_type: accountType.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm max-h-[85vh] flex flex-col overflow-hidden top-4 translate-y-0">
        <DialogHeader>
          <DialogTitle>Financials — {memberName}</DialogTitle>
        </DialogHeader>

        {/* Add form */}
        <div className="space-y-2 flex-shrink-0">
          <Input
            placeholder="Bank name (e.g., Chase, Vanguard)"
            value={bankName}
            onChange={e => setBankName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && document.getElementById('acct-type-input')?.focus()}
          />
          <Input
            id="acct-type-input"
            placeholder="Account type (e.g., Checking, 529, Roth IRA)"
            value={accountType}
            onChange={e => setAccountType(e.target.value)}
            list="account-type-suggestions"
          />
          <datalist id="account-type-suggestions">
            <option value="Checking" />
            <option value="Savings" />
            <option value="Money Market" />
            <option value="CD" />
            <option value="Roth IRA" />
            <option value="Traditional IRA" />
            <option value="401k" />
            <option value="403b" />
            <option value="SEP IRA" />
            <option value="529 College Savings" />
            <option value="Brokerage" />
            <option value="Crypto Wallet" />
          </datalist>

          {/* Family member multi-select */}
          {familyMembers.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Members on this account</p>
              <div className="flex flex-wrap gap-1.5">
                {familyMembers.map(m => {
                  const selected = selectedMemberIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMember(m.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        selected
                          ? 'bg-gray-800 text-white border-gray-800'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {selected && <Check className="w-3 h-3" />}
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <Button
            size="sm"
            className="w-full"
            onClick={handleAdd}
            disabled={!bankName.trim() || !accountType.trim() || selectedMemberIds.length === 0}
          >
            <Plus className="w-4 h-4 mr-1" /> Add Account
          </Button>
        </div>

        {/* Account list grouped by category */}
        <div className="flex-1 overflow-y-auto mt-2 space-y-3">
          {accounts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No accounts added yet</p>
          ) : (
            CATEGORIES.map(cat => {
              const items = grouped[cat.key];
              if (!items || items.length === 0) return null;
              const collapsed = collapsedCategories[cat.key];
              return (
                <div key={cat.key}>
                  <button
                    onClick={() => toggleCategory(cat.key)}
                    className="flex items-center gap-1.5 w-full text-left mb-1 group"
                  >
                    {collapsed
                      ? <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    }
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cat.label}</span>
                    <span className="text-xs text-gray-400">({items.length})</span>
                  </button>
                  {!collapsed && (
                    <div className="space-y-1">
                      {items.map(account => (
                        <div key={account.id} className="rounded-lg border border-gray-100 bg-gray-50 overflow-hidden">
                          {editingAccountId === account.id ? (
                            <div className="p-2 space-y-1.5">
                              <Input
                                value={editValues.bank_name}
                                onChange={e => setEditValues(v => ({ ...v, bank_name: e.target.value }))}
                                placeholder="Bank name"
                                className="h-7 text-sm"
                              />
                              <Input
                                value={editValues.account_type}
                                onChange={e => setEditValues(v => ({ ...v, account_type: e.target.value }))}
                                placeholder="Account type"
                                className="h-7 text-sm"
                                list="account-type-suggestions"
                              />
                              <div className="flex gap-1">
                                <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => saveEdit(account.id)} disabled={updateMutation.isPending}>Save</Button>
                                <button onClick={() => setEditingAccountId(null)} className="p-1 rounded hover:bg-gray-200 transition-colors">
                                  <X className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => startEdit(account)}>
                              <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-800 truncate">{account.bank_name}</span>
                                <span className="text-xs text-gray-400 truncate">{account.account_type}</span>
                              </div>
                              <Pencil className="w-3 h-3 text-gray-300 flex-shrink-0" />
                              <button onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(account.id); }} className="p-1 rounded hover:bg-red-50 transition-colors flex-shrink-0">
                                <Trash2 className="w-3 h-3 text-red-400" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}