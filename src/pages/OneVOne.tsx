
import GameForm from "@/components/GameForm";

const OneVOne = () => {
  const handleSubmit = (gameData: any) => {
    const games = JSON.parse(localStorage.getItem("games") || "[]");
    games.push(gameData);
    localStorage.setItem("games", JSON.stringify(games));
  };

  return (
    <div className="container mx-auto pt-24 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Record 1v1 Match</h1>
        <GameForm type="1v1" onSubmit={handleSubmit} />
      </div>
    </div>
  );
};

export default OneVOne;
