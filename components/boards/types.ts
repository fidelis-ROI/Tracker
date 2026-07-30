export interface KanbanCard {
  id: string;
  code: string;
  title: string;
  status: string;
  priority: string | null;
  order: number;
  dueDate: string | null;
  assignee: { id: string; name: string } | null;
  tag: { id: string; name: string; color: string } | null;
  counts: {
    subtasks: number;
    comments: number;
    attachments: number;
    checklistTotal: number;
    checklistDone: number;
  };
}

export interface BoardMeta {
  id: string;
  name: string;
  team: string | null;
  color: string;
  prefix: string;
  tags: { id: string; name: string; color: string }[];
}

export interface Collaborator {
  id: string;
  name: string;
  role: string;
}
