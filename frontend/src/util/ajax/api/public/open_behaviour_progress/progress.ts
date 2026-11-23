import {ajax} from "ian-framework-fe";

import type {ProgressResponse} from "../../../shared-types";

export interface OpenBehaviourProgressProgressRequest {
    chat: string;
}

export function openBehaviourProgressProgressAjax(request: OpenBehaviourProgressProgressRequest): Promise<ProgressResponse> {
    return ajax("/open-behaviour-progress", "GET", request);
}
