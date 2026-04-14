import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, Check, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <img src="/pwa-icon-512.png" alt="AI Chat" className="w-24 h-24 mx-auto rounded-2xl shadow-lg" />
        <h1 className="text-2xl font-bold">Zainstaluj AI Chat</h1>
        <p className="text-muted-foreground">
          Dodaj aplikację do ekranu głównego, aby mieć szybki dostęp do asystenta AI — działa offline!
        </p>

        {installed ? (
          <div className="flex flex-col items-center gap-2 text-green-500">
            <Check className="h-12 w-12" />
            <p className="font-medium">Aplikacja zainstalowana!</p>
          </div>
        ) : deferredPrompt ? (
          <Button size="lg" className="w-full" onClick={handleInstall}>
            <Download className="h-5 w-5 mr-2" /> Zainstaluj aplikację
          </Button>
        ) : isIOS ? (
          <div className="space-y-3 text-left bg-muted/30 rounded-lg p-4">
            <p className="font-medium flex items-center gap-2">
              <Smartphone className="h-5 w-5" /> Instrukcja dla iOS:
            </p>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
              <li>Otwórz tę stronę w <strong>Safari</strong></li>
              <li>Kliknij ikonę <strong>Udostępnij</strong> (kwadrat ze strzałką)</li>
              <li>Wybierz <strong>"Dodaj do ekranu początkowego"</strong></li>
              <li>Potwierdź klikając <strong>"Dodaj"</strong></li>
            </ol>
          </div>
        ) : (
          <div className="space-y-3 text-left bg-muted/30 rounded-lg p-4">
            <p className="font-medium flex items-center gap-2">
              <Smartphone className="h-5 w-5" /> Instrukcja:
            </p>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
              <li>Otwórz menu przeglądarki (⋮)</li>
              <li>Wybierz <strong>"Zainstaluj aplikację"</strong> lub <strong>"Dodaj do ekranu głównego"</strong></li>
            </ol>
          </div>
        )}

        <Link to="/">
          <Button variant="ghost" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" /> Powrót do czatu
          </Button>
        </Link>
      </div>
    </div>
  );
}
