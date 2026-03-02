import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ShoppingCart } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";

const CATEGORIES = [
  { key: 'plumbing', label: 'Plumbing', emoji: '🔧' },
  { key: 'electrical', label: 'Electrical', emoji: '⚡' },
  { key: 'tools', label: 'Tools', emoji: '🔨' },
  { key: 'lumber', label: 'Lumber', emoji: '🪵' },
  { key: 'paint', label: 'Paint', emoji: '🎨' },
  { key: 'hardware', label: 'Hardware', emoji: '🔩' },
  { key: 'outdoor', label: 'Outdoor', emoji: '🌿' },
  { key: 'other', label: 'Other', emoji: '🛒' },
];

export default function HardwareList() {
  const queryClient = useQueryClient();
  const [showPurchased, setShowPurchased] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: '', quantity: '1' });
  const [expandedQtyId, setExpandedQtyId] = useState(null);

  const { data: items = [] } = useQuery({
    queryKey: ['hardwareItems'],
    queryFn: () => base44.entities.HardwareItem.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.HardwareItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['hardwareItems']);
      setNewItem({ name: '', category: '', quantity: '1' });
      setShowAddForm(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, purchased }) => base44.entities.HardwareItem.update(id, { purchased }),
    onSuccess: () => queryClient.invalidateQueries(['hardwareItems']),
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({ id, quantity }) => base44.entities.HardwareItem.update(id, { quantity }),
    onSuccess: () => queryClient.invalidateQueries(['hardwareItems']),
  });

  const [editingNames, setEditingNames] = useState({});

  const updateNameMutation = useMutation({
    mutationFn: ({ id, name }) => base44.entities.HardwareItem.update(id, { name }),
    onSuccess: () => queryClient.invalidateQueries(['hardwareItems']),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HardwareItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['hardwareItems']),
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      for (const item of items) {
        await base44.entities.HardwareItem.delete(item.id);
      }
    },
    onSuccess: () => queryClient.invalidateQueries(['hardwareItems']),
  });

  const handleAdd = () => {
    if (!newItem.name.trim()) return;
    createMutation.mutate({
      name: newItem.name.trim(),
      category: newItem.category || 'other',
      quantity: newItem.quantity || '1',
      purchased: false,
    });
  };

  const purchasedCount = items.filter(i => i.purchased).length;

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex gap-1.5">
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          size="sm"
          className="bg-gradient-to-r from-[#00D9A3] to-[#00B386] text-white"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
        {items.length > 0 && (
          <>
            <Button
              onClick={() => setShowPurchased(!showPurchased)}
              size="sm"
              variant="outline"
              className="flex-1 border-emerald-200 text-emerald-600 hover:bg-emerald-50 whitespace-nowrap text-xs"
            >
              {showPurchased ? 'Hide' : 'Show'} Purchased ({purchasedCount})
            </Button>
            <Button
              onClick={() => clearAllMutation.mutate()}
              disabled={clearAllMutation.isPending}
              size="sm"
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </>
        )}
      </div>

      {/* Add form */}
      {showAddForm && (
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="Item name"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
            <Select value={newItem.category || undefined} onValueChange={(v) => setNewItem({ ...newItem, category: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.key} value={c.key}>{c.emoji} {c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                onClick={handleAdd}
                disabled={!newItem.name.trim() || createMutation.isPending}
                className="flex-1 bg-gradient-to-r from-[#00D9A3] to-[#00B386] text-white"
              >
                Add Item
              </Button>
              <Button
                onClick={() => { setShowAddForm(false); setNewItem({ name: '', category: '', quantity: '1' }); }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {items.length === 0 ? (
        <Card className="bg-white border-0 shadow-sm p-12 text-center">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Hardware Shopping List</h3>
          <p className="text-gray-500">Add hardware items you need to buy</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {CATEGORIES.map(({ key, label, emoji }) => {
            const categoryItems = items.filter(item =>
              item.category === key && (showPurchased || !item.purchased)
            );
            if (categoryItems.length === 0) return null;

            return (
              <Card key={key} className="bg-white border-0 shadow-sm">
                <CardContent className="p-5">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="text-xl">{emoji}</span>
                    {label}
                  </h3>
                  <div className="space-y-2">
                    {categoryItems.map(item => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                          item.purchased ? 'bg-gray-100' : 'bg-white border-2 border-emerald-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.purchased || false}
                          onChange={(e) => toggleMutation.mutate({ id: item.id, purchased: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateNameMutation.mutate({ id: item.id, name: e.target.value })}
                            className={`text-sm font-medium bg-transparent border-none outline-none w-full focus:bg-white focus:px-2 focus:py-1 focus:rounded transition-all ${item.purchased ? 'line-through text-gray-400' : 'text-gray-900'}`}
                          />
                          {item.notes && (
                            <span className="text-xs text-gray-400">{item.notes}</span>
                          )}
                        </div>
                        {expandedQtyId === item.id ? (
                          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg">
                            <button
                              onClick={() => {
                                const qty = parseInt(item.quantity) || 1;
                                if (qty > 1) updateQuantityMutation.mutate({ id: item.id, quantity: (qty - 1).toString() });
                              }}
                              className="px-2 py-1 text-gray-500 hover:text-gray-900"
                            >
                              −
                            </button>
                            <span
                              className="w-8 text-center font-medium text-sm cursor-pointer"
                              onClick={() => setExpandedQtyId(null)}
                            >
                              {item.quantity || 1}
                            </span>
                            <button
                              onClick={() => {
                                const qty = parseInt(item.quantity) || 1;
                                updateQuantityMutation.mutate({ id: item.id, quantity: (qty + 1).toString() });
                              }}
                              className="px-2 py-1 text-gray-500 hover:text-gray-900"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => setExpandedQtyId(item.id)}
                            className="w-8 text-center font-medium text-sm cursor-pointer text-gray-700 hover:text-emerald-600"
                          >
                            {item.quantity || 1}
                          </span>
                        )}
                        <button
                          onClick={() => deleteMutation.mutate(item.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}