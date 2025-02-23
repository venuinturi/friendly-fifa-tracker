
import GameForm from "@/components/GameForm";

const TwoVTwo = () => {
  const handleSubmit = (gameData: any) => {
    const games = JSON.parse(localStorage.getItem("games") || "[]");
    games.push(gameData);
    localStorage.setItem("games", JSON.stringify(games));
  };

  return (
    <div className="container mx-auto pt-24 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Record 2v2 Match</h1>
        <GameForm type="2v2" onSubmit={handleSubmit} />
      </div>
    </div>
  );
};

export default TwoVTwo;
