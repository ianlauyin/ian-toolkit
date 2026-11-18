import { ajax } from "ian-framework-fe";

import type { ProgressResponse } from "../../../shared-types";

export interface OpenBehaviourFollowupFollowupRequest {
  chat: string;
  text: string;
}

export const openBehaviourFollowupFollowupAjax = (
  request: OpenBehaviourFollowupFollowupRequest,
): Promise<ProgressResponse> =>
  ajax<OpenBehaviourFollowupFollowupRequest, ProgressResponse>(
    "/open-behaviour-followup",
    "POST",
    request,
  );
