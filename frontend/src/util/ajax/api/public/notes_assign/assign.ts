import {ajax} from "ian-framework-fe";

export interface NotesAssignAssignRequest {
    tab: string;
    text: string;
}

export interface NotesAssignAssignResponse {
    chat: string;
}

export const notesAssignAssignAjax = (request: NotesAssignAssignRequest): Promise<NotesAssignAssignResponse> => ajax("/notes-assign", "POST", request);
