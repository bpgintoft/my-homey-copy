import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Building2, Check } from 'lucide-react';

export default function FinancialsDialog({ open, onClose, memberId, memberName, color = 'blue' }) {
  const queryClient = useQueryClient();
  const [bankName, setBankName] = useState('');
  const [accountType, setAccountType] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  const bgMap = {
    blue: 'bg-blue-50 border-blue-100',
    green: 'bg-green-50 border-green-100',
    pink: 'bg-pink-50 border-pink-100',
    purple: 'bg-purple-50 border-purple-100',
    orange: 'bg-orange-50 border-orange-100',
  };
  const itemBg = bgMap[color] || bgMap.blue;

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
          />

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

        {/* Account list */}
        <div className="flex-1 overflow-y-auto mt-2 space-y-2">
          {accounts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No accounts added yet</p>
          ) : (
            accounts.map(account => {
              const names = account.family_member_names?.join(', ') || account.family_member_name || '';
              return (
                <div key={account.id} className={`flex items-center gap-3 p-3 rounded-lg border ${itemBg}`}>
                  <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{account.bank_name}</p>
                    <p className="text-xs text-gray-500">{account.account_type}</p>
                    {names && <p className="text-xs text-gray-400 mt-0.5">{names}</p>}
                  </div>
                  <button onClick={() => deleteMutation.mutate(account.id)} className="p-1 rounded hover:bg-red-50 transition-colors flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}