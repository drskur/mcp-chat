import {query} from "@solidjs/router";
import {getServerConfig} from "@/lib/config";

export const getConfigQuery = query(async () => {
    "use server";
    const config = getServerConfig();
    return config.getAll();
}, "config");