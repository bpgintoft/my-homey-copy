import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const DEFAULT_CATEGORIES = [
  { id: 'short-term', name: 'Short-term', order: 0 },
  { id: 'mid-term', name: 'Mid-term', order: 1 },
  { id: 'long-term', name: 'Long-term', order: 2 },
  { id: 'next-year', name: 'Next Year', order: 3 },
];

export default function ChoreTimingCustomizer({ open, onOpenChange, categories, onSave, memberName }) {
  const [localCategories, setLocalCategories] = useState(categories || DEFAULT_CATEGORIES);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    setLocalCategories(categories || DEFAULT_CATEGORIES);
  }, [categories, open]);

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newId = `cat-${Date.now()}`;
    const newCategory = {
      id: newId,
      name: newCategoryName,
      order: Math.max(...localCategories.map(c => c.order), -1) + 1,
    };
    setLocalCategories([...localCategories, newCategory]);
    setNewCategoryName('');
  };

  const handleRemoveCategory = (id) => {
    setLocalCategories(localCategories.filter(c => c.id !== id));
  };

  const handleRenameCategory = (id, newName) => {
    setLocalCategories(localCategories.map(c => c.id === id ? { ...c, name: newName } : c));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(localCategories);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setLocalCategories(items.map((c, idx) => ({ ...c, order: idx })));
  };

  const handleSave = () => {
    onSave(localCategories);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
         <DialogHeader>
           <DialogTitle className="pr-6">Customize To-Do Categories for {memberName}</DialogTitle>
         </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Add, remove, or rename categories for chore timing:</p>
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="categories-list">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-2 min-h-[120px] rounded-lg p-2 border-2 transition-colors ${
                    snapshot.isDraggingOver ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  {localCategories.map((category, index) => (
                    <Draggable key={category.id} draggableId={category.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center gap-2 p-2 bg-white border rounded transition-all ${
                            snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-300' : 'border-gray-200'
                          }`}
                        >
                          <div {...provided.dragHandleProps} className="flex-shrink-0 text-gray-400">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <Input
                            value={category.name}
                            onChange={(e) => handleRenameCategory(category.id, e.target.value)}
                            className="flex-1 text-sm h-8"
                          />
                          {localCategories.length > 1 && (
                            <button
                              onClick={() => handleRemoveCategory(category.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                              title="Delete category"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <div className="flex gap-2">
            <Input
              placeholder="New category name..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCategory();
              }}
              className="text-sm h-9"
            />
            <Button
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim()}
              size="sm"
              className="px-3"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}