import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface DragTargetAreaProps {
  onDropItems: (items: any[]) => void;
  children: React.ReactNode;
  className?: string;
}

const DragTargetArea: React.FC<DragTargetAreaProps> = ({
  onDropItems,
  children,
  className = ''
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    
    try {
      const items = Array.from(e.dataTransfer.files);
      onDropItems(items);
      
      toast.success(`Added ${items.length} item${items.length > 1 ? 's' : ''} to quick actions`);
      
      // Analytics event
      console.log('quick_drag_drop', { 
        itemCount: items.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      toast.error('Failed to process dropped items');
    }
  }, [onDropItems]);

  return (
    <div 
      className={`${className} ${isDraggingOver ? 'bg-accent/50 border-2 border-dashed border-primary' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {isDraggingOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-accent/80 rounded-lg">
          <p className="text-sm font-medium text-foreground">Drop to add to quick actions</p>
        </div>
      )}
    </div>
  );
};

export default DragTargetArea;