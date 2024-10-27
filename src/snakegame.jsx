import React, { useState, useEffect, useCallback } from 'react';

// Game constants
const GRID_SIZE = 20;
const CELL_SIZE = 25;
const INITIAL_SNAKE = [{ x: 10, y: 10 }];
const INITIAL_DIRECTION = 'RIGHT';
const SPEED = 150;

// Audio context creation
const createAudioContext = () => {
    if (typeof window === 'undefined') return null;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    const createSound = (frequency, duration, type = 'sine', gainValue = 0.1) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(gainValue, audioContext.currentTime);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);
    };

    return {
        playRegularEatSound: () => createSound(600, 0.1, 'sine', 0.1),
        playBonusAppearSound: () => {
            createSound(880, 0.1, 'sine', 0.1);
            setTimeout(() => createSound(1320, 0.1, 'sine', 0.08), 100);
            setTimeout(() => createSound(1760, 0.1, 'sine', 0.06), 200);
        },
        playBonusEatSound: () => {
            createSound(440, 0.1, 'square', 0.1);
            setTimeout(() => createSound(880, 0.2, 'square', 0.1), 100);
        },
        playGameOverSound: () => {
            createSound(440, 0.1, 'sawtooth', 0.1);
            setTimeout(() => createSound(220, 0.3, 'sawtooth', 0.1), 100);
        }
    };
};

// Food generation helper
const generateFood = (snake, existingFood = []) => {
    let newFood;
    do {
        newFood = {
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE)
        };
    } while (
        snake.some(segment => segment.x === newFood.x && segment.y === newFood.y) ||
        existingFood.some(food => food.x === newFood.x && food.y === newFood.y)
    );
    return newFood;
};

// Snake segment component
const SnakeSegment = ({ index, direction, style }) => {
    if (index === 0) {
        const headRotation = {
            'UP': 'rotate-180',
            'DOWN': 'rotate-0',
            'LEFT': '-rotate-90',
            'RIGHT': 'rotate-90'
        }[direction];

        return (
            <div
                style={style}
                className={`absolute w-6 h-6 bg-pink-500 rounded-t-full ${headRotation} border-2 border-pink-700
                   before:content-[''] before:absolute before:w-2 before:h-2 before:bg-white before:rounded-full before:top-2 before:right-1
                   before:shadow-[6px_0_0_0_rgb(255,255,255)]
                   after:content-[''] after:absolute after:w-3 after:h-1.5 after:bg-red-400 after:bottom-1 after:left-2 after:rounded-md`}
            />
        );
    }

    const isEven = index % 2 === 0;
    return (
        <div
            style={style}
            className={`absolute w-6 h-6 ${isEven ? 'bg-pink-400' : 'bg-pink-500'} 
                  border-2 border-pink-600 shadow-sm
                  ${index === 1 ? 'rounded-t-sm' : ''} 
                  ${index === 1 ? 'border-t-2' : 'border-t-4'}`}
        />
    );
};

// Food dot component
const FoodDot = ({ x, y, isBonus = false }) => (
    <div
        className="absolute flex items-center justify-center z-10"
        style={{
            width: CELL_SIZE,
            height: CELL_SIZE,
            left: x * CELL_SIZE,
            top: y * CELL_SIZE,
        }}>
        <div
            className={`bg-white rounded-full shadow-lg relative ring-2 ring-white ring-opacity-50
                  ${isBonus ? 'animate-bounce' : 'animate-pulse'}`}
            style={{
                width: isBonus ? '18px' : '12px',
                height: isBonus ? '18px' : '12px',
                boxShadow: isBonus
                    ? '0 0 15px rgba(255, 255, 255, 0.9), 0 0 25px rgba(255, 255, 255, 0.7)'
                    : '0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 255, 255, 0.6)'
            }}
        />
    </div>
);

const SnakeGame = () => {
    const [snake, setSnake] = useState(INITIAL_SNAKE);
    const [foodPoints, setFoodPoints] = useState([{ x: 10, y: 5, isBonus: false }]);
    const [direction, setDirection] = useState(INITIAL_DIRECTION);
    const [isGameOver, setIsGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [soundSystem, setSoundSystem] = useState(null);
    const [hasBonusPoint, setHasBonusPoint] = useState(false);

    useEffect(() => {
        setSoundSystem(createAudioContext());
    }, []);

    useEffect(() => {
        if (score > 0 && score % 4 === 0 && !hasBonusPoint) {
            const bonusPoint = generateFood(snake, foodPoints);
            setFoodPoints(current => [...current, { ...bonusPoint, isBonus: true }]);
            setHasBonusPoint(true);
            soundSystem?.playBonusAppearSound();
        }
    }, [score, snake, foodPoints, hasBonusPoint, soundSystem]);

    const moveSnake = useCallback(() => {
        if (isGameOver || isPaused) return;

        const head = snake[0];
        const newHead = { ...head };

        switch (direction) {
            case 'UP':
                newHead.y -= 1;
                break;
            case 'DOWN':
                newHead.y += 1;
                break;
            case 'LEFT':
                newHead.x -= 1;
                break;
            case 'RIGHT':
                newHead.x += 1;
                break;
            default:
                break;
        }

        if (
            newHead.x < 0 ||
            newHead.x >= GRID_SIZE ||
            newHead.y < 0 ||
            newHead.y >= GRID_SIZE ||
            snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)
        ) {
            setIsGameOver(true);
            soundSystem?.playGameOverSound();
            return;
        }

        const newSnake = [newHead];
        const foodEaten = foodPoints.findIndex(food => food.x === newHead.x && food.y === newHead.y);

        if (foodEaten !== -1) {
            if (foodPoints[foodEaten].isBonus) {
                soundSystem?.playBonusEatSound();
            } else {
                soundSystem?.playRegularEatSound();
            }

            setScore(prev => prev + 1);

            if (foodEaten === 0) {
                const newFood = generateFood(newSnake.concat(snake));
                setFoodPoints(current => [
                    { ...newFood, isBonus: false },
                    ...current.filter(food => food.isBonus)
                ]);
            } else {
                setFoodPoints(current => current.filter(food => !food.isBonus));
                setHasBonusPoint(false);
            }

            newSnake.push(...snake);
        } else {
            newSnake.push(...snake.slice(0, -1));
        }

        setSnake(newSnake);
    }, [snake, direction, foodPoints, isGameOver, isPaused, soundSystem]);

    useEffect(() => {
        const handleKeyPress = (e) => {
            switch (e.key) {
                case 'ArrowUp':
                    if (direction !== 'DOWN') setDirection('UP');
                    break;
                case 'ArrowDown':
                    if (direction !== 'UP') setDirection('DOWN');
                    break;
                case 'ArrowLeft':
                    if (direction !== 'RIGHT') setDirection('LEFT');
                    break;
                case 'ArrowRight':
                    if (direction !== 'LEFT') setDirection('RIGHT');
                    break;
                case ' ':
                    setIsPaused(prev => !prev);
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [direction]);

    useEffect(() => {
        const gameLoop = setInterval(moveSnake, SPEED);
        return () => clearInterval(gameLoop);
    }, [moveSnake]);

    const resetGame = useCallback(() => {
        setSnake(INITIAL_SNAKE);
        setDirection(INITIAL_DIRECTION);
        const initialFood = generateFood(INITIAL_SNAKE);
        setFoodPoints([{ ...initialFood, isBonus: false }]);
        setScore(0);
        setIsGameOver(false);
        setIsPaused(false);
        setHasBonusPoint(false);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800">
            <div className="mb-4 text-3xl font-bold text-pink-600">Score: {score}</div>
            <div className="text-sm text-pink-500 mb-2">Level: {Math.floor(score / 4) + 1}</div>

            <div className="relative bg-gray-900 border-4 border-pink-300 rounded-xl shadow-2xl overflow-hidden"
                style={{ width: GRID_SIZE * CELL_SIZE, height: GRID_SIZE * CELL_SIZE }}>

                <div className="absolute inset-0 grid grid-cols-20 grid-rows-20">
                    {[...Array(400)].map((_, i) => (
                        <div key={i} className="border border-gray-800" />
                    ))}
                </div>

                {foodPoints.map((food, index) => (
                    <FoodDot
                        key={index}
                        x={food.x}
                        y={food.y}
                        isBonus={food.isBonus}
                    />
                ))}

                {snake.map((segment, index) => (
                    <SnakeSegment
                        key={index}
                        index={index}
                        direction={direction}
                        style={{
                            width: CELL_SIZE - 2,
                            height: CELL_SIZE - 2,
                            left: segment.x * CELL_SIZE,
                            top: segment.y * CELL_SIZE,
                            zIndex: 20
                        }}
                    />
                ))}
            </div>

            {isGameOver && (
                <div className="mt-4 text-2xl font-bold text-pink-600 animate-bounce">
                    Game Over!
                </div>
            )}

            <div className="mt-6 space-x-4">
                <button
                    onClick={resetGame}
                    className="px-6 py-3 text-lg font-semibold text-white bg-pink-500 rounded-lg hover:bg-pink-600 transform hover:scale-105 transition-all shadow-lg"
                >
                    {isGameOver ? 'Play Again' : 'Reset Game'}
                </button>
                <button
                    onClick={() => setIsPaused(prev => !prev)}
                    className="px-6 py-3 text-lg font-semibold text-white bg-pink-400 rounded-lg hover:bg-pink-500 transform hover:scale-105 transition-all shadow-lg"
                >
                    {isPaused ? 'Resume' : 'Pause'}
                </button>
            </div>

            <div className="mt-4 text-lg text-pink-600">
                Use arrow keys to move, spacebar to pause
            </div>
        </div>
    );
};

export default SnakeGame;