export interface NoteRef {
  id: string;
}

export const assignKey = (tab: string, note: NoteRef): string => `${tab}/${note.id}`;
