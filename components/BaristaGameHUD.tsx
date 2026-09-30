'use client';

import { create } from 'zustand';

// Game state type
export type GameStep = 'idle' | 'grinding' | 'tamping' | 'brewing' | 'steaming' | 'complete';

interface GameState {
  step: GameStep;
  coffeeGrams: number;
  targetCoffeeGrams: number;
  waterML: number;
  targetWaterML: number;
  milkML: number;
  targetMilkML: number;
  score: number;
  feedback: string;
  isAdding: boolean;
}

// Global state store
export const useBaristaGameStore = create<GameState & {
  setStep: (step: GameStep) => void;
  setCoffeeGrams: (grams: number) => void;
  setWaterML: (ml: number) => void;
  setMilkML: (ml: number) => void;
  setScore: (score: number) => void;
  setFeedback: (feedback: string) => void;
  setIsAdding: (isAdding: boolean) => void;
  reset: () => void;
}>((set) => ({
  step: 'idle',
  coffeeGrams: 0,
  targetCoffeeGrams: 18,
  waterML: 0,
  targetWaterML: 36,
  milkML: 0,
  targetMilkML: 150,
  score: 0,
  feedback: '',
  isAdding: false,
  setStep: (step) => set({ step }),
  setCoffeeGrams: (coffeeGrams) => set({ coffeeGrams }),
  setWaterML: (waterML) => set({ waterML }),
  setMilkML: (milkML) => set({ milkML }),
  setScore: (score) => set({ score }),
  setFeedback: (feedback) => set({ feedback }),
  setIsAdding: (isAdding) => set({ isAdding }),
  reset: () => set({
    step: 'idle',
    coffeeGrams: 0,
    waterML: 0,
    milkML: 0,
    score: 0,
    feedback: '',
    isAdding: false
  })
}));

export default function BaristaGameHUD() {
  const gameState = useBaristaGameStore();

  if (gameState.step === 'idle') return null;

  const getStepInfo = () => {
    switch (gameState.step) {
      case 'grinding':
        return {
          title: '🫘 Grinding Coffee',
          instruction: `Add ${gameState.targetCoffeeGrams}g of coffee grounds`,
          current: gameState.coffeeGrams,
          target: gameState.targetCoffeeGrams,
          unit: 'g',
          showMeter: true
        };
      case 'tamping':
        return {
          title: '👊 Tamping',
          instruction: 'Press and hold to tamp the grounds',
          showMeter: false
        };
      case 'brewing':
        return {
          title: '💧 Adding Water',
          instruction: `Add ${gameState.targetWaterML}ml of water`,
          current: gameState.waterML,
          target: gameState.targetWaterML,
          unit: 'ml',
          showMeter: true
        };
      case 'steaming':
        return {
          title: '🥛 Steaming Milk',
          instruction: `Add ${gameState.targetMilkML}ml of milk`,
          current: gameState.milkML,
          target: gameState.targetMilkML,
          unit: 'ml',
          showMeter: true
        };
      case 'complete':
        return {
          title: '🏆 Complete!',
          instruction: `Final Score: ${gameState.score}/100`,
          showMeter: false
        };
      default:
        return { title: '', instruction: '', showMeter: false };
    }
  };

  const info = getStepInfo();
  const percentage = info.showMeter && info.target ? (info.current! / info.target) * 100 : 0;
  const isOverflow = percentage > 110;
  const isPerfect = percentage >= 98 && percentage <= 102;
  const isGood = percentage >= 90 && percentage <= 110;

  const handleAddIngredient = () => {
    gameState.setIsAdding(true);
  };

  const handleStopAdding = () => {
    gameState.setIsAdding(false);
  };

  const calculateStepScore = (actual: number, target: number): number => {
    const percentage = (actual / target) * 100;
    
    if (percentage >= 98 && percentage <= 102) return 100;
    if (percentage >= 95 && percentage <= 105) return 90;
    if (percentage >= 90 && percentage <= 110) return 75;
    if (percentage >= 80 && percentage <= 120) return 50;
    return 20;
  };

  const handleNextStep = () => {
    let stepScore = 0;
    let feedback = '';
    let newStep: GameStep = gameState.step;
    let newScore = gameState.score;

    switch (gameState.step) {
      case 'grinding':
        stepScore = calculateStepScore(gameState.coffeeGrams, gameState.targetCoffeeGrams);
        newScore += stepScore / 4;
        feedback = stepScore >= 90 ? '✓ Perfect grind!' : 
                  stepScore >= 75 ? '○ Good amount' : 
                  '✗ Check your measurement';
        newStep = 'tamping';
        break;

      case 'tamping':
        stepScore = 80;
        newScore += 20;
        feedback = '✓ Good tamp pressure!';
        newStep = 'brewing';
        break;

      case 'brewing':
        stepScore = calculateStepScore(gameState.waterML, gameState.targetWaterML);
        newScore += stepScore / 4;
        feedback = stepScore >= 90 ? '✓ Perfect extraction!' : 
                  stepScore >= 75 ? '○ Good water amount' : 
                  '✗ Check your volume';
        newStep = 'steaming';
        break;

      case 'steaming':
        stepScore = calculateStepScore(gameState.milkML, gameState.targetMilkML);
        newScore += stepScore / 3.33;
        feedback = stepScore >= 90 ? '✓ Perfect microfoam!' : 
                  stepScore >= 75 ? '○ Good milk steaming' : 
                  '✗ Check your milk amount';
        newStep = 'complete';
        break;
    }

    gameState.setStep(newStep);
    gameState.setScore(Math.round(newScore));
    gameState.setFeedback(feedback);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-2xl mx-auto mt-8 space-y-4">
        {/* Title */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white drop-shadow-lg">{info.title}</h2>
          <p className="text-lg text-amber-200 drop-shadow-md mt-2">{info.instruction}</p>
        </div>

        {/* Measurement Meter */}
        {info.showMeter && (
          <div className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border-2 border-amber-500/50 mx-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-white font-semibold">
                Current: {info.current!.toFixed(1)}{info.unit}
              </span>
              <span className="text-amber-300 font-semibold">
                Target: {info.target!}{info.unit}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="relative w-full h-8 bg-gray-800 rounded-full overflow-hidden border-2 border-gray-700">
              {/* Target zone */}
              <div 
                className="absolute h-full bg-green-500/20"
                style={{ left: '95%', width: '10%' }}
              />
              
              {/* Fill bar */}
              <div
                className={`h-full transition-all duration-100 ${
                  isOverflow ? 'bg-red-500' :
                  isPerfect ? 'bg-green-500' :
                  isGood ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`}
                style={{ width: `${Math.min(percentage, 120)}%` }}
              />

              {/* Target indicator */}
              <div 
                className="absolute top-0 bottom-0 w-1 bg-white"
                style={{ left: '100%' }}
              />
            </div>

            {/* Status */}
            <div className="mt-3 text-center">
              {isOverflow && (
                <span className="text-red-400 font-bold">⚠️ OVERFLOW! Release now!</span>
              )}
              {isPerfect && !isOverflow && (
                <span className="text-green-400 font-bold">✓ PERFECT!</span>
              )}
              {isGood && !isPerfect && !isOverflow && (
                <span className="text-yellow-400 font-bold">○ Good</span>
              )}
              {!isGood && percentage > 0 && !isOverflow && (
                <span className="text-blue-400">Keep adding...</span>
              )}
            </div>

            {/* Controls */}
            <div className="mt-4 flex gap-3 pointer-events-auto">
              {gameState.step !== 'tamping' && (
                <>
                  <button
                    onMouseDown={handleAddIngredient}
                    onMouseUp={handleStopAdding}
                    onMouseLeave={handleStopAdding}
                    onTouchStart={handleAddIngredient}
                    onTouchEnd={handleStopAdding}
                    className="flex-1 py-3 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl font-bold text-white transition-all active:scale-95"
                  >
                    HOLD to Add
                  </button>
                  <button
                    onClick={handleNextStep}
                    disabled={percentage < 80}
                    className="flex-1 py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600 disabled:opacity-50 rounded-xl font-bold text-white transition-all active:scale-95"
                  >
                    Next Step →
                  </button>
                </>
              )}
              {gameState.step === 'tamping' && (
                <button
                  onMouseDown={handleAddIngredient}
                  onMouseUp={handleNextStep}
                  onMouseLeave={handleNextStep}
                  onTouchStart={handleAddIngredient}
                  onTouchEnd={handleNextStep}
                  className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-xl font-bold text-white transition-all active:scale-95"
                >
                  HOLD to Tamp (30 lbs pressure)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Feedback */}
        {gameState.feedback && (
          <div className="bg-black/80 backdrop-blur-sm rounded-xl p-4 mx-8 border-2 border-yellow-500/50">
            <p className="text-center text-yellow-300 font-semibold">{gameState.feedback}</p>
          </div>
        )}

        {/* Score */}
        <div className="text-center">
          <div className="inline-block bg-black/80 backdrop-blur-sm rounded-full px-6 py-2 border-2 border-amber-500/50">
            <span className="text-white font-bold">Score: </span>
            <span className="text-amber-400 font-bold text-xl">{gameState.score}</span>
            <span className="text-white font-bold">/100</span>
          </div>
        </div>

        {/* Complete screen */}
        {gameState.step === 'complete' && (
          <div className="bg-black/90 backdrop-blur-sm rounded-2xl p-8 mx-8 border-2 border-yellow-500">
            <div className="text-center space-y-4">
              <div className="text-6xl">
                {gameState.score >= 90 ? '🏆' : gameState.score >= 75 ? '⭐' : '📋'}
              </div>
              <h3 className="text-2xl font-bold text-white">
                {gameState.score >= 90 ? 'TESDA Certified!' : 
                 gameState.score >= 75 ? 'Good Job!' : 
                 'Keep Practicing!'}
              </h3>
              <p className="text-amber-200">
                {gameState.score >= 90 ? 'Perfect barista technique!' : 
                 gameState.score >= 75 ? 'Almost there! Try again for certification.' : 
                 'Practice makes perfect. Try again!'}
              </p>
              <button
                onClick={() => gameState.reset()}
                className="pointer-events-auto px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 rounded-xl font-bold text-white transition-all active:scale-95"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
