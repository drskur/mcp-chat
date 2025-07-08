import { onMount } from "solid-js";
import SettingsLayout from "@/components/layout/SettingsLayout";
import { useTitleBar } from "@/components/layout/TitleBar";
import ModelSettings from "@/components/settings/ModelSettings";

export default function ModelSettingsPage() {
  const { setTitle } = useTitleBar();

  onMount(() => {
    setTitle("설정");
  });

  return (
    <SettingsLayout>
      <ModelSettings />
    </SettingsLayout>
  );
}
