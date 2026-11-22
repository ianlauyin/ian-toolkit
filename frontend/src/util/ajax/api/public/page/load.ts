import {ajax} from "ian-framework-fe";

export interface PageLoadRequest {
    name: string;
}

export type PageLoadResponse = Record<string, any> | null;

export const pageLoadAjax = (request: PageLoadRequest): Promise<PageLoadResponse> => ajax("/page", "GET", request);
