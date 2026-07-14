import { GameClient } from "@/components/game/GameClient";
import { GameProviders } from "@/components/providers/GameProviders";

export default function Home() {
  return <GameProviders><GameClient /></GameProviders>;
}

