import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ShoppingCart } from 'lucide-react';

const CATEGORIES = [
  { key: 'produce', label: 'Produce', emoji: '🥬' },
  { key: 'meat_seafood', label: 'Meat & Seafood', emoji: '🥩' },
  { key: 'dairy_eggs', label: 'Dairy & Eggs', emoji: '🥛' },
  { key: 'bakery', label: 'Bakery', emoji: '🥖' },
  { key: 'pantry', label: 'Pantry & Dry Goods', emoji: '🥫' },
  { key: 'frozen', label: 'Frozen Foods', emoji: '❄️' },
  { key: 'beverages', label: 'Beverages', emoji: '🥤' },
  { key: 'deli', label: 'Deli', emoji: '🧀' },
  { key: 'other', label: 'Other', emoji: '🛒' },
];

export default function GroceryTabContent({
  groceries,
  showHiddenItems, setShowHiddenItems,
  showAddGrocery, setShowAddGrocery,
  newGroceryItem, setNewGroceryItem,
  addManualGroceryMutation,
  clearAllGroceriesMutation,
  togglePurchasedMutation,
  updateGroceryNameMutation,
  updateGroceryQuantityMutation,
  deleteGroceryItemMutation,
  focusedGroceryId, setFocusedGroceryId,
  editingGroceryNames, setEditingGroceryNames,
  expandedQtyId, setExpandedQtyId,
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        <Button onClick={() => setShowAddGrocery(!showAddGrocery)} size="sm" className="bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white">
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
        {groceries.length > 0 && (
          <>
            <Button onClick={() => setShowHiddenItems(!showHiddenItems)} size="sm" variant="outline" className="flex-1 border-pink-200 text-pink-600 hover:bg-pink-50 whitespace-nowrap text-xs">
              {showHiddenItems ? 'Hide' : 'Show'} Hidden Items
            </Button>
            <Button onClick={() => clearAllGroceriesMutation.mutate()} disabled={clearAllGroceriesMutation.isPending} size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-1" /> Clear
            </Button>
          </>
        )}
      </div>

      {showAddGrocery && (
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="space-y-3">
              <Input placeholder="Item name" value={newGroceryItem.name} onChange={(e) => setNewGroceryItem({ ...newGroceryItem, name: e.target.value })} />
              <Select value={newGroceryItem.category} onValueChange={(value) => setNewGroceryItem({ ...newGroceryItem, category: value })}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.emoji} {c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button onClick={() => addManualGroceryMutation.mutate(newGroceryItem)} disabled={!newGroceryItem.name || addManualGroceryMutation.isPending} className="flex-1 bg-gradient-to-r from-[#E91E8C] to-[#D01576] text-white">Add</Button>
                <Button onClick={() => { setShowAddGrocery(false); setNewGroceryItem({ name: '', category: 'other' }); }} variant="outline">Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {groceries.length === 0 ? (
        <Card className="bg-white border-0 shadow-sm p-8 text-center">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Grocery List</h3>
          <p className="text-gray-500">No items yet - add ingredients from your meal plan</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {CATEGORIES.map(({ key, label, emoji }) => {
            const categoryItems = groceries.filter(item => item.category === key && (showHiddenItems || !item.purchased));
            if (categoryItems.length === 0) return null;
            return (
              <Card key={key} className="bg-white border-0 shadow-sm">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">{emoji}</span>{label}
                  </h3>
                  <div className="space-y-1.5">
                    {categoryItems.map((item) => (
                      <div key={item.id} className={`flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all ${item.purchased ? 'bg-gray-100' : 'bg-white border-2 border-pink-200'}`}>
                        <input type="checkbox" checked={item.purchased || false} onChange={(e) => togglePurchasedMutation.mutate({ id: item.id, purchased: e.target.checked })} className="w-5 h-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500 cursor-pointer flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          {focusedGroceryId === item.id ? (
                            <textarea
                              autoFocus
                              value={editingGroceryNames[item.id] !== undefined ? editingGroceryNames[item.id] : item.name}
                              onChange={(e) => {
                                setEditingGroceryNames(prev => ({ ...prev, [item.id]: e.target.value }));
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                              }}
                              onBlur={(e) => {
                                setFocusedGroceryId(null);
                                const newName = e.target.value.trim();
                                if (newName && newName !== item.name) updateGroceryNameMutation.mutate({ id: item.id, name: newName });
                                setEditingGroceryNames(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                              }}
                              rows={2}
                              style={{ fontSize: '16px', resize: 'none', whiteSpace: 'pre-wrap', overflow: 'hidden', minHeight: '50px' }}
                              className={`font-medium bg-white border border-pink-300 rounded px-2 py-1 outline-none w-full ${item.purchased ? 'line-through text-gray-400' : 'text-gray-900'}`}
                            />
                          ) : (
                            <p onClick={() => setFocusedGroceryId(item.id)} className={`font-medium cursor-text leading-snug break-words ${item.purchased ? 'line-through text-gray-400' : 'text-gray-900'}`} style={{ fontSize: '16px' }}>
                              {item.name}
                            </p>
                          )}
                        </div>
                        {focusedGroceryId !== item.id && (
                          <div className="flex items-center gap-1">
                            {expandedQtyId === item.id ? (
                              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg">
                                <button onClick={() => { const qty = parseInt(item.quantity) || 1; if (qty > 1) updateGroceryQuantityMutation.mutate({ id: item.id, quantity: qty - 1 }); }} disabled={updateGroceryQuantityMutation.isPending} className="px-2 py-1 text-gray-500 hover:text-gray-900">−</button>
                                <button onClick={() => setExpandedQtyId(null)} className="w-8 text-center font-medium text-sm py-1">{item.quantity || 1}</button>
                                <button onClick={() => { const qty = parseInt(item.quantity) || 1; updateGroceryQuantityMutation.mutate({ id: item.id, quantity: qty + 1 }); }} disabled={updateGroceryQuantityMutation.isPending} className="px-2 py-1 text-gray-500 hover:text-gray-900">+</button>
                              </div>
                            ) : (
                              <button onClick={() => setExpandedQtyId(item.id)} className="w-8 text-center font-medium text-sm py-1 px-1 rounded bg-white border border-gray-200">{item.quantity || 1}</button>
                            )}
                          </div>
                        )}
                        {focusedGroceryId === item.id ? (
                          <button onMouseDown={(e) => {
                            e.preventDefault();
                            const newName = (editingGroceryNames[item.id] ?? item.name).trim();
                            if (newName && newName !== item.name) updateGroceryNameMutation.mutate({ id: item.id, name: newName });
                            setEditingGroceryNames(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                            setFocusedGroceryId(null);
                          }} className="text-green-500 hover:text-green-700 transition-colors p-1 flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          </button>
                        ) : (
                          <button onClick={() => deleteGroceryItemMutation.mutate(item.id)} disabled={deleteGroceryItemMutation.isPending} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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