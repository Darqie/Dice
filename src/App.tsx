import Stack from "@mui/material/Stack";
import Container from "@mui/material/Container";
import { useEffect } from "react";

import { InteractiveTray } from "./tray/InteractiveTray";
import { Sidebar } from "./controls/Sidebar";
import { DiceRollRequestHandler } from "./plugin/DiceRollRequestHandler";
import { createProgrammaticRollTrigger } from "./controls/DiceRollControls";

export function App() {
  useEffect(() => {
    // Додаємо глобальну функцію для програмного запуску кидка
    window.triggerDiceRoll = createProgrammaticRollTrigger();
  }, []);

  return (
    <Container disableGutters maxWidth="md">
      <DiceRollRequestHandler />
      <Stack direction="row" justifyContent="center">
        <Sidebar />
        <InteractiveTray />
      </Stack>
    </Container>
  );
}
