import type {Component} from "solid-js";
import {useTheme} from "@/components/layout/theme";
import type {Theme} from "@/types/config";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

const GeneralSettings: Component = () => {
    const {theme, saveTheme} = useTheme();

    return (
        <div class="space-y-6">
            <div>
                <h2 class="text-xl font-semibold mb-4">일반</h2>
                <div class="space-y-4">
                    <div class="rounded-lg p-4">
                        <div class="flex items-center justify-between">
                            <div class="text-sm font-medium">테마</div>
                            <Select
                                value={theme()}
                                onChange={(value) => saveTheme(value as Theme)}
                                options={["light", "dark"]}
                                itemComponent={(props) => (
                                    <SelectItem item={props.item}>
                                        {props.item.rawValue === "light" ? "Light" : "Dark"}
                                    </SelectItem>
                                )}
                            >
                                <SelectTrigger class="w-[180px]">
                                    <SelectValue<string>>
                                        {(state) => state.selectedOption() === "light" ? "Light" : "Dark"}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent />
                            </Select>
                        </div>
                    </div>

                    {/*<div class="rounded-lg border border-border p-4">*/}
                    {/*    <label class="text-sm font-medium mb-2 block">언어</label>*/}
                    {/*    <select class="w-full p-2 rounded-md border border-input bg-background">*/}
                    {/*        <option value="ko">한국어</option>*/}
                    {/*        <option value="en">English</option>*/}
                    {/*    </select>*/}
                    {/*</div>*/}
                </div>
            </div>
        </div>
    );
};

export default GeneralSettings;