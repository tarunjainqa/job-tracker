import { useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import Column from './Column.jsx';
import JobCard from './JobCard.jsx';
import { COLUMNS } from '../constants.js';

export default function Board({ jobs, onEdit, onDelete, onMove }) {
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const jobsByColumn = useMemo(() => {
    const map = {};
    COLUMNS.forEach((c) => (map[c.id] = []));
    jobs.forEach((job) => {
      if (!map[job.status]) map[job.status] = [];
      map[job.status].push(job);
    });
    return map;
  }, [jobs]);

  const activeJob = jobs.find((j) => j.id === activeId);
  const activeColumn = COLUMNS.find((c) => c.id === activeJob?.status);

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const job = jobs.find((j) => j.id === active.id);
    const newStatus = over.id;
    if (job && job.status !== newStatus) {
      onMove(job.id, newStatus);
    }
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-full gap-4 overflow-x-auto px-4 py-4 sm:px-6">
        {COLUMNS.map((column) => (
          <Column
            key={column.id}
            column={column}
            jobs={jobsByColumn[column.id] || []}
            onEdit={onEdit}
            onDelete={onDelete}
            onMove={onMove}
          />
        ))}
      </div>

      <DragOverlay>
        {activeJob ? (
          <div className="w-72 rotate-2 opacity-95">
            <JobCard job={activeJob} accent={activeColumn?.accent} onEdit={() => {}} onDelete={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
