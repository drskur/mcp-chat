import {action, query, revalidate} from "@solidjs/router";
import {getServerConfig, type ModelConfig} from "@/lib/config";

export const getConfigQuery = query(async () => {
    "use server";
    const config = getServerConfig();
    return config.getAll();
}, "config");

export const setModelConfigAction = action(async (k: keyof ModelConfig, v: ModelConfig[keyof ModelConfig]) => {
    "use server";

    const config = getServerConfig();
    await config.setModelConfigItem(k, v);

    return revalidate("config");
});