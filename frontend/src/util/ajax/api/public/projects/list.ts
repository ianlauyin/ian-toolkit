import { ajax } from "ian-framework-fe";

export interface ProjectsListResponse {
  id: string;
  name: string;
}

export const projectsListAjax = (): Promise<ProjectsListResponse[]> =>
  ajax<null, ProjectsListResponse[]>("/projects", "GET");
