import {createAsync, useAction} from "@solidjs/router";
import {type Component, createEffect, createSignal} from "solid-js";
import {getConfigQuery} from "@/actions";
import {setModelConfigAction} from "@/actions/config";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {Slider, SliderFill, SliderThumb, SliderTrack} from "@/components/ui/slider";
import {TextArea} from "@/components/ui/textarea";
import {TextFieldLabel, TextFieldRoot} from "@/components/ui/textfield";
import {AnthropicModel, type BedrockModel} from "@/types/config";


const anthropicModels = [
    AnthropicModel.CLAUDE_3_5_HAIKU,
    AnthropicModel.CLAUDE_3_7_SONNET,
    AnthropicModel.CLAUDE_4_OPUS,
    AnthropicModel.CLAUDE_4_SONNET
]

const ModelSettings: Component = () => {
    const [model, setModel] = createSignal(AnthropicModel.CLAUDE_3_5_HAIKU);
    const [temperature, setTemperature] = createSignal(0);
    const [maxTokens, setMaxTokens] = createSignal(0);
    const [prompt, setPrompt] = createSignal("");

    const config = createAsync(() => getConfigQuery());
    const setModelConfig = useAction(setModelConfigAction);

    createEffect(() => {
        const modelConfig = config()?.model;
        if (modelConfig) {
            setModel(modelConfig.model);
            setTemperature(modelConfig.temperature);
            setMaxTokens(modelConfig.maxTokens);
            setPrompt(modelConfig.systemPrompt);
        }
    });

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
                                onChange={async (value) => {
                                    const currentModel = value ?? AnthropicModel.CLAUDE_3_5_HAIKU;
                                    await setModelConfig("model", currentModel);
                                    setModel(currentModel);
                                }}
                                options={anthropicModels}
                                optionValue="modelId"
                                optionTextValue="name"
                                itemComponent={(props) => (
                                    <SelectItem item={props.item}>
                                        {props.item.rawValue.name}
                                    </SelectItem>
                                )}
                            >
                                <SelectTrigger class="w-[200px]">
                                    <SelectValue<BedrockModel>>
                                        {(state) => state.selectedOption().name}
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
                            <div class="text-sm font-medium">{temperature().toFixed(1)}</div>
                        </div>
                        <Slider
                            value={[temperature()]}
                            onChange={async (values: number[]) => {
                                const value = values[0];
                                setTemperature(value);
                                await setModelConfig("temperature", value);
                            }}
                            minValue={0}
                            maxValue={1}
                            step={0.1}
                            class="py-3"
                        >
                            <SliderTrack>
                                <SliderFill/>
                            </SliderTrack>
                            <SliderThumb/>
                        </Slider>
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
                        <Slider
                            value={[maxTokens()]}
                            onChange={async (values: number[]) => {
                                const value = values[0];
                                setMaxTokens(value);
                                await setModelConfig("maxTokens", value);
                            }}
                            minValue={512}
                            maxValue={8192}
                            step={512}
                            class="py-3"
                        >
                            <SliderTrack>
                                <SliderFill/>
                            </SliderTrack>
                            <SliderThumb/>
                        </Slider>
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
                                value={prompt()}
                                onBlur={async (e: FocusEvent & { target: HTMLTextAreaElement }) => {
                                    const prompt = e.target.value;
                                    await setModelConfig("systemPrompt", prompt);
                                }}
                            />
                        </TextFieldRoot>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModelSettings;