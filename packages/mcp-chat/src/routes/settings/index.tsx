import { onMount } from "solid-js";
import SettingsLayout from "@/components/layout/SettingsLayout";
import { useTitleBar } from "@/components/layout/TitleBar";
import GeneralSettings from "@/components/settings/GeneralSettings";

export default function Settings() {
  const { setTitle } = useTitleBar();

  onMount(() => {
    setTitle("설정");
  });

  return (
    <SettingsLayout>
      <GeneralSettings />
    </SettingsLayout>
  );
}
