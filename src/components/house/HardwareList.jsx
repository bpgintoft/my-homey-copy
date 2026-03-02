import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Eye, EyeOff, ShoppingCart } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

const CATEGORIES = ["plumbing", "electrical", "tools", "lumber", "paint", "hardware", "outdoor", "other"];

export default function HardwareList() {
  const queryClient = useQueryClient();
  const [showPurchased, setShowPurchased] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: '', quantity: '' });

  const { data: items = [] } = useQuery({
    queryKey: ['hardwareItems'],
    queryFn: () => base44.entities.HardwareItem.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.HardwareItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['hardwareItems']);
      setNewItem({ name: '', category: '', quantity: '' });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, purchased }) => base44.entities.HardwareItem.update(id, { purchased }),
    onSuccess: () => queryClient.invalidateQueries(['hardwareItems']),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HardwareItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['hardwareItems']),
  });

  const handleAdd = () => {
    if (!newItem.name.trim()) return;
    createMutation.mutate({
      name: newItem.name.trim(),
      category: newItem.category || 'other',
      quantity: newItem.quantity.trim(),
      purchased: false,
    });
  };

  const visibleItems = showPurchased ? items : items.filter(i => !i.purchased);
  const purchasedCount = items.filter(i => i.purchased).length;

  const byCategory = visibleItems.reduce((acc, item) => {
    const cat = item.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Hardware Shopping List</h2>
        {purchasedCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPurchased(!showPurchased)}
            className="text-gray-600 gap-2"
          >
            {showPurchased ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPurchased ? 'Hide' : 'Show'} purchased ({purchasedCount})
          </Button>
        )}
      </div>

      {/* Add item row */}
      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
        <Input
          placeholder="Item name"
          value={newItem.name}
          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 min-w-0"
        />
        <Input
          placeholder="Qty (optional)"
          value={newItem.quantity}
          onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
          className="w-32 flex-shrink-0"
        />
        <Select value={newItem.category} onValueChange={(v) => setNewItem({ ...newItem, category: v })}>
          <SelectTrigger className="w-36 flex-shrink-0">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => (
              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={handleAdd}
          disabled={!newItem.name.trim()}
          className="bg-gradient-to-r from-[#00D9A3] to-[#00B386] text-white flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* List */}
      {visibleItems.length === 0 ? (
        <Card className="bg-white border-0 shadow-sm p-12 text-center">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {items.length === 0 ? 'No items yet' : 'All items purchased!'}
          </h3>
          <p className="text-gray-500">
            {items.length === 0 ? 'Add hardware items you need to buy' : 'Toggle "Show purchased" to see them'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(byCategory).map(([category, catItems]) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2 capitalize">{category}</h4>
              <div className="space-y-2">
                {catItems.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg bg-white shadow-sm transition-opacity ${item.purchased ? 'opacity-50' : ''}`}
                  >
                    <Checkbox
                      checked={item.purchased}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: item.id, purchased: !!checked })}
                    />
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${item.purchased ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {item.name}
                      </span>
                      {item.quantity && (
                        <span className="text-xs text-gray-400 ml-2">({item.quantity})</span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(item.id)}
                      className="p-1 rounded hover:bg-red-50 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}