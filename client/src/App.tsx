import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import Home from "@/pages/home";
import ChatPage from "@/pages/chat";

function Navigation() {
  const [location] = useLocation();
  
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-2 flex gap-2">
        <Button variant={location === '/' ? 'default' : 'ghost'} asChild>
          <Link href="/">Mesh AI</Link>
        </Button>
        <Button variant={location === '/chat' ? 'default' : 'ghost'} asChild>
          <Link href="/chat">Chat Demo</Link>
        </Button>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/chat" component={ChatPage} />
          <Route path="*">
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">404 - Page Not Found</h1>
                <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
              </div>
            </div>
          </Route>
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
