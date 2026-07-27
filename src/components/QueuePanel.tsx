import React from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Music2, ListX } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { getHighestQualityImage } from '../services/jiosaavnApi';
import { Button } from './ui/button';

interface SortableRowProps {
  id: string;
  index: number;
  isPlaying: boolean;
}

const SortableRow: React.FC<SortableRowProps> = ({ id, index, isPlaying }) => {
  const { queue, removeFromQueue, playSong, queueIndex } = useMusic();
  const song = queue[index];

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getImage = () => {
    if (!song.image) return null;
    if (typeof song.image === 'string') return song.image;
    if (Array.isArray(song.image)) {
      const first = song.image[0];
      if (typeof first === 'string') return first;
      if (typeof first === 'object' && 'link' in first) {
        return getHighestQualityImage(song.image as Array<{ quality?: string; link: string }>);
      }
    }
    return null;
  };

  const isCurrent = index === queueIndex;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg group transition-colors ${
        isCurrent ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'
      }`}
    >
      {/* Drag handle */}
      <button
        className="text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Album art */}
      <div
        className="w-10 h-10 rounded overflow-hidden shrink-0 cursor-pointer"
        onClick={() => playSong(song)}
      >
        {getImage() ? (
          <img src={getImage()!} alt={song.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Music2 className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Song info */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => playSong(song)}>
        <p className={`text-sm font-medium truncate ${isCurrent ? 'text-primary' : 'text-foreground'}`}>
          {song.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">{song.primaryArtists}</p>
      </div>

      {/* Remove button */}
      <button
        className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-colors shrink-0"
        onClick={() => removeFromQueue(index)}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

const QueuePanel: React.FC = () => {
  const { queue, queueIndex, setQueue, reorderQueue, currentSong } = useMusic();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = queue.findIndex((_, i) => `queue-${i}` === active.id);
    const toIndex   = queue.findIndex((_, i) => `queue-${i}` === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      reorderQueue(fromIndex, toIndex);
    }
  };

  const upcomingSongs = queue.slice(queueIndex + 1);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <span className="text-sm font-semibold text-foreground">
          Up Next
          {upcomingSongs.length > 0 && (
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              {upcomingSongs.length} song{upcomingSongs.length !== 1 ? 's' : ''}
            </span>
          )}
        </span>
        {queue.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => setQueue([])}
          >
            <ListX className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2 px-2">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-16">
            <Music2 className="w-10 h-10 opacity-30" />
            <p className="text-sm">Queue is empty</p>
          </div>
        ) : (
          <>
            {/* Now Playing */}
            {currentSong && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
                  Now Playing
                </p>
                <SortableRow
                  key={`queue-${queueIndex}`}
                  id={`queue-${queueIndex}`}
                  index={queueIndex}
                  isPlaying={true}
                />
              </div>
            )}

            {/* Upcoming */}
            {upcomingSongs.length > 0 && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
                  Next Up
                </p>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext
                    items={queue.slice(queueIndex + 1).map((_, i) => `queue-${queueIndex + 1 + i}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {queue.slice(queueIndex + 1).map((_, i) => {
                      const actualIndex = queueIndex + 1 + i;
                      return (
                        <SortableRow
                          key={`queue-${actualIndex}`}
                          id={`queue-${actualIndex}`}
                          index={actualIndex}
                          isPlaying={false}
                        />
                      );
                    })}
                  </SortableContext>
                </DndContext>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default QueuePanel;
