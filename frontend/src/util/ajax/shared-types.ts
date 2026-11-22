export interface ProgressStep {
    kind: string;
    text: string;
}

export interface ProgressResponse {
    status: string;
    steps: ProgressStep[];
    error?: string;
}
