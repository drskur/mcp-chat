import { useTitleBar } from "@/components/layout/TitleBar";
import ModelSettings from "@/components/settings/ModelSettings";
import SettingsLayout from "@/components/layout/SettingsLayout";
import { onMount } from "solid-js";

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
