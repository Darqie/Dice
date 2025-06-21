import { useEffect, useRef } from "react";
import { DiceTransform } from "../types/DiceTransform";
import { DiceRoll } from "./DiceRoll";
import { InteractiveDice } from "./InteractiveDice";
import { useDiceRollStore } from "./store";

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

  // Додатковий обробник для автоматичних кидків
  const handleRollFinished = (id: string, number: number, transform: DiceTransform) => {
    console.log('[DICE] InteractiveDiceRoll: Кидок завершено для кубика:', id, 'значення:', number);
    
    // Викликаємо стандартний finishDieRoll
    finishDieRoll(id, number, transform);
    
    // Додатково перевіряємо чи всі кубики завершили анімацію
    const currentState = useDiceRollStore.getState();
    const allFinished = Object.values(currentState.rollValues).every((value) => value !== null);
    
    if (allFinished) {
      console.log('[DICE] InteractiveDiceRoll: Всі кубики завершили анімацію!');
      
      // Якщо це автоматичний кидок, очищаємо запит
      if (roll && roll.hidden === false && roll.bonus !== undefined) {
        // Це може бути автоматичний кидок - очищаємо запит через невелику затримку
        setTimeout(async () => {
          try {
            // Імпортуємо OBR динамічно щоб уникнути проблем з типами
            const OBR = await import("@owlbear-rodeo/sdk");
            const currentMetadata = await OBR.room.getMetadata();
            const darqie = currentMetadata.darqie as any;
            if (darqie && darqie.activeRoll) {
              const updatedMetadata = { 
                ...currentMetadata, 
                darqie: { 
                  ...darqie, 
                  activeRoll: null 
                } 
              };
              await OBR.room.setMetadata(updatedMetadata);
              console.log('[DICE] InteractiveDiceRoll: Запит автоматичного кидку очищено');
            }
          } catch (error) {
            console.error("🎲 [DICE] InteractiveDiceRoll: Error clearing auto roll request:", error);
          }
        }, 500);
      }
    }
  };

  if (!roll) {
    return null;
  }

  return (
    <DiceRoll
      roll={roll}
      rollThrows={rollThrows}
      finishedTransforms={finishedTransforms}
      onRollFinished={handleRollFinished}
      Dice={InteractiveDice}
      transformsRef={transformsRef}
    />
  );
} 