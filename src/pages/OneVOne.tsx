
import GameForm from "@/components/GameForm";
import { loadGamesFromExcel, saveGamesToExcel } from "@/utils/excelUtils";

const OneVOne = () => {
  const handleSubmit = (gameData: any) => {
    const games = loadGamesFromExcel();
    games.push(gameData);
    saveGamesToExcel(games);
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
