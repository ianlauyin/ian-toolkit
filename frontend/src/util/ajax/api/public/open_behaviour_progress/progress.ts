import { ajax } from "ian-framework-fe";

import type { ProgressResponse } from "../../../shared-types";

export interface OpenBehaviourProgressProgressRequest {
  chat: string;
}

export const openBehaviourProgressProgressAjax = (
  request: OpenBehaviourProgressProgressRequest,
): Promise<ProgressResponse> =>
  ajax<OpenBehaviourProgressProgressRequest, ProgressResponse>("/open-behaviour-progress", "GET", request);
