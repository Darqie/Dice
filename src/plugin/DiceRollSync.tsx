import OBR from "@owlbear-rodeo/sdk";
import React, { useEffect, useRef, useState } from "react";
import { useDiceRollStore } from "../dice/store";
import { getDieFromDice } from "../helpers/getDieFromDice";
import { getPluginId } from "./getPluginId";
import { getDiceToRoll } from "../controls/store";
import { useDiceControlsStore } from "../controls/store";
import { DiceRoll } from "../dice/DiceRoll";
import { Dice } from "../dice/Dice";
import { DiceTransform } from "../types/DiceTransform";

// Компонент для автоматичних кидків
function AutoDiceRoll({ 
  roll, 
  onRollFinished 
}: { 
  roll: any; 
  onRollFinished: (id: string, number: number, transform: DiceTransform) => void;
}) {
  const rollThrows = useDiceRollStore((state) => state.rollThrows);
  const finishedTransforms = useDiceRollStore((state) => {
    const values = Object.values(state.rollTransforms);
    if (values.some((v) => v === null)) {
      return undefined;
    }
    return state.rollTransforms as Record<string, DiceTransform>;
  });

  const transformsRef = useRef<Record<string, DiceTransform | null> | null>(null);
  useEffect(
    () =>
      useDiceRollStore.subscribe((state) => {
        transformsRef.current = state.rollTransforms;
      }),
    []
  );

  if (!roll) {
    return null;
  }

  return (
    <DiceRoll
      roll={roll}
      rollThrows={rollThrows}
      finishedTransforms={finishedTransforms}
      onRollFinished={onRollFinished}
      Dice={Dice}
      transformsRef={transformsRef}
    />
  );
}

/** Sync the current dice roll to the plugin */
export function DiceRollSync() {
  const prevIds = useRef<string[]>([]);
  const [autoRoll, setAutoRoll] = useState<any>(null);
  const [autoRollRequest, setAutoRollRequest] = useState<any>(null);
  
  // Функція для автоматичного виконання кидків
  const executeAutoRoll = async (rollRequest: { type: string; style: string; bonus?: number }) => {
    console.log('[DICE] executeAutoRoll викликано:', rollRequest);
    
    const diceControlsState = useDiceControlsStore.getState();
    const diceRollState = useDiceRollStore.getState();
    
    console.log('[DICE] diceControlsState:', diceControlsState);
    console.log('[DICE] diceRollState:', diceRollState);
    
    // Налаштовуємо кубики через нову функцію
    diceControlsState.setupDiceFromRequest(rollRequest.type, rollRequest.style, rollRequest.bonus || 0);
    
    // Отримуємо оновлений стан після налаштування
    const updatedDiceControlsState = useDiceControlsStore.getState();
    console.log('[DICE] Оновлений diceControlsState після setupDiceFromRequest:', {
      diceCounts: updatedDiceControlsState.diceCounts,
      diceById: updatedDiceControlsState.diceById,
      diceAdvantage: updatedDiceControlsState.diceAdvantage
    });
    
    // Конвертуємо Proxy об'єкти у звичайні об'єкти
    const normalCounts = { ...updatedDiceControlsState.diceCounts };
    const normalDiceById = { ...updatedDiceControlsState.diceById };
    
    console.log('[DICE] Конвертовані об\'єкти:', {
      normalCounts,
      normalDiceById: Object.keys(normalDiceById)
    });
    
    // Отримуємо кубики для кидку
    const diceToRoll = getDiceToRoll(
      normalCounts,
      updatedDiceControlsState.diceAdvantage,
      normalDiceById
    );
    
    console.log('[DICE] diceToRoll:', diceToRoll);
    console.log('[DICE] Параметри для getDiceToRoll:', {
      counts: updatedDiceControlsState.diceCounts,
      advantage: updatedDiceControlsState.diceAdvantage,
      diceById: Object.keys(updatedDiceControlsState.diceById)
    });
    
    if (diceToRoll.length > 0) {
      // Створюємо об'єкт кидку
      const roll = {
        dice: diceToRoll,
        bonus: rollRequest.bonus || 0,
        hidden: false
      };
      
      console.log('[DICE] Створено roll об\'єкт:', roll);
      console.log('[DICE] diceToRoll детально:', JSON.stringify(diceToRoll, null, 2));
      
      // Зберігаємо roll для рендерингу
      setAutoRoll(roll);
      setAutoRollRequest(rollRequest);
      
      // Виконуємо кидок з підвищеною швидкістю (як у звичайному кидку)
      try {
        console.log('[DICE] Тип startRoll:', typeof diceRollState.startRoll);
        console.log('[DICE] startRoll функція:', diceRollState.startRoll);
        // Використовуємо speedMultiplier = 20 для максимально швидкого завершення анімації
        diceRollState.startRoll(roll, 20);
        console.log('[DICE] startRoll викликано успішно з speedMultiplier = 20');
        
        // InteractiveDiceRoll тепер сам очистить запит після завершення анімації
        console.log('[DICE] Чекаємо завершення анімації...');
        
      } catch (error) {
        console.error('[DICE] Помилка при виклику startRoll:', error);
        
        // Очищаємо запит тільки при помилці
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
          console.log('[DICE] Запит очищено через помилку');
        } catch (error) {
          console.error("🎲 [DICE] Error clearing roll request:", error);
        }
      }
    } else {
      console.log('[DICE] Немає кубиків для кидку');
      console.log('[DICE] Детальна діагностика:');
      console.log('[DICE] - diceCounts:', updatedDiceControlsState.diceCounts);
      console.log('[DICE] - diceById keys:', Object.keys(updatedDiceControlsState.diceById));
      console.log('[DICE] - diceAdvantage:', updatedDiceControlsState.diceAdvantage);
      
      // Очищаємо запит якщо немає кубиків
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
        console.log('[DICE] Запит очищено - немає кубиків');
      } catch (error) {
        console.error("🎲 [DICE] Error clearing roll request:", error);
      }
    }
  };

  // Обробник завершення автоматичного кидку
  const handleAutoRollFinished = async (id: string, number: number, transform: DiceTransform) => {
    console.log('[DICE] Автоматичний кидок завершено для кубика:', id, 'значення:', number);
    
    // Очищаємо запит після завершення анімації
    try {
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
        console.log('[DICE] Запит очищено після завершення автоматичного кидку');
        
        // Очищаємо стан автоматичного кидку
        setAutoRoll(null);
        setAutoRollRequest(null);
      }
    } catch (error) {
      console.error("🎲 [DICE] Error clearing roll request after auto roll completion:", error);
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
        console.log('[DICE] Store змінився:', { 
          hasRoll: !!state.roll, 
          rollValuesCount: Object.keys(state.rollValues).length,
          rollValues: state.rollValues,
          hasFinishDieRoll: typeof state.finishDieRoll === 'function'
        });
        
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
            console.log('[DICE] Всі кубики завершили анімацію!');
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

  return (
    <>
      {/* Рендеримо автоматичний кидок якщо він є */}
      {autoRoll && (
        <AutoDiceRoll 
          roll={autoRoll} 
          onRollFinished={handleAutoRollFinished}
        />
      )}
    </>
  );
}
