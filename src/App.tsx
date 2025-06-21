import Stack from "@mui/material/Stack";
import Container from "@mui/material/Container";
import { useEffect } from "react";
import OBR from "@owlbear-rodeo/sdk";

import { InteractiveTray } from "./tray/InteractiveTray";
import { Sidebar } from "./controls/Sidebar";

export function App() {
  useEffect(() => {
    const setupMetadataListener = () => {
      const handleMetadataChange = async (metadata: any) => {
        // Видаляємо обробку запиту з App.tsx - вона буде тільки в DiceRollSync.tsx
        // Це запобігає подвійному кидку
      };

      const unsubscribe = OBR.room.onMetadataChange(handleMetadataChange);
      
      return () => {
        unsubscribe();
      };
    };
    
    OBR.onReady(() => {
      setupMetadataListener();
    });
  }, []);

  return (
    <Container disableGutters maxWidth="md">
      <Stack direction="row" justifyContent="center">
        <Sidebar />
        <InteractiveTray />
      </Stack>
    </Container>
  );
}
