import Stack from "@mui/material/Stack";
import Container from "@mui/material/Container";
import { useEffect } from "react";
import OBR from "@owlbear-rodeo/sdk";

import { InteractiveTray } from "./tray/InteractiveTray";
import { Sidebar } from "./controls/Sidebar";
import { useDiceControlsStore } from "./controls/store";
import { useDiceRollStore } from "./dice/store";
import { getDiceToRoll } from "./controls/store";

export function App() {
  const { setupDiceFromRequest } = useDiceControlsStore();
  const { startRoll } = useDiceRollStore();

  useEffect(() => {
    const setupMetadataListener = () => {
      const handleMetadataChange = async (metadata: any) => {
        if (metadata.darqie?.activeRoll) {
          const rollRequest = metadata.darqie.activeRoll;
          
          // Перевіряємо, чи цей запит призначений для поточного гравця
          const currentConnectionId = await OBR.player.getConnectionId();
          
          if (rollRequest.connectionId && rollRequest.connectionId !== currentConnectionId) {
            // Цей запит не для нас, ігноруємо його
            return;
          }
          
          try {
            setupDiceFromRequest(rollRequest.type, rollRequest.style, rollRequest.bonus);
            
            setTimeout(async () => {
              const currentState = useDiceControlsStore.getState();
              const diceToRoll = currentState.diceCounts;
              const hasDice = Object.values(diceToRoll).some((count: any) => count > 0);
              
              if (hasDice) {
                // Виконуємо кидок без відкриття вікна
                const diceToRollObjects = getDiceToRoll(
                  currentState.diceCounts,
                  currentState.diceAdvantage,
                  currentState.diceById
                );
                
                if (diceToRollObjects.length > 0) {
                  const roll = {
                    dice: diceToRollObjects,
                    bonus: rollRequest.bonus || 0,
                    hidden: false
                  };
                  
                  // Виконуємо кидок
                  startRoll(roll);
                  
                  // Показуємо результат через сповіщення
                  const playerName = await OBR.player.getName();
                  const rollType = rollRequest.type;
                  const bonus = rollRequest.bonus || 0;
                  
                  await OBR.notification.show(
                    `Кидок ${rollType} +${bonus} виконано!`,
                    'INFO'
                  );
                }
              } else {
                console.error("🎲 [DICE] No dice configured for roll");
              }
              
              // Очищаємо запит після обробки
              try {
                const currentMetadata = await OBR.room.getMetadata();
                const updatedMetadata = { 
                  ...currentMetadata, 
                  darqie: { 
                    ...(currentMetadata.darqie || {}), 
                    activeRoll: null 
                  } 
                };
                await OBR.room.setMetadata(updatedMetadata);
              } catch (error) {
                console.error("🎲 [DICE] Error clearing roll request:", error);
              }
            }, 500);
            
          } catch (error) {
            console.error("🎲 [DICE] Error processing roll request:", error);
          }
        }
      };

      const unsubscribe = OBR.room.onMetadataChange(handleMetadataChange);
      
      return () => {
        unsubscribe();
      };
    };
    
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
