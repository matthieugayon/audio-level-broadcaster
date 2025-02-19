interface FloatingButtonProps {
  url: string;
  label: string;
}

const FloatingButton: React.FC<FloatingButtonProps> = ({ url, label }) => {
  const openNewPage = () => {
    window.open(url, '_blank');
  };

  return (
    <button
      className="fixed top-8 right-8 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full shadow-lg"
      onClick={openNewPage}
    >
      {label}
    </button>
  );
};

export default FloatingButton;
