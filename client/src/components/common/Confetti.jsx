import { useEffect, useState } from 'react';

const colors = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
  '#ffeaa7', '#dda0dd', '#98d8c8', '#f7dc6f',
  '#bb8fce', '#85c1e9', '#f8b500', '#00d4aa',
];

function ConfettiPiece({ style }) {
  return (
    <div
      className="fixed pointer-events-none z-[9999]"
      style={{
        ...style,
        width: '10px',
        height: '10px',
        borderRadius: Math.random() > 0.5 ? '50%' : '0%',
      }}
    />
  );
}

export default function Confetti({ isActive, onComplete }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (!isActive) {
      setPieces([]);
      return;
    }

    const newPieces = [];
    const numPieces = 50;

    for (let i = 0; i < numPieces; i++) {
      const left = Math.random() * 100;
      const animationDuration = 1 + Math.random() * 2;
      const delay = Math.random() * 0.5;

      newPieces.push({
        id: i,
        style: {
          left: `${left}%`,
          top: '-10px',
          backgroundColor: colors[Math.floor(Math.random() * colors.length)],
          animation: `fall ${animationDuration}s ease-out ${delay}s forwards`,
          transform: `rotate(${Math.random() * 360}deg)`,
        },
      });
    }

    setPieces(newPieces);

    // Clear confetti after animation
    const timer = setTimeout(() => {
      setPieces([]);
      onComplete?.();
    }, 3500);

    return () => clearTimeout(timer);
  }, [isActive, onComplete]);

  if (!pieces.length) return null;

  return (
    <>
      <style>
        {`
          @keyframes fall {
            0% {
              transform: translateY(0) rotate(0deg) scale(1);
              opacity: 1;
            }
            100% {
              transform: translateY(100vh) rotate(720deg) scale(0);
              opacity: 0;
            }
          }
        `}
      </style>
      {pieces.map((piece) => (
        <ConfettiPiece key={piece.id} style={piece.style} />
      ))}
    </>
  );
}

// Hook to trigger confetti
export function useConfetti() {
  const [isActive, setIsActive] = useState(false);

  const trigger = () => {
    setIsActive(true);
  };

  const reset = () => {
    setIsActive(false);
  };

  return { isActive, trigger, reset };
}
