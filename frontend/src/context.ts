import {VersionChecker} from "ian-framework-fe";

import type {AppContextValue} from "./types";

export const createApp = (): AppContextValue => {
    const start = () => {
        VersionChecker.init({onUpdated: () => void VersionChecker.reload()});
    };
    return {start};
};
