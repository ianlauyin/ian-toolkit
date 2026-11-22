import {ajax} from "ian-framework-fe";

export interface PageSaveRequest {
    name: string;
    data: Record<string, any>;
}

export const pageSaveAjax = (request: PageSaveRequest): Promise<null> => ajax("/page", "PUT", request);
