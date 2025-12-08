import { useEffect, useState } from 'react';
import { PartyPopper, Star, Sparkles } from 'lucide-react';
import useCelebrationStore from '../../stores/celebrationStore';

const confettiColors = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
  '#ffeaa7', '#dda0dd', '#98d8c8', '#f7dc6f',
  '#bb8fce', '#85c1e9', '#f8b500', '#00d4aa',
];

export default function CelebrationOverlay() {
  const { showConfetti, message, hideCelebration } = useCelebrationStore();
  const [confetti, setConfetti] = useState([]);

  useEffect(() => {
    if (showConfetti) {
      // Generate confetti pieces
      const pieces = [];
      for (let i = 0; i < 60; i++) {
        pieces.push({
          id: i,
          left: Math.random() * 100,
          delay: Math.random() * 0.5,
          duration: 2 + Math.random() * 2,
          color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
          rotation: Math.random() * 360,
          size: 8 + Math.random() * 8,
          shape: Math.random() > 0.5 ? 'circle' : 'square',
        });
      }
      setConfetti(pieces);
    } else {
      setConfetti([]);
    }
  }, [showConfetti]);

  if (!showConfetti) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      {/* Confetti */}
      {confetti.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-fall"
          style={{
            left: `${piece.left}%`,
            top: '-20px',
            width: piece.size,
            height: piece.size,
            backgroundColor: piece.color,
            borderRadius: piece.shape === 'circle' ? '50%' : '2px',
            transform: `rotate(${piece.rotation}deg)`,
            animation: `confettiFall ${piece.duration}s ease-out ${piece.delay}s forwards`,
          }}
        />
      ))}

      {/* Success Message */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="animate-bounce-in bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-6 rounded-2xl shadow-2xl flex items-center gap-4">
          <div className="relative">
            <PartyPopper className="w-10 h-10 animate-pulse" />
            <Sparkles className="w-5 h-5 absolute -top-1 -right-1 text-yellow-300" />
          </div>
          <div>
            <h3 className="text-2xl font-bold">{message}</h3>
            <p className="text-green-100 text-sm">Great job! Keep it up!</p>
          </div>
          <Star className="w-8 h-8 text-yellow-300 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg) scale(0.3);
            opacity: 0;
          }
        }

        @keyframes bounceIn {
          0% {
            transform: scale(0) rotate(-10deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.1) rotate(5deg);
          }
          70% {
            transform: scale(0.95) rotate(-2deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }

        .animate-bounce-in {
          animation: bounceIn 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
