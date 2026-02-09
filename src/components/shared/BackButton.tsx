import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BackButtonProps {
  onClick?: () => void;
}

const BackButton = ({ onClick }: BackButtonProps) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={onClick || (() => navigate(-1))}
      className="p-2 -ml-2 rounded-full hover:bg-accent transition-colors"
      aria-label="Go back"
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
};

export default BackButton;
