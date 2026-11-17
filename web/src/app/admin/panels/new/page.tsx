import { PageTitle } from "@/components/AppShell";
import { PanelForm } from "../PanelForm";
import { ADAPTER_OPTIONS, adapterStatus } from "@/lib/provider";

export default function NewPanel() {
  return (<><PageTitle title="New panel" /><PanelForm adapters={ADAPTER_OPTIONS.map((a) => ({ ...a, status: adapterStatus(a.id) }))} /></>);
}
