import Stack from "@mui/material/Stack";
import Container from "@mui/material/Container";
import { useEffect } from "react";
import OBR from "@owlbear-rodeo/sdk";

import { InteractiveTray } from "./tray/InteractiveTray";
import { Sidebar } from "./controls/Sidebar";
import { useDiceControlsStore } from "./controls/store";
import { useDiceRollStore } from "./dice/store";

export function App() {
  const { setupDiceFromRequest } = useDiceControlsStore();
  const { startRoll } = useDiceRollStore();

  useEffect(() => {
    console.log("🎲 [DICE] App component mounted, waiting for OBR to be ready...");
    
    const setupMetadataListener = () => {
      console.log("🎲 [DICE] OBR is ready, setting up metadata listener");
      
      const handleMetadataChange = async (metadata: any) => {
        console.log("🎲 [DICE] Metadata changed:", metadata);
        
        // Перевіряємо чи є запит від листа персонажа
        if (metadata.darqie?.activeRoll) {
          const rollRequest = metadata.darqie.activeRoll;
          console.log("🎲 [DICE] Received roll request from character sheet:", rollRequest);
          
          try {
            // Відкриваємо розширення кубиків
            console.log("🎲 [DICE] Opening dice extension...");
            await OBR.action.open();
            
            // Налаштовуємо кубики відповідно до запиту
            console.log("🎲 [DICE] Configuring dice for request:", rollRequest);
            setupDiceFromRequest(rollRequest.type, rollRequest.style, rollRequest.bonus);
            
            // Автоматично виконуємо кидок через 500мс
            setTimeout(() => {
              console.log("🎲 [DICE] Auto-executing roll...");
              const currentState = useDiceControlsStore.getState();
              const diceToRoll = currentState.diceCounts;
              const hasDice = Object.values(diceToRoll).some((count: any) => count > 0);
              
              if (hasDice) {
                console.log("🎲 [DICE] Dice configured, starting roll");
                // Тут потрібно буде викликати startRoll з правильними параметрами
                // Поки що просто логуємо
                console.log("🎲 [DICE] Roll would be executed with:", {
                  diceCounts: diceToRoll,
                  bonus: rollRequest.bonus,
                  style: rollRequest.style
                });
              } else {
                console.error("🎲 [DICE] No dice configured for roll");
              }
            }, 500);
            
          } catch (error) {
            console.error("🎲 [DICE] Error processing roll request:", error);
          }
        }
      };

      // Підписуємося на зміни метаданів
      console.log("🎲 [DICE] Subscribing to room metadata changes");
      const unsubscribe = OBR.room.onMetadataChange(handleMetadataChange);
      
      return () => {
        console.log("🎲 [DICE] Unsubscribing from metadata changes");
        unsubscribe();
      };
    };
    
    // Використовуємо OBR.onReady з колбек-функцією
    OBR.onReady(() => {
      setupMetadataListener();
    });
  }, [setupDiceFromRequest]);

  return (
    <Container disableGutters maxWidth="md">
      <Stack direction="row" justifyContent="center">
        <Sidebar />
        <InteractiveTray />
      </Stack>
    </Container>
  );
}
