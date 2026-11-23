import {ajax} from "ian-framework-fe";

import type {ProgressResponse} from "../../../shared-types";

export interface OpenBehaviourFollowupFollowupRequest {
    chat: string;
    text: string;
}

export function openBehaviourFollowupFollowupAjax(request: OpenBehaviourFollowupFollowupRequest): Promise<ProgressResponse> {
    return ajax("/open-behaviour-followup", "POST", request);
}
