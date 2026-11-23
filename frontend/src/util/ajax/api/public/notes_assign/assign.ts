import {ajax} from "ian-framework-fe";

export interface NotesAssignAssignRequest {
    tab: string;
    text: string;
}

export interface NotesAssignAssignResponse {
    chat: string;
}

export function notesAssignAssignAjax(request: NotesAssignAssignRequest): Promise<NotesAssignAssignResponse> {
    return ajax("/notes-assign", "POST", request);
}
