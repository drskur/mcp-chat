"use server";

import {getServerConfig} from "@/lib/config";
import type {Config} from "@/lib/config";

export async function getConfig(): Promise<Config> {
    const config = getServerConfig();
    return config.getAll();
}