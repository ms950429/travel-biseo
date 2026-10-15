export type Trip = {
  id: string;
  name: string;
  isNameCustom: boolean;
  country: 'JP';
  city: string | null;
  startDate: string; // YYYY-MM-DD (local date)
  endDate: string;
  createdAt: string;
};

export type Item = {
  id: string;
  tripId: string;
  templateId: string | null; // null = user-added item
  templateOrder: number | null;
  offsetDays: number | null; // recommended timing (30/14/7/1). null for user-added items
  title: string;
  dueDate: string;
  status: 'todo' | 'done';
  completedAt: string | null;
  memo: string;
  isCustom: boolean;
  isDueEdited: boolean;
  createdAt: string;
};

export type NewTrip = Omit<Trip, 'id' | 'createdAt'>;
export type NewItem = Omit<Item, 'id' | 'createdAt' | 'tripId'>;
export type ItemPatch = Partial<Omit<Item, 'id' | 'tripId' | 'createdAt'>>;
export type TripPatch = Partial<Omit<Trip, 'id' | 'createdAt' | 'country'>>;
export type Settings = { alertsEnabled: boolean };

export type SectionKey = 'late' | 'D-30' | 'D-14' | 'D-7' | 'D-1';
