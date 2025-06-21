import OBR from "@owlbear-rodeo/sdk";
import React, { useEffect, useRef } from "react";
import { useDiceRollStore } from "../dice/store";
import { getDieFromDice } from "../helpers/getDieFromDice";
import { getPluginId } from "./getPluginId";
import { getDiceToRoll } from "../controls/store";

/** Sync the current dice roll to the plugin */
export function DiceRollSync() {
  const prevIds = useRef<string[]>([]);
  
  // Функція для автоматичного виконання кидків
  const executeAutoRoll = async (rollRequest: { type: string; style: string; bonus?: number }) => {
    console.log("🎲 [DICE] Executing auto roll with request:", rollRequest);
    
    try {
      const { useDiceControlsStore } = await import("../controls/store");
      const { useDiceRollStore } = await import("../dice/store");
      
      const diceControlsState = useDiceControlsStore.getState();
      const diceRollState = useDiceRollStore.getState();
      
      console.log("🎲 [DICE] Current dice controls state:", diceControlsState);
      
      // Отримуємо кубики для кидку
      const diceToRoll = getDiceToRoll(
        diceControlsState.diceCounts,
        diceControlsState.diceAdvantage,
        diceControlsState.diceById
      );
      
      console.log("🎲 [DICE] Dice to roll:", diceToRoll);
      
      if (diceToRoll.length > 0) {
        // Створюємо об'єкт кидку
        const roll = {
          dice: diceToRoll,
          bonus: rollRequest.bonus || 0,
          hidden: false
        };
        
        console.log("🎲 [DICE] Starting roll with:", roll);
        
        // Виконуємо кидок
        diceRollState.startRoll(roll);
        
        console.log("🎲 [DICE] Roll started successfully");
      } else {
        console.error("🎲 [DICE] No dice configured for roll");
      }
    } catch (error) {
      console.error("🎲 [DICE] Error executing auto roll:", error);
    }
  };
  
  // Слухаємо зміни метаданів кімнати для запитів від листа персонажа
  useEffect(() => {
    console.log("🎲 [DICE] DiceRollSync: Waiting for OBR to be ready...");
    
    const setupRoomMetadataListener = () => {
      console.log("🎲 [DICE] DiceRollSync: OBR is ready, setting up room metadata listener");
      
      // Перевіряємо чи OBR готовий перед підпискою
      if (!OBR.isAvailable) {
        console.log("🎲 [DICE] DiceRollSync: OBR not available yet");
        return;
      }
      
      const handleRoomMetadataChange = async (metadata: { darqie?: { activeRoll?: { type: string; style: string; bonus?: number } } }) => {
        console.log("🎲 [DICE] DiceRollSync: Room metadata changed:", metadata);
        
        if (metadata.darqie?.activeRoll) {
          const rollRequest = metadata.darqie.activeRoll;
          console.log("🎲 [DICE] DiceRollSync: Processing roll request:", rollRequest);
          
          // Налаштовуємо кубики через нову функцію
          const { useDiceControlsStore } = await import("../controls/store");
          const diceControlsState = useDiceControlsStore.getState();
          diceControlsState.setupDiceFromRequest(rollRequest.type, rollRequest.style, rollRequest.bonus || 0);
          
          // Виконуємо кидок через невелику затримку
          setTimeout(() => {
            executeAutoRoll(rollRequest);
          }, 1000);
        }
      };
      
      try {
        const unsubscribe = OBR.room.onMetadataChange(handleRoomMetadataChange);
        
        return () => {
          console.log("🎲 [DICE] DiceRollSync: Unsubscribing from room metadata");
          unsubscribe();
        };
      } catch (error) {
        console.error("🎲 [DICE] DiceRollSync: Error setting up metadata listener:", error);
      }
    };
    
    // Використовуємо OBR.onReady з колбек-функцією
    OBR.onReady(() => {
      setupRoomMetadataListener();
    });
  }, []);
  
  useEffect(
    () =>
      useDiceRollStore.subscribe(async (state: any) => {
        let changed = false;
        if (!state.roll) {
          changed = true;
          prevIds.current = [];
        } else {
          const ids = getDieFromDice(state.roll).map((die) => die.id);
          // Check array length for early change check
          if (prevIds.current.length !== ids.length) {
            changed = true;
          }
          // Check the ids have changed
          else if (!ids.every((id, index) => id === prevIds.current[index])) {
            changed = true;
          }
          // Check if we'e completed a roll
          else if (
            Object.values(state.rollValues).every((value) => value !== null)
          ) {
            changed = true;
          }
          prevIds.current = ids;
        }

        if (changed) {
          // Hide values if needed
          const throws = state.roll?.hidden ? undefined : state.rollThrows;
          const values = state.roll?.hidden ? undefined : state.rollValues;
          const transforms = state.roll?.hidden
            ? undefined
            : state.rollTransforms;
          
          // Отримуємо ім'я поточного гравця
          const currentPlayerName = await OBR.player.getName();
          
          // Зберігаємо в локальних метаданих для синхронізації
          OBR.player.setMetadata({
            [getPluginId("roll")]: state.roll,
            [getPluginId("rollThrows")]: throws,
            [getPluginId("rollValues")]: values,
            [getPluginId("rollTransforms")]: transforms,
            [getPluginId("rollPlayer")]: currentPlayerName,
          });
        }
      }),
    []
  );

  return null;
}
