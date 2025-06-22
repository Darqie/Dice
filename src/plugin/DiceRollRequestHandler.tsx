import OBR from "@owlbear-rodeo/sdk";
import { useEffect, useState, useRef } from "react";
import { useDiceRollStore } from "../dice/store";
import { useDiceControlsStore } from "../controls/store";
import { DiceType } from "../types/DiceType";
import { diceSets } from "../sets/diceSets";
import { useDiceHistoryStore } from "../controls/history";
import { getDiceToRoll } from "../controls/store";
import { getPluginId } from "./getPluginId";

interface DiceRollRequest {
  type: string;
  style: string;
  bonus: number;
  advantage?: 'advantage' | 'disadvantage' | null;
  connectionId: string;
  playerName: string;
  ts: number;
}

export function DiceRollRequestHandler() {
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastProcessedRequest = useRef<string>('');
  
  const startRoll = useDiceRollStore((state) => state.startRoll);
  const clearRoll = useDiceRollStore((state) => state.clearRoll);
  const setDiceBonus = useDiceControlsStore((state) => state.setDiceBonus);
  const setDiceAdvantage = useDiceControlsStore((state) => state.setDiceAdvantage);
  const resetDiceCounts = useDiceControlsStore((state) => state.resetDiceCounts);
  const changeDiceSet = useDiceControlsStore((state) => state.changeDiceSet);
  const pushRecentRoll = useDiceHistoryStore((state) => state.pushRecentRoll);
  const incrementDieCount = useDiceControlsStore((state) => state.incrementDieCount);
  const counts = useDiceControlsStore((state) => state.diceCounts);
  const diceById = useDiceControlsStore((state) => state.diceById);
  const hidden = useDiceControlsStore((state) => state.diceHidden);
  const advantage = useDiceControlsStore((state) => state.diceAdvantage);

  // Чекаємо готовності OBR SDK
  useEffect(() => {
    if (OBR.isAvailable) {
      OBR.onReady(() => {
        setIsReady(true);
      });
    }
  }, []);

  useEffect(() => {
    // Не підписуємося поки OBR не готовий
    if (!isReady) return;

    // Перевіряємо чи це основне вікно розширення (не popover)
    const isMainWindow = !window.location.pathname.includes('popover');
    
    if (!isMainWindow) {
      return; // Не обробляємо запити в popover
    }

    const handleMetadataChange = async (metadata: any) => {
      const rollRequest = metadata.darqie?.activeRoll;
      const closeSignal = metadata.darqie?.closeDiceExtension;
      
      // Обробляємо сигнал про закриття розширення
      if (closeSignal && !isProcessing) {
        // Закриваємо розширення кубиків
        await OBR.action.close();
        
        // Сигналізуємо про необхідність відкриття листа персонажа
        const currentMetadata = await OBR.room.getMetadata();
        await OBR.room.setMetadata({
          ...currentMetadata,
          darqie: {
            ...(currentMetadata.darqie || {}),
            closeDiceExtension: null,
            openCharacterSheet: true,
            timestamp: Date.now()
          }
        });
        
        return;
      }
      
      if (!rollRequest || !isReady) {
        return;
      }

      // Перевіряємо, чи запит не старіший за 5 секунд
      const now = Date.now();
      if (now - rollRequest.ts > 5000) return;

      // Створюємо унікальний ідентифікатор запиту
      const requestId = `${rollRequest.type}_${rollRequest.style}_${rollRequest.bonus}_${rollRequest.ts}`;
      
      // Перевіряємо, чи не обробляли ми вже цей запит
      if (lastProcessedRequest.current === requestId || isProcessing) {
        return;
      }

      // Перевіряємо, чи це запит від поточного гравця
      const currentPlayer = await OBR.player.getConnectionId();
      if (rollRequest.connectionId !== currentPlayer) {
        return;
      }

      setIsProcessing(true);
      lastProcessedRequest.current = requestId;

      try {
        // Очищаємо попередній кидок
        clearRoll();
        
        // Налаштовуємо кубики відповідно до запиту
        resetDiceCounts();
        setDiceBonus(rollRequest.bonus || 0);
        
        // Налаштовуємо перевагу/похибку згідно з запитом
        if (rollRequest.advantage === 'advantage') {
          setDiceAdvantage('ADVANTAGE');
        } else if (rollRequest.advantage === 'disadvantage') {
          setDiceAdvantage('DISADVANTAGE');
        } else {
          setDiceAdvantage(null);
        }

        // Визначаємо тип кубика на основі запиту
        let diceType: DiceType = "D20";
        if (rollRequest.type === "D20") diceType = "D20";
        else if (rollRequest.type === "D6") diceType = "D6";
        else if (rollRequest.type === "D4") diceType = "D4";
        else if (rollRequest.type === "D8") diceType = "D8";
        else if (rollRequest.type === "D10") diceType = "D10";
        else if (rollRequest.type === "D12") diceType = "D12";
        else if (rollRequest.type === "D100") diceType = "D100";

        // Знаходимо потрібний набір кубиків
        const targetSet = diceSets.find(set => 
          set.dice.some(die => die.type === diceType && die.style === rollRequest.style)
        );

        if (targetSet) {
          // Перемикаємося на потрібний набір
          changeDiceSet(targetSet);
          
          // Даємо час для оновлення стану після зміни набору
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Отримуємо оновлений diceById після зміни набору
          const updatedDiceById = targetSet.dice.reduce((acc, die) => {
            acc[die.id] = die;
            return acc;
          }, {} as Record<string, any>);

          // Знаходимо кубик відповідного типу та стилю
          const targetDie = Object.values(updatedDiceById).find(
            die => die.type === diceType && die.style === rollRequest.style
          );

          if (targetDie) {
            // Відкриваємо основне вікно розширення для гравця, який кинув
            await OBR.action.open();
            
            // Даємо час для ініціалізації вікна
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Просто виконуємо кидок безпосередньо
            
            // Налаштовуємо інтерфейс як при звичайному виборі кубика
            // Встановлюємо бонус
            setDiceBonus(rollRequest.bonus || 0);
            
            // Вибираємо потрібний кубик (додаємо його до інтерфейсу)
            incrementDieCount(targetDie.id);
            
            // Даємо час для оновлення інтерфейсу
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Використовуємо глобальну функцію для запуску кидка
            if (window.triggerDiceRoll) {
              window.triggerDiceRoll();
              
              // Відстежуємо завершення кидка і закриваємо розширення через 5 секунд
              const checkRollFinished = () => {
                const rollState = useDiceRollStore.getState();
                const allValuesSet = Object.values(rollState.rollValues).every(value => value !== null);
                
                if (allValuesSet && rollState.roll) {
                  setTimeout(async () => {
                    // Сигналізуємо через метадані про необхідність закриття розширення
                    const currentMetadata = await OBR.room.getMetadata();
                    await OBR.room.setMetadata({
                      ...currentMetadata,
                      darqie: {
                        ...(currentMetadata.darqie || {}),
                        closeDiceExtension: true,
                        timestamp: Date.now()
                      }
                    });
                  }, 5000);
                } else {
                  // Якщо кидок ще не завершено, перевіряємо знову через 100мс
                  setTimeout(checkRollFinished, 100);
                }
              };
              
              // Починаємо перевірку через 1 секунду (даємо час для початку кидка)
              setTimeout(checkRollFinished, 1000);
              
            } else {
              // Fallback - прямий запуск кидка
              const updatedCounts = useDiceControlsStore.getState().diceCounts;
              const updatedDiceById = useDiceControlsStore.getState().diceById;
              const dice = getDiceToRoll(updatedCounts, advantage, updatedDiceById);
              startRoll({ dice, bonus: rollRequest.bonus, hidden }, 1);
              
              // Додаємо до історії кидків
              const rolledDiceById: Record<string, any> = {};
              for (const id of Object.keys(updatedCounts)) {
                if (!(id in rolledDiceById)) {
                  rolledDiceById[id] = updatedDiceById[id];
                }
              }
              pushRecentRoll({ advantage, counts: updatedCounts, bonus: rollRequest.bonus, diceById: rolledDiceById });
              
              // Відстежуємо завершення кидка і закриваємо розширення через 5 секунд (fallback)
              const checkRollFinishedFallback = () => {
                const rollState = useDiceRollStore.getState();
                const allValuesSet = Object.values(rollState.rollValues).every(value => value !== null);
                
                if (allValuesSet && rollState.roll) {
                  setTimeout(async () => {
                    // Сигналізуємо через метадані про необхідність закриття розширення
                    const currentMetadata = await OBR.room.getMetadata();
                    await OBR.room.setMetadata({
                      ...currentMetadata,
                      darqie: {
                        ...(currentMetadata.darqie || {}),
                        closeDiceExtension: true,
                        timestamp: Date.now()
                      }
                    });
                  }, 5000);
                } else {
                  // Якщо кидок ще не завершено, перевіряємо знову через 100мс
                  setTimeout(checkRollFinishedFallback, 100);
                }
              };
              
              // Починаємо перевірку через 1 секунду (даємо час для початку кидка)
              setTimeout(checkRollFinishedFallback, 1000);
            }
            
          } else {
            console.warn(`🎲 [DICE] Не знайдено кубик типу ${rollRequest.type} зі стилем ${rollRequest.style} в наборі ${targetSet.name}`);
          }
        } else {
          console.warn(`🎲 [DICE] Не знайдено набір кубиків з типом ${rollRequest.type} та стилем ${rollRequest.style}`);
        }

        // Очищаємо запит після обробки
        const currentMetadata = await OBR.room.getMetadata();
        await OBR.room.setMetadata({
          ...currentMetadata,
          darqie: {
            ...(currentMetadata.darqie || {}),
            activeRoll: null
          }
        });

      } catch (error) {
        console.error("🎲 [DICE] Помилка при обробці запиту на кидок:", error);
      } finally {
        setIsProcessing(false);
      }
    };

    // Підписуємося на зміни метаданів кімнати тільки після готовності OBR
    return OBR.room.onMetadataChange(handleMetadataChange);
  }, [isReady, startRoll, clearRoll, setDiceBonus, setDiceAdvantage, resetDiceCounts, changeDiceSet]);

  return null;
}