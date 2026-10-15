import type { Item, ItemPatch, NewItem, NewTrip, Settings, Trip, TripPatch } from '../types';

export interface Repo {
  listTrips(): Promise<Trip[]>;
  listItems(): Promise<Item[]>;
  /** 체크리스트까지 만들어졌을 때만 여행을 저장한다. 실패하면 아무것도 남기지 않는다. */
  createTrip(trip: NewTrip, items: NewItem[]): Promise<{ trip: Trip; items: Item[] }>;
  updateTrip(id: string, patch: TripPatch, itemPatches?: { id: string; patch: ItemPatch }[]): Promise<void>;
  deleteTrip(id: string): Promise<void>;
  addItem(tripId: string, item: NewItem): Promise<Item>;
  updateItem(id: string, patch: ItemPatch): Promise<void>;
  deleteItem(id: string): Promise<void>;
  getSettings(): Promise<Settings>;
  setSettings(s: Settings): Promise<void>;
  track(name: string, props?: Record<string, unknown>): Promise<void>;
}
