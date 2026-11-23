import {ajax} from "ian-framework-fe";

export interface ProjectsListResponse {
    id: string;
    name: string;
}

export function projectsListAjax(): Promise<ProjectsListResponse[]> {
    return ajax("/projects", "GET");
}
