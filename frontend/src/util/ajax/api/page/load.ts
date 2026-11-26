import {ajax} from "ian-framework-fe";

export interface PageLoadRequest {
    name: string;
}

export type PageLoadResponse = Record<string, any> | null;

export function pageLoadAjax(request: PageLoadRequest): Promise<PageLoadResponse> {
    return ajax("/page", "GET", request);
}
