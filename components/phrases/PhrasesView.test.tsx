import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhrasesView } from './PhrasesView';
import type { Message } from '@/types';

const mockMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    text: 'I am allergic to nuts.',
    translation: 'Je suis allergique aux noix.',
    pronunciation: 'zhuh swee ah-lair-zheek oh nwah',
    timestamp: '2:30 PM',
    isFavorite: true,
  },
  {
    id: '2',
    role: 'assistant',
    text: 'Where is the bathroom?',
    translation: 'Ou sont les toilettes?',
    timestamp: '2:31 PM',
    isFavorite: true,
  },
  {
    id: '3',
    role: 'assistant',
    text: 'Not saved',
    timestamp: '2:32 PM',
    isFavorite: false,
  },
];

describe('PhrasesView', () => {
  it('shows only favorited messages with translations', () => {
    render(
      <PhrasesView
        messages={mockMessages}
        onToggleFavorite={vi.fn()}
        onPlayAudio={vi.fn()}
        targetLangCode="fr"
      />
    );
    expect(screen.getByText('Je suis allergique aux noix.')).toBeInTheDocument();
    expect(screen.getByText('Ou sont les toilettes?')).toBeInTheDocument();
    expect(screen.queryByText('Not saved')).not.toBeInTheDocument();
  });

  it('plays audio on tap', () => {
    const onPlayAudio = vi.fn();
    render(
      <PhrasesView
        messages={mockMessages}
        onToggleFavorite={vi.fn()}
        onPlayAudio={onPlayAudio}
        targetLangCode="fr"
      />
    );
    const playButtons = screen.getAllByLabelText('Play phrase');
    fireEvent.click(playButtons[0]);
    expect(onPlayAudio).toHaveBeenCalledWith('Je suis allergique aux noix.', 'fr');
  });

  it('shows empty state when no phrases saved', () => {
    render(
      <PhrasesView
        messages={[]}
        onToggleFavorite={vi.fn()}
        onPlayAudio={vi.fn()}
        targetLangCode="fr"
      />
    );
    expect(screen.getByText(/no saved phrases/i)).toBeInTheDocument();
  });

  it('has remove button for each phrase', () => {
    const onToggleFavorite = vi.fn();
    render(
      <PhrasesView
        messages={mockMessages}
        onToggleFavorite={onToggleFavorite}
        onPlayAudio={vi.fn()}
        targetLangCode="fr"
      />
    );
    const removeButtons = screen.getAllByLabelText('Remove phrase');
    fireEvent.click(removeButtons[0]);
    expect(onToggleFavorite).toHaveBeenCalledWith('1');
  });

  it('shows pronunciation when available', () => {
    render(
      <PhrasesView
        messages={mockMessages}
        onToggleFavorite={vi.fn()}
        onPlayAudio={vi.fn()}
        targetLangCode="fr"
      />
    );
    expect(screen.getByText('zhuh swee ah-lair-zheek oh nwah')).toBeInTheDocument();
  });
});
