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
    console.log('[DICE] executeAutoRoll викликано:', rollRequest);
    
    const { useDiceControlsStore } = await import("../controls/store");
    const { useDiceRollStore } = await import("../dice/store");
    
    const diceControlsState = useDiceControlsStore.getState();
    const diceRollState = useDiceRollStore.getState();
    
    console.log('[DICE] diceControlsState:', diceControlsState);
    console.log('[DICE] diceRollState:', diceRollState);
    
    // Отримуємо кубики для кидку
    const diceToRoll = getDiceToRoll(
      diceControlsState.diceCounts,
      diceControlsState.diceAdvantage,
      diceControlsState.diceById
    );
    
    console.log('[DICE] diceToRoll:', diceToRoll);
    
    if (diceToRoll.length > 0) {
      // Створюємо об'єкт кидку
      const roll = {
        dice: diceToRoll,
        bonus: rollRequest.bonus || 0,
        hidden: false
      };
      
      console.log('[DICE] Створено roll об\'єкт:', roll);
      
      // Виконуємо кидок
      try {
        diceRollState.startRoll(roll);
        console.log('[DICE] startRoll викликано успішно');
      } catch (error) {
        console.error('[DICE] Помилка при виклику startRoll:', error);
      }
      
      // Очищаємо запит після виконання
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
        console.log('[DICE] Запит очищено');
      } catch (error) {
        console.error("🎲 [DICE] Error clearing roll request:", error);
      }
    } else {
      console.log('[DICE] Немає кубиків для кидку');
    }
  };
  
  // Слухаємо зміни метаданів кімнати для запитів від листа персонажа
  useEffect(() => {
    const setupRoomMetadataListener = () => {
      // Перевіряємо чи OBR готовий перед підпискою
      if (!OBR.isAvailable) {
        return;
      }
      
      const handleRoomMetadataChange = async (metadata: { darqie?: { activeRoll?: { type: string; style: string; bonus?: number; connectionId?: string; playerName?: string } } }) => {
        if (metadata.darqie?.activeRoll) {
          const rollRequest = metadata.darqie.activeRoll;
          console.log('[DICE] Отримано запит на кидок:', rollRequest);
          
          // Перевіряємо, чи цей запит призначений для поточного гравця
          const currentConnectionId = await OBR.player.getConnectionId();
          
          if (rollRequest.connectionId && rollRequest.connectionId !== currentConnectionId) {
            // Цей запит не для нас, ігноруємо його
            console.log('[DICE] Запит не для поточного гравця, ігноруємо');
            return;
          }
          
          console.log('[DICE] Запит для поточного гравця, обробляємо');
          
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
