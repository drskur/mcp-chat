import { useTitleBar } from "@/components/layout/TitleBar";
import McpServerSettings from "@/components/settings/McpServerSettings";
import SettingsLayout from "@/components/layout/SettingsLayout";
import { onMount } from "solid-js";

export default function McpServersSettings() {
  const { setTitle } = useTitleBar();

  onMount(() => {
    setTitle("설정");
  });

  return (
    <SettingsLayout>
      <McpServerSettings />
    </SettingsLayout>
  );
}
