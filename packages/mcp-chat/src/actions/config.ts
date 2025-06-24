import {action} from "@solidjs/router";
import {getServerConfig} from "@/lib/config";
import type {Config} from "@/lib/config";
import {Theme} from "@/types/config";

export async function getConfigQuery(): Promise<Config> {
    "use server";
    const config = getServerConfig();
    return config.getAll();
}

// 테마 설정 읽기
export async function getThemeQuery(): Promise<Theme> {
    "use server";
    try {
        const config = getServerConfig();
        return config.getTheme();
    } catch (e) {
        return "light"; // 기본값
    }
}

// 테마 설정 저장
export const setThemeAction = action(async (theme: Theme) => {
    "use server";
    try {
        const config = getServerConfig();
        config.setTheme(theme);
        return {success: true};
    } catch (e) {
        return {success: false, error: String(e)};
    }
});