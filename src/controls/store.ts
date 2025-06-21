import create from "zustand";
import { immer } from "zustand/middleware/immer";
import { diceSets } from "../sets/diceSets";
import { Dice } from "../types/Dice";
import { DiceSet } from "../types/DiceSet";
import { Die } from "../types/Die";
import { generateDiceId } from "../helpers/generateDiceId";

export type Advantage = "ADVANTAGE" | "DISADVANTAGE" | null;
export type DiceCounts = Record<string, number>;

interface DiceControlsState {
  diceSet: DiceSet;
  diceById: Record<string, Die>;
  defaultDiceCounts: DiceCounts;
  diceCounts: DiceCounts;
  diceBonus: number;
  diceAdvantage: Advantage;
  diceHidden: boolean;
  diceRollPressTime: number | null;
  fairnessTesterOpen: boolean;
  changeDiceSet: (diceSet: DiceSet) => void;
  resetDiceCounts: () => void;
  changeDieCount: (id: string, count: number) => void;
  incrementDieCount: (id: string) => void;
  decrementDieCount: (id: string) => void;
  setDiceAdvantage: (advantage: Advantage) => void;
  setDiceBonus: (bonus: number) => void;
  toggleDiceHidden: () => void;
  setDiceRollPressTime: (time: number | null) => void;
  toggleFairnessTester: () => void;
  setupDiceFromRequest: (type: string, style: string, bonus: number) => void;
}

const initialSet = diceSets[0];
const initialDiceCounts = getDiceCountsFromSet(initialSet);
const initialDiceById = getDiceByIdFromSet(initialSet);

export const useDiceControlsStore = create<DiceControlsState>()(
  immer((set) => ({
    diceSet: initialSet,
    diceById: initialDiceById,
    defaultDiceCounts: initialDiceCounts,
    diceCounts: initialDiceCounts,
    diceBonus: 0,
    diceAdvantage: null,
    diceHidden: false,
    diceRollPressTime: null,
    fairnessTesterOpen: false,
    changeDiceSet(diceSet) {
      set((state) => {
        const counts: DiceCounts = {};
        const prevCounts = state.diceCounts;
        const prevDice = state.diceSet.dice;
        for (let i = 0; i < diceSet.dice.length; i++) {
          const die = diceSet.dice[i];
          const prevDie = prevDice[i];
          // Carry over count if the index and die type match
          if (prevDie && prevDie.type === die.type) {
            counts[die.id] = prevCounts[prevDie.id] || 0;
          } else {
            counts[die.id] = 0;
          }
        }
        state.diceCounts = counts;
        state.diceSet = diceSet;
        state.defaultDiceCounts = getDiceCountsFromSet(diceSet);
        state.diceById = getDiceByIdFromSet(diceSet);
      });
    },
    resetDiceCounts() {
      set((state) => {
        state.diceCounts = state.defaultDiceCounts;
      });
    },
    changeDieCount(id, count) {
      set((state) => {
        if (id in state.diceCounts) {
          state.diceCounts[id] = count;
        }
      });
    },
    incrementDieCount(id) {
      set((state) => {
        if (id in state.diceCounts) {
          state.diceCounts[id] += 1;
        }
      });
    },
    decrementDieCount(id) {
      set((state) => {
        if (id in state.diceCounts) {
          state.diceCounts[id] -= 1;
        }
      });
    },
    setDiceBonus(bonus) {
      set((state) => {
        state.diceBonus = bonus;
      });
    },
    setDiceAdvantage(advantage) {
      set((state) => {
        state.diceAdvantage = advantage;
      });
    },
    toggleDiceHidden() {
      set((state) => {
        state.diceHidden = !state.diceHidden;
      });
    },
    setDiceRollPressTime(time) {
      set((state) => {
        state.diceRollPressTime = time;
      });
    },
    toggleFairnessTester() {
      set((state) => {
        state.fairnessTesterOpen = !state.fairnessTesterOpen;
      });
    },
    setupDiceFromRequest(type, style, bonus) {
      console.log('[CONTROLS] setupDiceFromRequest викликано:', { type, style, bonus });
      set((state) => {
        // Скидаємо поточний стан
        state.diceCounts = state.defaultDiceCounts;
        state.diceBonus = bonus || 0;
        state.diceAdvantage = null;
        state.diceHidden = false;
        
        console.log('[CONTROLS] Поточний diceSet:', state.diceSet.name);
        
        // Знаходимо кубик потрібного типу в поточному наборі
        const targetDie = state.diceSet.dice.find(die => die.type === type);
        if (targetDie) {
          state.diceCounts[targetDie.id] = 1;
          console.log('[CONTROLS] Додано кубик до поточного набору:', targetDie.type, targetDie.id);
        } else {
          console.error("🎲 [DICE] Target die type not found in current set:", type);
          // Якщо не знайшли в поточному наборі, спробуємо знайти набір з потрібним стилем
          const targetDiceSet = diceSets.find(set => 
            set.dice.some(die => die.style === style)
          );
          
          if (targetDiceSet) {
            console.log('[CONTROLS] Змінюємо набір на:', targetDiceSet.name);
            // Змінюємо набір кубиків
            const counts: DiceCounts = {};
            const prevCounts = state.diceCounts;
            const prevDice = state.diceSet.dice;
            
            for (let i = 0; i < targetDiceSet.dice.length; i++) {
              const die = targetDiceSet.dice[i];
              const prevDie = prevDice[i];
              // Carry over count if the index and die type match
              if (prevDie && prevDie.type === die.type) {
                counts[die.id] = prevCounts[prevDie.id] || 0;
              } else {
                counts[die.id] = 0;
              }
            }
            
            state.diceCounts = counts;
            state.diceSet = targetDiceSet;
            state.defaultDiceCounts = getDiceCountsFromSet(targetDiceSet);
            state.diceById = getDiceByIdFromSet(targetDiceSet);
            
            // Знаходимо кубик потрібного типу і додаємо його
            const newTargetDie = targetDiceSet.dice.find(die => die.type === type);
            if (newTargetDie) {
              state.diceCounts[newTargetDie.id] = 1;
              console.log('[CONTROLS] Додано кубик:', newTargetDie.type, newTargetDie.id);
            }
          }
        }
        
        console.log('[CONTROLS] Фінальний diceCounts:', state.diceCounts);
      });
    },
  }))
);

function getDiceCountsFromSet(diceSet: DiceSet) {
  const counts: Record<string, number> = {};
  for (const die of diceSet.dice) {
    counts[die.id] = 0;
  }
  return counts;
}

function getDiceByIdFromSet(diceSet: DiceSet) {
  const byId: Record<string, Die> = {};
  for (const die of diceSet.dice) {
    byId[die.id] = die;
  }
  return byId;
}

/** Generate new dice based off of a set of counts, advantage and die */
export function getDiceToRoll(
  counts: DiceCounts,
  advantage: Advantage,
  diceById: Record<string, Die>
) {
  const dice: (Die | Dice)[] = [];
  const countEntries = Object.entries(counts);
  for (const [id, count] of countEntries) {
    const die = diceById[id];
    if (!die) {
      continue;
    }
    const { style, type } = die;
    for (let i = 0; i < count; i++) {
      if (advantage === null) {
        if (type === "D100") {
          // Push a d100 and d10 when rolling a d100
          dice.push({
            dice: [
              { id: generateDiceId(), style, type: "D100" },
              { id: generateDiceId(), style, type: "D10" },
            ],
          });
        } else {
          dice.push({ id: generateDiceId(), style, type });
        }
      } else {
        // Rolling with advantage or disadvantage
        const combination = advantage === "ADVANTAGE" ? "HIGHEST" : "LOWEST";
        if (type === "D100") {
          // Push 2 d100s and d10s
          dice.push({
            dice: [
              {
                dice: [
                  { id: generateDiceId(), style, type: "D100" },
                  { id: generateDiceId(), style, type: "D10" },
                ],
              },
              {
                dice: [
                  { id: generateDiceId(), style, type: "D100" },
                  { id: generateDiceId(), style, type: "D10" },
                ],
              },
            ],
            combination,
          });
        } else {
          dice.push({
            dice: [
              { id: generateDiceId(), style, type },
              { id: generateDiceId(), style, type },
            ],
            combination,
          });
        }
      }
    }
  }
  return dice;
}
