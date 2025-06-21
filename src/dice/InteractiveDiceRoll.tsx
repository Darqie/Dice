import { useEffect, useRef } from "react";
import { DiceTransform } from "../types/DiceTransform";
import { DiceRoll } from "./DiceRoll";
import { InteractiveDice } from "./InteractiveDice";
import { useDiceRollStore } from "./store";
import OBR from "@owlbear-rodeo/sdk";

/** Dice roll based off of the values from the dice roll store */
export function InteractiveDiceRoll() {
  const roll = useDiceRollStore((state) => state.roll);
  const rollThrows = useDiceRollStore((state) => state.rollThrows);
  const finishDieRoll = useDiceRollStore((state) => state.finishDieRoll);

  const finishedTransforms = useDiceRollStore((state) => {
    const values = Object.values(state.rollTransforms);
    if (values.some((v) => v === null)) {
      return undefined;
    }
    return state.rollTransforms as Record<string, DiceTransform>;
  });

  const transformsRef = useRef<Record<string, DiceTransform | null> | null>(
    null
  );
  useEffect(
    () =>
      useDiceRollStore.subscribe((state) => {
        transformsRef.current = state.rollTransforms;
      }),
    []
  );

  // Очищення запиту автоматичного кидку після завершення анімації
  useEffect(() => {
    const checkAndClearRollRequest = async () => {
      if (finishedTransforms && roll) {
        console.log('[INTERACTIVE] Всі кубики завершили анімацію, перевіряємо чи потрібно очистити запит');
        
        try {
          const currentMetadata = await OBR.room.getMetadata();
          if (currentMetadata.darqie?.activeRoll) {
            console.log('[INTERACTIVE] Очищаємо запит автоматичного кидку');
            const updatedMetadata = { 
              ...currentMetadata, 
              darqie: { 
                ...(currentMetadata.darqie || {}), 
                activeRoll: null 
              } 
            };
            await OBR.room.setMetadata(updatedMetadata);
            console.log('[INTERACTIVE] Запит очищено успішно');
          }
        } catch (error) {
          console.error("[INTERACTIVE] Error clearing roll request:", error);
        }
      }
    };

    checkAndClearRollRequest();
  }, [finishedTransforms, roll]);

  if (!roll) {
    return null;
  }

  return (
    <DiceRoll
      roll={roll}
      rollThrows={rollThrows}
      finishedTransforms={finishedTransforms}
      onRollFinished={finishDieRoll}
      Dice={InteractiveDice}
      transformsRef={transformsRef}
    />
  );
}
