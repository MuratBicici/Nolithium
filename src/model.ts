export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailyTask { id: string; text: string; done: boolean; date: string }
export interface Workspace { notes: Note[]; tasks: DailyTask[] }
export const STORAGE_KEY = 'nolithium.workspace.v1';

export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseTags(value: string): string[] {
  return [...new Set(value.split(',').map(tag => tag.trim().replace(/^#/, '').toLowerCase()).filter(Boolean))].slice(0, 8);
}

export function selectNotes(notes: Note[], query: string, view: string, sort: string): Note[] {
  const term = query.trim().toLowerCase();
  return notes.filter(note => (view !== 'pinned' || note.isPinned)
    && (!view.startsWith('tag:') || note.tags.includes(view.slice(4)))
    && `${note.title} ${note.content} ${note.tags.join(' ')}`.toLowerCase().includes(term))
    .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || (sort === 'title'
      ? a.title.localeCompare(b.title) : b.updatedAt.localeCompare(a.updatedAt)));
}

export function decodeWorkspace(raw: string): Workspace {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || !('notes' in value) || !('tasks' in value)) throw new Error('Invalid workspace');
  const { notes, tasks } = value;
  if (!Array.isArray(notes) || !Array.isArray(tasks)) throw new Error('Invalid workspace');
  const isString = (v: unknown): v is string => typeof v === 'string';
  if (!notes.every(n => n && isString(n.id) && isString(n.title) && isString(n.content) && Array.isArray(n.tags)
    && n.tags.every(isString) && typeof n.isPinned === 'boolean' && isString(n.createdAt) && isString(n.updatedAt)
    && Number.isFinite(Date.parse(n.createdAt)) && Number.isFinite(Date.parse(n.updatedAt)))) throw new Error('Invalid notes');
  if (!tasks.every(t => t && isString(t.id) && isString(t.text) && typeof t.done === 'boolean' && isString(t.date))) throw new Error('Invalid tasks');
  if (new Set(notes.map(n => n.id)).size !== notes.length || new Set(tasks.map(t => t.id)).size !== tasks.length) throw new Error('Duplicate IDs');
  return { notes, tasks };
}

export function initialWorkspace(): Workspace {
  const now = new Date();
  const entries = [
    { title: 'Start here', content: 'Use Ctrl + N to capture a note.\nUse Ctrl + K to search.\nUse Alt + P to open the planner.', tags: ['getting started'], isPinned: true },
    { title: 'Today', content: 'Add your priorities in the planner. Keep the list short and actionable.', tags: ['personal'], isPinned: true },
    { title: 'Project ideas', content: '• Digital garden\n• Photo journal\n• Desktop utility', tags: ['ideas', 'creative'], isPinned: false },
    { title: 'Reference', content: 'Store links, quotes, and details that need to be available later.', tags: ['inspiration'], isPinned: false },
    { title: 'Weekly review', content: 'Review completed work.\nSet next priorities.\nArchive what is no longer useful.', tags: ['personal', 'ideas'], isPinned: false },
    { title: 'Design checklist', content: '• Clear hierarchy\n• Fast feedback\n• Useful defaults', tags: ['creative'], isPinned: false },
  ];
  return {
    notes: entries.map((entry, i) => ({ ...entry, id: `welcome-${i}`, createdAt: new Date(+now - i * 3600000).toISOString(), updatedAt: new Date(+now - i * 3600000).toISOString() })),
    tasks: [],
  };
}
