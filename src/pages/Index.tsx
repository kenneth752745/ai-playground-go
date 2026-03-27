import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold text-foreground tracking-tight">
          Run Files
        </h1>
        <p className="text-muted-foreground text-lg">
          Upload and run your files from your computer
        </p>
      </div>
      <Button
        size="lg"
        className="text-lg px-10 py-6 gap-3"
        onClick={() => navigate("/play-files")}
      >
        <Play className="w-5 h-5" />
        Run Files
      </Button>
    </div>
  );
};

export default Index;
