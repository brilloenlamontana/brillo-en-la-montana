import { create } from 'zustand';

// What the player can do right now with whatever is in reach (eat a fruit, talk, pick something up): the same thing
// the E key does. Every prompt on screen announces itself here, so that a touch screen, which has no keyboard, can
// offer it as a button under the thumb (see hud/MobileControls).
type Offer = { id: number; action: string; activate: () => void };

type InteractionState = {
  offers: Offer[];
  offer: (offer: Offer) => void;
  withdraw: (id: number) => void;
};

export const useInteractionStore = create<InteractionState>((set) => ({
  offers: [],
  // The newest prompt goes last: it is the one the button does.
  offer: (offer) => set((state) => ({ offers: [...state.offers.filter((other) => other.id !== offer.id), offer] })),
  withdraw: (id) => set((state) => ({ offers: state.offers.filter((offer) => offer.id !== id) })),
}));

let nextId = 0;
export const newOfferId = () => ++nextId;
