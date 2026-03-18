import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Building2 } from 'lucide-react';

export default function FinancialsDialog({ open, onClose, memberId, memberName, color = 'blue' }) {
  const queryClient = useQueryClient();
  const [bankName, setBankName] = useState('');
  const [accountType, setAccountType] = useState('');

  const bgMap = {
    blue: 'bg-blue-50 border-blue-100',
    green: 'bg-green-50 border-green-100',
    pink: 'bg-pink-50 border-pink-100',
    purple: 'bg-purple-50 border-purple-100',
    orange: 'bg-orange-50 border-orange-100',
  };
  const itemBg = bgMap[color] || bgMap.blue;

  const { data: accounts = [] } = useQuery({
    queryKey: ['financialAccounts', memberId],
    queryFn: () => base44.entities.FinancialAccount.filter({ family_member_id: memberId }),
    enabled: open && !!memberId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FinancialAccount.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['financialAccounts', memberId]);
      setBankName('');
      setAccountType('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FinancialAccount.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['financialAccounts', memberId]),
  });

  const handleAdd = () => {
    if (!bankName.trim() || !accountType.trim()) return;
    createMutation.mutate({ family_member_id: memberId, family_member_name: memberName, bank_name: bankName.trim(), account_type: accountType.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm max-h-[80vh] flex flex-col overflow-hidden top-4 translate-y-0">
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
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <Button size="sm" className="w-full" onClick={handleAdd} disabled={!bankName.trim() || !accountType.trim()}>
            <Plus className="w-4 h-4 mr-1" /> Add Account
          </Button>
        </div>

        {/* Account list */}
        <div className="flex-1 overflow-y-auto mt-2 space-y-2">
          {accounts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No accounts added yet</p>
          ) : (
            accounts.map(account => (
              <div key={account.id} className={`flex items-center gap-3 p-3 rounded-lg border ${itemBg}`}>
                <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{account.bank_name}</p>
                  <p className="text-xs text-gray-500">{account.account_type}</p>
                </div>
                <button onClick={() => deleteMutation.mutate(account.id)} className="p-1 rounded hover:bg-red-50 transition-colors flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}