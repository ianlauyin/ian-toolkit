import {ajax} from "ian-framework-fe";

export interface PageSaveRequest {
    name: string;
    data: Record<string, any>;
}

export function pageSaveAjax(request: PageSaveRequest): Promise<null> {
    return ajax("/page", "PUT", request);
}
