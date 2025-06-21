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
    const setupMetadataListener = () => {
      const handleMetadataChange = async (metadata: any) => {
        if (metadata.darqie?.activeRoll) {
          const rollRequest = metadata.darqie.activeRoll;
          console.log('[DICE] Roll request:', rollRequest);
          
          try {
            await OBR.action.open();
            
            setupDiceFromRequest(rollRequest.type, rollRequest.style, rollRequest.bonus);
            
            setTimeout(() => {
              const currentState = useDiceControlsStore.getState();
              const diceToRoll = currentState.diceCounts;
              const hasDice = Object.values(diceToRoll).some((count: any) => count > 0);
              
              if (hasDice) {
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
