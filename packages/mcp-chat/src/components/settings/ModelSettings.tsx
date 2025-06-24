import {type Component, createSignal} from "solid-js";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {TextArea} from "@/components/ui/textarea";
import {TextFieldLabel, TextFieldRoot} from "@/components/ui/textfield";
import {AnthropicModel} from "@/types/config";

const anthropicModels = [
    {
        id: AnthropicModel.CLAUDE_3_5_HAIKU,
        name: "Claude 3.5 Haiku",
    },
    {
        id: AnthropicModel.CLAUDE_3_7_SONNET,
        name: "Claude 3.7 Sonnet",
    },
    {
        id: AnthropicModel.CLAUDE_4_OPUS,
        name: "Claude 4 Opus",
    },
    {
        id: AnthropicModel.CLAUDE_4_SONNET,
        name: "Claude 4 Sonnet",
    }
]

const ModelSettings: Component = () => {
    const [model, setModel] = createSignal(AnthropicModel.CLAUDE_3_5_HAIKU);
    const [temperature, setTemperature] = createSignal(0.7);
    const [maxTokens, setMaxTokens] = createSignal(4096);

    return (
        <div class="space-y-6">
            <div>
                <h2 class="text-xl font-semibold mb-4">모델</h2>
                <p class="text-sm text-muted-foreground mb-6">
                    AI 모델의 동작을 구성합니다. 이 설정은 대화의 품질과 특성에 영향을 줍니다.
                </p>

                <div class="space-y-4">
                    <div class="rounded-lg p-4">
                        <div class="flex items-center justify-between">
                            <div class="text-sm font-medium">모델</div>
                            <Select
                                value={model()}
                                onChange={(value) => setModel(value ?? "")}
                                options={anthropicModels.map(model => model.id)}
                                itemComponent={(props) => (
                                    <SelectItem item={props.item}>
                                        {anthropicModels.find(m => m.id === props.item.rawValue)?.name}
                                    </SelectItem>
                                )}
                            >
                                <SelectTrigger class="w-[200px]">
                                    <SelectValue<string>>
                                        {(state) => {
                                            const selected = state.selectedOption();
                                            return anthropicModels.find(m => m.id === selected)?.name ?? "모델 선택";
                                        }}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent/>
                            </Select>
                        </div>
                        <p class="text-xs text-muted-foreground mt-2">
                            사용할 AI 모델을 선택합니다. 모델에 따라 응답 품질과 속도가 달라집니다.
                        </p>
                    </div>

                    <div class="rounded-lg p-4">
                        <div class="flex items-center justify-between mb-2">
                            <div class="text-sm font-medium">Temperature</div>
                            <div class="text-sm font-medium">{temperature()}</div>
                        </div>
                        <input
                            name="temperature"
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={temperature()}
                            onInput={(e) => setTemperature(parseFloat(e.currentTarget.value))}
                            class="w-full"
                        />
                        <div class="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>정확 (0.0)</span>
                            <span>창의적 (1.0)</span>
                        </div>
                        <p class="text-xs text-muted-foreground mt-2">
                            낮은 값은 더 일관되고 예측 가능한 응답을, 높은 값은 더 다양하고 창의적인 응답을 생성합니다.
                        </p>
                    </div>

                    <div class="rounded-lg p-4">
                        <div class="flex items-center justify-between mb-2">
                            <div class="text-sm font-medium">최대 토큰</div>
                            <div class="text-sm font-medium">{maxTokens()}</div>
                        </div>
                        <input
                            type="range"
                            min="512"
                            max="8192"
                            step="512"
                            value={maxTokens()}
                            onInput={(e) => setMaxTokens(parseInt(e.currentTarget.value))}
                            class="w-full"
                        />
                        <div class="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>512</span>
                            <span>8192</span>
                        </div>
                        <p class="text-xs text-muted-foreground mt-2">
                            AI가 생성할 수 있는 최대 응답 길이입니다. 더 긴 응답이 필요한 경우 이 값을 늘리세요.
                        </p>
                    </div>

                    <div class="rounded-lg p-4">
                        <TextFieldRoot>
                            <TextFieldLabel class="text-sm font-medium block mb-2">시스템 프롬프트</TextFieldLabel>
                            <TextArea
                                class="w-full text-sm font-mono resize-none"
                                rows={6}
                                placeholder="AI의 기본 동작을 정의하는 시스템 프롬프트를 입력하세요..."
                                value="당신은 도움이 되고 친절한 AI 어시스턴트입니다. 항상 정확하고 유용한 정보를 제공하려고 노력하며, 모르는 것은 솔직하게 인정합니다."
                            />
                        </TextFieldRoot>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModelSettings;