'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, Camera, Languages, Coins } from 'lucide-react';

const ONBOARDED_KEY = 'voice-translator-onboarded';

export default function Onboarding() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    const hasOnboarded = localStorage.getItem(ONBOARDED_KEY);
    if (!hasOnboarded) {
      setOpen(true);
    }
  }, []);

  const handleGetStarted = () => {
    localStorage.setItem(ONBOARDED_KEY, 'true');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="glass-card border-white/10 bg-[#1a1b1e]/95 text-white max-w-md mx-4 rounded-2xl">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-[#e84a67]/20 flex items-center justify-center mb-4">
            <Languages className="w-8 h-8 text-[#e84a67]" />
          </div>
          <DialogTitle className="text-2xl font-semibold text-white">
            Voice Translator
          </DialogTitle>
          <DialogDescription className="text-[#a0a2aa] text-base">
            Your universal translation assistant
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <h3 className="text-sm font-medium text-[#a0a2aa] uppercase tracking-wider">
            What you can do
          </h3>

          <div className="space-y-3">
            <Feature
              icon={<Mic className="w-5 h-5" />}
              title="Voice Translation"
              description="Speak in any language and hear natural translations"
            />
            <Feature
              icon={<Camera className="w-5 h-5" />}
              title="Visual Recognition"
              description="Point at signs, menus, or text to translate"
            />
            <Feature
              icon={<Coins className="w-5 h-5" />}
              title="Currency Conversion"
              description="See prices and get instant currency conversion"
            />
          </div>
        </div>

        <div className="space-y-3 mt-6 pt-6 border-t border-white/10">
          <h3 className="text-sm font-medium text-[#a0a2aa] uppercase tracking-wider">
            Permissions needed
          </h3>
          <div className="flex gap-4 text-sm text-[#a0a2aa]">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-[#e84a67]" />
              <span>Microphone</span>
            </div>
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#e84a67]" />
              <span>Camera</span>
            </div>
          </div>
        </div>

        <Button
          onClick={handleGetStarted}
          className="w-full mt-6 bg-[#e84a67] hover:bg-[#d63d5a] text-white font-medium py-6 rounded-xl transition-colors"
        >
          Get Started
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-10 h-10 rounded-lg bg-[#25262b] flex items-center justify-center text-[#e84a67] flex-shrink-0">
        {icon}
      </div>
      <div>
        <h4 className="font-medium text-white">{title}</h4>
        <p className="text-sm text-[#a0a2aa]">{description}</p>
      </div>
    </div>
  );
}
