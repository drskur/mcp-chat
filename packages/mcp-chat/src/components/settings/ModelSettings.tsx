import {type Component, createSignal} from "solid-js";

const ModelSettings: Component = () => {
    const [temperature, setTemperature] = createSignal(0.7);
    const [maxTokens, setMaxTokens] = createSignal(4096);

    return (
        <div class="space-y-6">
            <div>
                <h2 class="text-xl font-semibold mb-4">모델 설정</h2>
                <p class="text-sm text-muted-foreground mb-6">
                    AI 모델의 동작을 구성합니다. 이 설정은 대화의 품질과 특성에 영향을 줍니다.
                </p>

                <div class="space-y-4">
                    <div class="rounded-lg border border-border p-4">
                        <div class="text-sm font-medium mb-2 block">모델</div>
                        <select class="w-full p-2 rounded-md border border-input bg-background">
                            <option value="claude-3.5-haiku">Claude 3.5 Haiku</option>
                            <option value="claude-3.7-sonnet">Claude 3.7 Sonnet</option>
                            <option value="claude-3-opus">Claude 3 Opus</option>
                        </select>
                        <p class="text-xs text-muted-foreground mt-2">
                            사용할 AI 모델을 선택합니다. 모델에 따라 응답 품질과 속도가 달라집니다.
                        </p>
                    </div>

                    <div class="rounded-lg border border-border p-4">
                        <label class="text-sm font-medium mb-2 block">
                            Temperature: {temperature()}

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
                        </label>
                        <div class="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>정확 (0.0)</span>
                            <span>창의적 (1.0)</span>
                        </div>
                        <p class="text-xs text-muted-foreground mt-2">
                            낮은 값은 더 일관되고 예측 가능한 응답을, 높은 값은 더 다양하고 창의적인 응답을 생성합니다.
                        </p>
                    </div>

                    <div class="rounded-lg border border-border p-4">
                        <label class="text-sm font-medium mb-2 block">
                            최대 토큰: {maxTokens()}
                            <input
                                type="range"
                                min="512"
                                max="8192"
                                step="512"
                                value={maxTokens()}
                                onInput={(e) => setMaxTokens(parseInt(e.currentTarget.value))}
                                class="w-full"
                            />
                        </label>
                        <div class="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>512</span>
                            <span>8192</span>
                        </div>
                        <p class="text-xs text-muted-foreground mt-2">
                            AI가 생성할 수 있는 최대 응답 길이입니다. 더 긴 응답이 필요한 경우 이 값을 늘리세요.
                        </p>
                    </div>

                    <div class="rounded-lg border border-border p-4">
                        <label class="text-sm font-medium block">시스템 프롬프트
                            <textarea
                                class="w-full p-2 rounded-md border border-input bg-background text-sm font-mono mt-2"
                                rows={6}
                                placeholder="AI의 기본 동작을 정의하는 시스템 프롬프트를 입력하세요..."
                            >당신은 도움이 되고 친절한 AI 어시스턴트입니다. 항상 정확하고 유용한 정보를 제공하려고 노력하며, 모르는 것은 솔직하게 인정합니다.</textarea>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModelSettings;