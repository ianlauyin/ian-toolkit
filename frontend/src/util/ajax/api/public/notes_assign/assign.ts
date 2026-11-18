import { ajax } from "ian-framework-fe";

export interface NotesAssignAssignRequest {
  tab: string;
  text: string;
}

export interface NotesAssignAssignResponse {
  chat: string;
}

export const notesAssignAssignAjax = (request: NotesAssignAssignRequest): Promise<NotesAssignAssignResponse> =>
  ajax<NotesAssignAssignRequest, NotesAssignAssignResponse>("/notes-assign", "POST", request);
